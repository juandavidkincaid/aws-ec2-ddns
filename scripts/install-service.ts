/**
 * Usage:
 * Usage: yarn script scripts/install-service.ts [options]
 *
 * Options:
 *   -d, --dry-run                          Dry run
 *   -t, --ttl <ttl>                        TTL for created records (default: 60)
 *   -p, --profile <profile>                AWS profile to use
 *   -z, --hosted-zone-id <hosted-zone-id>  AWS Route 53 Hosted Zone Id
 *   -n, --record-name <record-name>        Target domain record to create records for
 *   -h, --help                             display help for command
 */

import child_process from 'child_process';
import path from 'path';
import fs from 'fs';

import { Command } from 'commander';
import boxen from 'boxen';
import { packageDirectory } from 'pkg-dir';

const installService = async (options: {
  dryRun: boolean;
  ttl: number;
  profile: string;
  hostedZoneId: string;
  recordName: string;
}): Promise<void> => {
  console.log(
    boxen(
      options.dryRun
        ? 'Dry run: Creating service for ddns'
        : 'Creating service for ddns',
      {
        padding: 1,
        borderStyle: 'double'
      }
    )
  );

  const serviceName = 'aws-ec2-ddns';
  const rootDir = await packageDirectory();

  if (!rootDir) {
    throw new Error('Unable to find package root for content files');
  }

  const serviceFileContent = await fs.promises.readFile(
    path.join(rootDir, 'services', 'aws-ec2-ddns.service'),
    { encoding: 'utf-8' }
  );

  const command = [
    process.execPath,
    '--loader ts-node/esm --inspect',
    path.join(rootDir, 'scripts', 'update-dns-target.ts'),
    `-t ${options.ttl}`,
    `-p ${options.profile}`,
    `-z ${options.hostedZoneId}`,
    `-n ${options.recordName}`
  ].join(' ');

  const finalServiceFileContent = serviceFileContent
    .replace('$$command$$', command)
    .replace('$$cwd$$', rootDir);

  console.log('Service File Content');
  console.log(finalServiceFileContent);

  if (options.dryRun) {
    console.log('Skip on dry run');
    return;
  }

  await fs.promises.writeFile(
    `/etc/systemd/system/${serviceName}.service`,
    finalServiceFileContent
  );

  child_process.execSync('systemctl daemon-reload');
  child_process.execSync(`systemctl enable ${serviceName}`);
  child_process.execSync(`systemctl start ${serviceName}`);
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

program.action(installService);

program.parseAsync();
