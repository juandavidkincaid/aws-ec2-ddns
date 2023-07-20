import boxen from 'boxen';
import axios from 'axios';
import {
  Change,
  ChangeAction,
  RRType,
  Route53
} from '@aws-sdk/client-route-53';
import { fromIni } from '@aws-sdk/credential-providers';
import { ZodError, z } from 'zod';
import { fromZodError } from 'zod-validation-error';

type UpdateDnsTargetConfig = z.infer<typeof UpdateDnsTargetConfigSchema>;

const UpdateDnsTargetConfigSchema = z.object({
  dryRun: z.boolean().optional(),
  ttl: z.number().min(1),
  profile: z.string().min(1).optional(),
  hostedZoneId: z.string().min(1),
  recordName: z.string().min(1).array()
});

const validateIPv4Address = (ipAddress: string) => {
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return ipv4Regex.test(ipAddress);
};

const validateConfig = (config: unknown): config is UpdateDnsTargetConfig => {
  try {
    UpdateDnsTargetConfigSchema.parse(config);
    return true;
  } catch (e) {
    if (e instanceof ZodError) {
      console.log(fromZodError(e));
      return false;
    }
    throw e;
  }
};

const updateDnsTarget = async (
  config: UpdateDnsTargetConfig
): Promise<void> => {
  console.log(
    boxen(
      config.dryRun
        ? 'Dry run: Creating target DNS records'
        : 'Creating target DNS records',
      {
        padding: 1,
        borderStyle: 'double'
      }
    )
  );

  if (!validateConfig(config)) {
    return;
  }

  const route53 = new Route53({
    credentials: config.profile
      ? fromIni({ profile: config.profile })
      : undefined,
    region: 'us-east-1'
  });

  const ipAddressResponse = await axios.get<string>(
    'http://checkip.amazonaws.com/'
  );

  const newIpAddress = ipAddressResponse.data.trim();

  if (!validateIPv4Address(newIpAddress)) {
    throw new Error(`Malformed ip address, skipping => ${newIpAddress}`);
  }

  const currentRecords = await route53.listResourceRecordSets({
    HostedZoneId: config.hostedZoneId
  });

  const ipRecords = config.recordName.map((_recordName) => {
    const route53Record = currentRecords.ResourceRecordSets?.find(
      (record) => record.Name === _recordName && record.Type === RRType.A
    );

    const recordIpAddress = route53Record?.ResourceRecords?.[0].Value;

    return {
      recordName: _recordName,
      recordIpAddress,
      route53Record
    };
  });

  const changeBatch: Change[] = [];

  for (const ipRecord of ipRecords) {
    if (ipRecord.recordIpAddress === newIpAddress) {
      console.log(
        `[${ipRecord.recordName}]: Ip has not changed, skipping change`
      );
      continue;
    }

    console.log(
      `Adding change batch: Ip from ${ipRecord.recordIpAddress} to ${newIpAddress} with ttl ${config.ttl}`
    );

    changeBatch.push({
      Action: ChangeAction.UPSERT,
      ResourceRecordSet: {
        Type: RRType.A,
        Name: ipRecord.recordName,
        ResourceRecords: [{ Value: newIpAddress }],
        TTL: config.ttl
      }
    });
  }

  if (config.dryRun) {
    console.log('Skip on dry run');
    return;
  }

  if (changeBatch.length === 0) {
    console.log('No records to update, exiting');
    return;
  }

  await route53.changeResourceRecordSets({
    HostedZoneId: config.hostedZoneId,
    ChangeBatch: {
      Comment: 'Update from aws-ec2-ddns',
      Changes: changeBatch
    }
  });

  console.log('Updated records');
};

export {
  type UpdateDnsTargetConfig,
  UpdateDnsTargetConfigSchema,
  validateConfig,
  updateDnsTarget
};
