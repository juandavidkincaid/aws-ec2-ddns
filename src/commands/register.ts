import child_process from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

import { Command } from 'commander';
import boxen from 'boxen';

import { validateConfig } from '../update-dns-target.ts';

import {
  SERVICE_NAME,
  CONFIG_DIR,
  SERVICES_DIR,
  SYSTEMD_SERVICE_PATH,
  SERVICE_TEMPLATE
} from './consts.ts';
import { parseTarget, parseTtl } from './parsers.ts';

const generateInstallationConfigFileName = () =>
  `${Date.now()}-${Math.floor(Math.random() * 1e9).toString(16)}.json`;

const detectCommand = (configPath: string): string => {
  const isCompiledBinary = !process.argv[1]?.endsWith('.ts');

  if (isCompiledBinary) {
    return `${process.execPath} update --config ${configPath}`;
  }

  const rootDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../..'
  );

  return [
    process.execPath,
    path.join(rootDir, 'node_modules', '.bin', 'tsx'),
    path.join(rootDir, 'src', 'cli.ts'),
    'update',
    `--config ${configPath}`
  ].join(' ');
};

const registerService = async (options: {
  dryRun?: boolean;
  ttl: number;
  profile?: string;
  target: string[];
}): Promise<void> => {
  const targets = options.target.map(parseTarget);

  const config = {
    dryRun: options.dryRun,
    ttl: options.ttl,
    profile: options.profile,
    targets
  };

  console.log(
    boxen(
      config.dryRun
        ? 'Dry run: Registering service for ddns'
        : 'Registering service for ddns',
      {
        padding: 1,
        borderStyle: 'double'
      }
    )
  );

  if (!validateConfig({ ...config, dryRun: false })) {
    return;
  }

  const installationConfigFilePath = path.join(
    CONFIG_DIR,
    generateInstallationConfigFileName()
  );

  const command = detectCommand(installationConfigFilePath);

  const finalInstallationConfigFileContent = JSON.stringify(
    { ...config, dryRun: false },
    null,
    2
  );

  console.log('Config File Content');
  console.log(finalInstallationConfigFileContent);

  const finalServiceFileContent = SERVICE_TEMPLATE.replace(
    '$$command$$',
    command
  );

  console.log('Service File Content');
  console.log(finalServiceFileContent);

  if (config.dryRun) {
    console.log('Skip on dry run');
    return;
  }

  await fs.promises.mkdir(CONFIG_DIR, { recursive: true });
  await fs.promises.mkdir(SERVICES_DIR, { recursive: true });

  await fs.promises.writeFile(
    installationConfigFilePath,
    finalInstallationConfigFileContent
  );

  const serviceFilePath = path.join(SERVICES_DIR, `${SERVICE_NAME}.service`);
  await fs.promises.writeFile(serviceFilePath, finalServiceFileContent);

  try {
    await fs.promises.unlink(SYSTEMD_SERVICE_PATH);
  } catch {
    // Link may not exist yet
  }
  await fs.promises.symlink(serviceFilePath, SYSTEMD_SERVICE_PATH);

  child_process.execSync('systemctl daemon-reload', { stdio: 'inherit' });
  child_process.execSync(`systemctl enable ${SERVICE_NAME}`, {
    stdio: 'inherit'
  });
  child_process.execSync(`systemctl start ${SERVICE_NAME}`, {
    stdio: 'inherit'
  });
};

export const registerCommand = new Command('register')
  .description('Register as a systemd service')
  .option('-d, --dry-run', 'Dry run')
  .option('--ttl <ttl>', 'TTL for created records', parseTtl, 60)
  .option('-p, --profile <profile>', 'AWS profile to use')
  .requiredOption(
    '-t, --target <zone:domain...>',
    'Target as hostedZoneId:domainName (repeatable)'
  )
  .action(registerService);
