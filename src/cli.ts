import { Command } from 'commander';

import { updateCommand } from './commands/update.ts';
import { registerCommand } from './commands/register.ts';
import { uninstallCommand } from './commands/uninstall.ts';

const program = new Command('aws-ec2-ddns')
  .description('Dynamic DNS tool for AWS EC2 instances')
  .version('1.0.0');

program.addCommand(updateCommand);
program.addCommand(registerCommand);
program.addCommand(uninstallCommand);

program.parseAsync();
