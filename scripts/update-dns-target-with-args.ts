/**
 * Usage: pnpm script scripts/update-dns-target-with-args.ts [options]
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

import {
  type IUpdateDnsTargetConfig,
  updateDnsTarget
} from '../src/update-dns-target.ts';

const updateDnsTargetWithArgs = async (
  options: IUpdateDnsTargetConfig
): Promise<void> => {
  await updateDnsTarget(options);
};

const program = new Command();
program.option('-d, --dry-run', 'Dry run');
program.option(
  '-t, --ttl <ttl>',
  'TTL for created records',
  (value: string) => {
    const number = parseInt(value, 10);
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

program.action(updateDnsTargetWithArgs);

program.parseAsync();
