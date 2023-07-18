/**
 * Usage:
 * Usage: yarn script scripts/udpate-dns-target.ts [options]
 *
 * Options:
 *   -d, --dry-run                          Dry run
 *   -t, --ttl <ttl>                        TTL for created records (default: 60)
 *   -p, --profile <profile>                AWS profile to use
 *   -z, --hosted-zone-id <hosted-zone-id>  AWS Route 53 Hosted Zone Id
 *   -n, --record-name <record-name>        Target domain record to create records for
 *   -h, --help                             display help for command
 */

import { Command } from 'commander';
import boxen from 'boxen';
import axios from 'axios';
import { ChangeAction, RRType, Route53 } from '@aws-sdk/client-route-53';
import { fromIni } from '@aws-sdk/credential-providers';

const validateIPv4Address = (ipAddress: string) => {
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return ipv4Regex.test(ipAddress);
};

const updateDnsTarget = async (options: {
  dryRun: boolean;
  ttl: number;
  profile: string;
  hostedZoneId: string;
  recordName: string;
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
    credentials: fromIni({ profile: options.profile }),
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

  const ipRecord = currentRecords.ResourceRecordSets?.find(
    (record) => record.Name === options.recordName && record.Type === 'A'
  );

  const oldIpAddress = ipRecord?.ResourceRecords?.[0].Value;

  if (oldIpAddress === newIpAddress) {
    console.log('Ip has not changed, skipping change');
    return;
  }

  console.log(
    `Updating Ip from ${oldIpAddress} to ${newIpAddress} with ttl ${options.ttl}`
  );

  if (options.dryRun) {
    console.log('Skip on dry run');
    return;
  }

  await route53.changeResourceRecordSets({
    HostedZoneId: options.hostedZoneId,
    ChangeBatch: {
      Comment: 'Update from aws-ec2-ddns',
      Changes: [
        {
          Action: ChangeAction.UPSERT,
          ResourceRecordSet: {
            Type: RRType.A,
            Name: options.recordName,
            ResourceRecords: [{ Value: newIpAddress }],
            TTL: options.ttl
          }
        }
      ]
    }
  });
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
  '-n, --record-name <record-name>',
  'Target domain record to create records for'
);

program.action(updateDnsTarget);

program.parseAsync();
