/**
 * Usage: yarn script scripts/update-dns-target.ts[options]
 *
 * Options:
 *   -d, --dry-run                          Dry run
 *   -t, --ttl <ttl>                        TTL for created records (default: 60)
 *   -p, --profile <profile>                AWS profile to use
 *   -z, --hosted-zone-id <hosted-zone-id>  AWS Route 53 Hosted Zone Id
 *   -n, --record-name <record-name...>     Target domain record names to create records for
 *   -h, --help                             display help for command
 */

import { Command } from 'commander';
import boxen from 'boxen';
import axios from 'axios';
import {
  Change,
  ChangeAction,
  RRType,
  Route53
} from '@aws-sdk/client-route-53';
import { fromIni } from '@aws-sdk/credential-providers';

const validateIPv4Address = (ipAddress: string) => {
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return ipv4Regex.test(ipAddress);
};

const updateDnsTarget = async (options: {
  dryRun: boolean;
  ttl: number;
  profile: string | undefined;
  hostedZoneId: string;
  recordName: string[];
}): Promise<void> => {
  console.log(
    boxen(
      options.dryRun
        ? 'Dry run: Creating target DNS records'
        : 'Creating target DNS records',
      {
        padding: 1,
        borderStyle: 'double'
      }
    )
  );

  const route53 = new Route53({
    credentials: options.profile
      ? fromIni({ profile: options.profile })
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
    HostedZoneId: options.hostedZoneId
  });

  const ipRecords = options.recordName.map((_recordName) => {
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
      `Adding change batch: Ip from ${ipRecord.recordIpAddress} to ${newIpAddress} with ttl ${options.ttl}`
    );

    changeBatch.push({
      Action: ChangeAction.UPSERT,
      ResourceRecordSet: {
        Type: RRType.A,
        Name: ipRecord.recordName,
        ResourceRecords: [{ Value: newIpAddress }],
        TTL: options.ttl
      }
    });
  }

  if (options.dryRun) {
    console.log('Skip on dry run');
    return;
  }

  await route53.changeResourceRecordSets({
    HostedZoneId: options.hostedZoneId,
    ChangeBatch: {
      Comment: 'Update from aws-ec2-ddns',
      Changes: changeBatch
    }
  });

  console.log('Updated records');
};

const program = new Command();
program.option('-d, --dry-run', 'Dry run');
program.option(
  '-t, --ttl <ttl>',
  'TTL for created records',
  (value) => {
    const number = parseInt(value);
    if (isNaN(number)) {
      throw new Error(`Not valid number: ttl: ${value}`);
    }
    return number;
  },
  60
);
program.option('-p, --profile <profile>', 'AWS profile to use');
program.requiredOption(
  '-z, --hosted-zone-id <hosted-zone-id>',
  'AWS Route 53 Hosted Zone Id'
);
program.requiredOption(
  '-n, --record-name <record-name...>',
  'Target domain record names to create records for'
);

program.action(updateDnsTarget);

program.parseAsync();
