# aws-ec2-ddns

Dynamic DNS (DDNS) tool for AWS EC2 instances. Fetches the instance's current public IP, compares it against existing Route 53 A record(s), and upserts only when the IP has changed.

## Quick Install

```bash
curl -fsSL https://aws-ec2-ddns.juandavidkincaid.me/install.sh | sudo bash
```

Installs the binary to `/opt/aws-ec2-ddns/bin/` with a symlink at `/usr/local/bin/aws-ec2-ddns`.

## Prerequisites

For binary usage: Linux x64 or arm64 (no Node.js required).

For development: Node.js (latest LTS), pnpm, bun (for building binaries).

## Usage

### Update DNS records

```bash
aws-ec2-ddns update \
  --target <ZONE_ID>:<DOMAIN> \
  [--target <ZONE_ID2>:<DOMAIN2>] \
  [--ttl 60] [--profile <AWS_PROFILE>] [--dry-run]
```

Supports multiple targets across different hosted zones. Or from a JSON config file:

```bash
aws-ec2-ddns update --config /path/to/config.json
```

Config file format:

```json
{
  "ttl": 60,
  "targets": [
    { "hostedZoneId": "ZONE_1", "recordName": "a.example.com" },
    { "hostedZoneId": "ZONE_2", "recordName": "b.other.com" }
  ]
}
```

### Register as systemd service

```bash
sudo aws-ec2-ddns register \
  --target <ZONE_ID>:<DOMAIN> \
  [--target <ZONE_ID2>:<DOMAIN2>] \
  [--ttl 60] [--profile <AWS_PROFILE>] [--dry-run]
```

This will:

1. Generate a JSON config in `/opt/aws-ec2-ddns/config/`
2. Write a systemd unit to `/opt/aws-ec2-ddns/services/`
3. Symlink the unit to `/etc/systemd/system/`
4. Enable and start the service

### Uninstall

```bash
sudo aws-ec2-ddns uninstall
```

Stops and disables the service, removes the binary, config, service files, and symlinks.

### Options

| Flag            | Description                            | Default             |
| --------------- | -------------------------------------- | ------------------- |
| `-t, --target`  | Target as `zoneId:domain` (repeatable) | Required            |
| `--ttl`         | TTL for created records                | `60`                |
| `-p, --profile` | AWS profile to use                     | Default credentials |
| `-d, --dry-run` | Preview changes without applying       | `false`             |
| `-c, --config`  | JSON config file (update only)         | -                   |

## Development

```bash
pnpm install

# Run CLI in dev mode
pnpm tsx src/cli.ts update --help
pnpm tsx src/cli.ts register --help

# Check formatting
pnpm format

# Fix formatting
pnpm format:fix

# Lint
pnpm lint

# Fix lint issues
pnpm lint:fix

# Type check
pnpm typecheck

# Run all checks (format + lint + typecheck)
pnpm validate

# Fix and validate
pnpm validate:fix
```

## Building Binaries

Requires [bun](https://bun.sh) installed.

```bash
# Build for both Linux x64 and arm64
pnpm build

# Build for specific architecture
pnpm build:linux-x64
pnpm build:linux-arm64
```

Binaries are output to `dist/`.

## How It Works

1. Fetches the instance's public IP from `checkip.amazonaws.com`
2. Queries Route 53 for existing A records matching the configured domain(s)
3. Compares the current IP against the record value
4. Upserts only the records that have changed

## License

MIT
