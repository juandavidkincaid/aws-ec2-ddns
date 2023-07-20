/**
 * Usage:
 * Usage: yarn script scripts/install-service.ts [options]
 *
 * Options:
 *   -d, --dry-run                          Dry run
 *   -t, --ttl <ttl>                        TTL for created records (default: 60)
 *   -p, --profile <profile>                AWS profile to use
 *   -z, --hosted-zone-id <hosted-zone-id>  AWS Route 53 Hosted Zone Id
 *   -n, --record-name <record-name...>     Target domain record names to create records for
 *   -h, --help                             display help for command
 */

import child_process from 'child_process';
import path from 'path';
import fs from 'fs';

import { Command } from 'commander';
import boxen from 'boxen';
import { packageDirectory } from 'pkg-dir';

import {
  UpdateDnsTargetConfig,
  validateConfig
} from '../src/update-dns-target.ts';

const generateInstallationConfigFileName = () =>
  `${Date.now()}-${Math.floor(Math.random() * 1e9).toString(16)}.json`;

const installService = async (
  options: UpdateDnsTargetConfig
): Promise<void> => {
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

  if (!validateConfig({ ...options, dryRun: false })) {
    return;
  }

  const serviceName = 'aws-ec2-ddns';
  const rootDir = await packageDirectory();

  if (!rootDir) {
    throw new Error('Unable to find package root for content files');
  }

  const serviceFileContent = await fs.promises.readFile(
    path.join(rootDir, 'services', 'aws-ec2-ddns.service'),
    { encoding: 'utf-8' }
  );

  const installationConfigFilePath = path.join(
    rootDir,
    '.installations',
    generateInstallationConfigFileName()
  );

  const command = [
    process.execPath,
    '--loader ts-node/esm --inspect',
    path.join(rootDir, 'scripts', 'update-dns-target-with-config.ts'),
    `-c ${installationConfigFilePath}`
  ].join(' ');

  const finalInstallationConfigFileContent = JSON.stringify(
    { ...options, dryRun: false },
    null,
    2
  );

  console.log('Config File Content');
  console.log(finalInstallationConfigFileContent);

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
    installationConfigFilePath,
    finalInstallationConfigFileContent
  );

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
  '-n, --record-name <record-name...>',
  'Target domain record names to create records for'
);

program.action(installService);

program.parseAsync();
