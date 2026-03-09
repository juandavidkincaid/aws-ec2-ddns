import boxen from 'boxen';
import {
  type Change,
  ChangeAction,
  ChangeResourceRecordSetsCommand,
  ListResourceRecordSetsCommand,
  RRType,
  Route53Client
} from '@aws-sdk/client-route-53';
import { fromIni } from '@aws-sdk/credential-providers';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

export const UpdateDnsTargetConfigSchema = z.object({
  dryRun: z.boolean().optional(),
  ttl: z.number().min(1),
  profile: z.string().min(1).optional(),
  targets: z
    .object({
      hostedZoneId: z.string().min(1),
      recordName: z
        .string()
        .min(1)
        .transform((v) => (v.endsWith('.') ? v : `${v}.`))
    })
    .array()
    .min(1)
});

export type IUpdateDnsTargetConfig = z.infer<
  typeof UpdateDnsTargetConfigSchema
>;

const validateIPv4Address = (ipAddress: string) => {
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return ipv4Regex.test(ipAddress);
};

export const validateConfig = (
  config: unknown
): config is IUpdateDnsTargetConfig => {
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

export const updateDnsTarget = async (
  config: IUpdateDnsTargetConfig
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

  const route53 = new Route53Client({
    credentials: config.profile
      ? fromIni({ profile: config.profile })
      : undefined,
    region: 'us-east-1'
  });

  const ipAddressResponse = await fetch('http://checkip.amazonaws.com/');
  const newIpAddress = (await ipAddressResponse.text()).trim();

  if (!validateIPv4Address(newIpAddress)) {
    throw new Error(`Malformed ip address, skipping => ${newIpAddress}`);
  }

  // Group targets by hosted zone
  const zoneMap = new Map<string, string[]>();
  for (const target of config.targets) {
    const existing = zoneMap.get(target.hostedZoneId) ?? [];
    existing.push(target.recordName);
    zoneMap.set(target.hostedZoneId, existing);
  }

  for (const [hostedZoneId, recordNames] of zoneMap) {
    console.log(`\nProcessing zone: ${hostedZoneId}`);

    const currentRecords = await route53.send(
      new ListResourceRecordSetsCommand({ HostedZoneId: hostedZoneId })
    );

    const changeBatch: Change[] = [];

    for (const recordName of recordNames) {
      const route53Record = currentRecords.ResourceRecordSets?.find(
        (record) => record.Name === recordName && record.Type === RRType.A
      );

      const recordIpAddress = route53Record?.ResourceRecords?.[0].Value;

      if (recordIpAddress === newIpAddress) {
        console.log(`[${recordName}]: Ip has not changed, skipping change`);
        continue;
      }

      console.log(
        `[${recordName}]: Adding change batch: Ip from ${recordIpAddress} to ${newIpAddress} with ttl ${config.ttl}`
      );

      changeBatch.push({
        Action: ChangeAction.UPSERT,
        ResourceRecordSet: {
          Type: RRType.A,
          Name: recordName,
          ResourceRecords: [{ Value: newIpAddress }],
          TTL: config.ttl
        }
      });
    }

    if (config.dryRun) {
      console.log('Skip on dry run');
      continue;
    }

    if (changeBatch.length === 0) {
      console.log('No records to update for this zone');
      continue;
    }

    await route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Comment: 'Update from aws-ec2-ddns',
          Changes: changeBatch
        }
      })
    );

    console.log(`Updated records for zone: ${hostedZoneId}`);
  }
};
