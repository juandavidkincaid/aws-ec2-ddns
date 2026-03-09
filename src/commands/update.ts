import fs from 'node:fs';

import { Command } from 'commander';

import {
  UpdateDnsTargetConfigSchema,
  updateDnsTarget
} from '../update-dns-target.ts';

import { parseTarget, parseTtl } from './parsers.ts';

const updateAction = async (options: {
  config?: string;
  dryRun?: boolean;
  ttl: number;
  profile?: string;
  target?: string[];
}) => {
  if (options.config) {
    const encodedData = await fs.promises.readFile(options.config, {
      encoding: 'utf-8'
    });

    const data = UpdateDnsTargetConfigSchema.parse(JSON.parse(encodedData));
    await updateDnsTarget(data);
    return;
  }

  if (!options.target || options.target.length === 0) {
    console.error('Error: --target is required when --config is not provided');
    process.exit(1);
  }

  await updateDnsTarget({
    dryRun: options.dryRun,
    ttl: options.ttl,
    profile: options.profile,
    targets: options.target.map(parseTarget)
  });
};

export const updateCommand = new Command('update')
  .description('Update DNS target records with the current public IP')
  .option('-d, --dry-run', 'Dry run')
  .option('--ttl <ttl>', 'TTL for created records', parseTtl, 60)
  .option('-p, --profile <profile>', 'AWS profile to use')
  .option(
    '-t, --target <zone:domain...>',
    'Target as hostedZoneId:domainName (repeatable)'
  )
  .option('-c, --config <config-file>', 'JSON config file')
  .action(updateAction);
