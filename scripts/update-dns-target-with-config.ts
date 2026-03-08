/**
 * Usage: pnpm script scripts/update-dns-target-with-config.ts [options]
 *
 * Options:
 *   -d, --dry-run                              Dry run
 *   -c, --json-config-file <json-config-file>  Specify json config file
 *   -h, --help                                 display help for command
 */

import fs from 'node:fs';

import { Command } from 'commander';

import {
  UpdateDnsTargetConfigSchema,
  updateDnsTarget
} from '../src/update-dns-target.ts';

const updateDnsTargetWithConfig = async (options: {
  jsonConfigFile: string;
}): Promise<void> => {
  const encodedData = await fs.promises.readFile(options.jsonConfigFile, {
    encoding: 'utf-8'
  });

  const data = UpdateDnsTargetConfigSchema.parse(JSON.parse(encodedData));

  await updateDnsTarget(data);
};

const program = new Command();
program.option('-d, --dry-run', 'Dry run');
program.requiredOption(
  '-c, --json-config-file <json-config-file>',
  'Specify json config file'
);

program.action(updateDnsTargetWithConfig);

program.parseAsync();
