import child_process from 'node:child_process';
import fs from 'node:fs';

import { Command } from 'commander';
import boxen from 'boxen';

import { SERVICE_NAME, CONFIG_DIR, SYSTEMD_SERVICE_PATH } from './consts.ts';

const getServiceStatus = (): string => {
  try {
    return child_process
      .execSync(`systemctl is-active ${SERVICE_NAME}`, { encoding: 'utf-8' })
      .trim();
  } catch {
    return 'inactive';
  }
};

const getServiceEnabled = (): string => {
  try {
    return child_process
      .execSync(`systemctl is-enabled ${SERVICE_NAME}`, { encoding: 'utf-8' })
      .trim();
  } catch {
    return 'not found';
  }
};

const loadConfig = async (): Promise<string | null> => {
  try {
    const files = await fs.promises.readdir(CONFIG_DIR);
    const configFile = files.find((f) => f.endsWith('.json'));
    if (!configFile) return null;

    const configPath = `${CONFIG_DIR}/${configFile}`;
    return await fs.promises.readFile(configPath, { encoding: 'utf-8' });
  } catch {
    return null;
  }
};

const statusAction = async () => {
  console.log(
    boxen('aws-ec2-ddns status', { padding: 1, borderStyle: 'double' })
  );

  const serviceExists = fs.existsSync(SYSTEMD_SERVICE_PATH);
  const status = getServiceStatus();
  const enabled = getServiceEnabled();

  console.log('Service:');
  console.log(
    `  Unit file: ${serviceExists ? SYSTEMD_SERVICE_PATH : 'not found'}`
  );
  console.log(`  Status:    ${status}`);
  console.log(`  Enabled:   ${enabled}`);

  const configContent = await loadConfig();

  console.log('\nConfiguration:');
  if (configContent) {
    const config = JSON.parse(configContent);
    console.log(`  TTL:     ${config.ttl}`);
    console.log(`  Profile: ${config.profile ?? 'default'}`);
    console.log('  Targets:');
    for (const target of config.targets ?? []) {
      console.log(`    - ${target.hostedZoneId}:${target.recordName}`);
    }
  } else {
    console.log('  No configuration found');
  }
};

export const statusCommand = new Command('status')
  .description('Show service status and current configuration')
  .action(statusAction);
