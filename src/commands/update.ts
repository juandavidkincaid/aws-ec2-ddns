import fs from 'node:fs';

import { Command } from 'commander';

import {
  UpdateDnsTargetConfigSchema,
  updateDnsTarget
} from '../update-dns-target.ts';

const parseTtl = (value: string) => {
  const number = parseInt(value, 10);
  if (isNaN(number)) {
    throw new Error(`Not valid number: ttl: ${value}`);
  }
  return number;
};

const updateAction = async (options: {
  config?: string;
  dryRun?: boolean;
  ttl: number;
  profile?: string;
  hostedZoneId?: string;
  recordName?: string[];
}) => {
  if (options.config) {
    const encodedData = await fs.promises.readFile(options.config, {
      encoding: 'utf-8'
    });

    const data = UpdateDnsTargetConfigSchema.parse(JSON.parse(encodedData));
    await updateDnsTarget(data);
    return;
  }

  if (!options.hostedZoneId) {
    console.error(
      'Error: --hosted-zone-id is required when --config is not provided'
    );
    process.exit(1);
  }

  if (!options.recordName) {
    console.error(
      'Error: --record-name is required when --config is not provided'
    );
    process.exit(1);
  }

  await updateDnsTarget({
    dryRun: options.dryRun,
    ttl: options.ttl,
    profile: options.profile,
    hostedZoneId: options.hostedZoneId,
    recordName: options.recordName
  });
};

export const updateCommand = new Command('update')
  .description('Update DNS target records with the current public IP')
  .option('-d, --dry-run', 'Dry run')
  .option('-t, --ttl <ttl>', 'TTL for created records', parseTtl, 60)
  .option('-p, --profile <profile>', 'AWS profile to use')
  .option(
    '-z, --hosted-zone-id <hosted-zone-id>',
    'AWS Route 53 Hosted Zone Id'
  )
  .option(
    '-n, --record-name <record-name...>',
    'Target domain record names to create records for'
  )
  .option('-c, --config <config-file>', 'JSON config file')
  .action(updateAction);
