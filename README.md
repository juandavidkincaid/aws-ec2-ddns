# aws-ec2-ddns

Dynamic DNS (DDNS) tool for AWS EC2 instances. Fetches the instance's current public IP, compares it against existing Route 53 A record(s), and upserts only when the IP has changed.

## Prerequisites

- Node.js (latest LTS)
- pnpm
- AWS credentials with Route 53 permissions

## Setup

```bash
pnpm install
```

## Usage

### Update DNS with CLI arguments

```bash
pnpm script scripts/update-dns-target-with-args.ts \
  --hosted-zone-id <ZONE_ID> \
  --record-name <DOMAIN> \
  [--ttl 60] [--profile <AWS_PROFILE>] [--dry-run]
```

### Update DNS from config file

```bash
pnpm script scripts/update-dns-target-with-config.ts \
  --json-config-file <PATH_TO_JSON>
```

### Install as systemd service

Registers a `oneshot` systemd service that runs the DNS update on boot and can be triggered via timers.

```bash
sudo pnpm script scripts/install-service.ts \
  --hosted-zone-id <ZONE_ID> \
  --record-name <DOMAIN1> [<DOMAIN2>...] \
  [--ttl 60] [--profile <AWS_PROFILE>] [--dry-run]
```

This will:

1. Generate a JSON config in `.installations/`
2. Write a systemd unit to `/etc/systemd/system/aws-ec2-ddns.service`
3. Enable and start the service

### Options

| Flag                   | Description                      | Default             |
| ---------------------- | -------------------------------- | ------------------- |
| `-z, --hosted-zone-id` | AWS Route 53 Hosted Zone ID      | Required            |
| `-n, --record-name`    | Domain record name(s) to update  | Required            |
| `-t, --ttl`            | TTL for created records          | `60`                |
| `-p, --profile`        | AWS profile to use               | Default credentials |
| `-d, --dry-run`        | Preview changes without applying | `false`             |

## Development

```bash
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

## How it works

1. Fetches the instance's public IP from `checkip.amazonaws.com`
2. Queries Route 53 for existing A records matching the configured domain(s)
3. Compares the current IP against the record value
4. Upserts only the records that have changed

## License

MIT
