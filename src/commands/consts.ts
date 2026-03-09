import path from 'node:path';

export const SERVICE_NAME = 'aws-ec2-ddns';
export const OPT_DIR = '/opt/aws-ec2-ddns';
export const BIN_DIR = path.join(OPT_DIR, 'bin');
export const CONFIG_DIR = path.join(OPT_DIR, 'config');
export const SERVICES_DIR = path.join(OPT_DIR, 'services');
export const SYMLINK_PATH = `/usr/local/bin/${SERVICE_NAME}`;
export const SYSTEMD_SERVICE_PATH = `/etc/systemd/system/${SERVICE_NAME}.service`;

export const SERVICE_TEMPLATE = `[Unit]
Description=AWS EC2 Dynamic DNS Resolver
Wants=network.target
After=network.target

[Service]
Type=oneshot
ExecStart=$$command$$

[Install]
WantedBy=default.target
`;
