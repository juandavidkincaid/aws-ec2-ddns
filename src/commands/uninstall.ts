import child_process from 'node:child_process';
import fs from 'node:fs';

import { Command } from 'commander';
import boxen from 'boxen';

import {
  SERVICE_NAME,
  OPT_DIR,
  SYMLINK_PATH,
  SYSTEMD_SERVICE_PATH
} from './consts.ts';

const tryUnlink = async (filePath: string) => {
  try {
    await fs.promises.unlink(filePath);
    console.log(`Removed: ${filePath}`);
  } catch {
    console.log(`Not found: ${filePath}`);
  }
};

const uninstallService = async (options: { dryRun?: boolean }) => {
  console.log(
    boxen(
      options.dryRun
        ? 'Dry run: Uninstalling aws-ec2-ddns'
        : 'Uninstalling aws-ec2-ddns',
      {
        padding: 1,
        borderStyle: 'double'
      }
    )
  );

  console.log('Will remove:');
  console.log(`  Service:  ${SYSTEMD_SERVICE_PATH}`);
  console.log(`  Symlink:  ${SYMLINK_PATH}`);
  console.log(`  Data dir: ${OPT_DIR}/`);

  if (options.dryRun) {
    console.log('\nSkip on dry run');
    return;
  }

  child_process.execSync(`systemctl stop ${SERVICE_NAME}`, {
    stdio: 'inherit'
  });
  child_process.execSync(`systemctl disable ${SERVICE_NAME}`, {
    stdio: 'inherit'
  });

  await tryUnlink(SYSTEMD_SERVICE_PATH);

  child_process.execSync('systemctl daemon-reload', { stdio: 'inherit' });

  // Remove binary symlink
  await tryUnlink(SYMLINK_PATH);

  // Remove /opt/aws-ec2-ddns
  try {
    await fs.promises.rm(OPT_DIR, { recursive: true });
    console.log(`Removed: ${OPT_DIR}/`);
  } catch {
    console.log(`Not found: ${OPT_DIR}/`);
  }

  console.log('\naws-ec2-ddns uninstalled successfully');
};

export const uninstallCommand = new Command('uninstall')
  .description('Uninstall systemd service and remove all files')
  .option('-d, --dry-run', 'Dry run')
  .action(uninstallService);
