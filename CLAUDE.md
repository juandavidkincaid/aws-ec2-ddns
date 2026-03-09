# CLAUDE.md

## Project Context

**aws-ec2-ddns** is a Dynamic DNS (DDNS) CLI tool and systemd service for AWS EC2 instances. It fetches the instance's current public IP (via `checkip.amazonaws.com`), compares it against existing Route 53 A record(s), and upserts only when the IP has changed.

- **Language/Runtime**: TypeScript (latest, strict mode), Node.js (latest LTS), ESM (`"type": "module"`)
- **Package Manager**: pnpm
- **Execution**: `pnpm tsx` for dev, `bun build --compile` for binary distribution
- **AWS Integration**: Route 53 (`@aws-sdk/client-route-53` — Client/Command pattern), credential providers (`@aws-sdk/credential-providers`)
- **Key deps**: commander, zod (v4), boxen
- **Binary targets**: Linux x64, Linux arm64, macOS x64, macOS arm64

### Structure

```
src/
  cli.ts                    # Main CLI entry point (Commander root + subcommands)
  commands/
    consts.ts               # Shared constants (paths, service name, template)
    parsers.ts              # Shared CLI argument parsers (--target, --ttl)
    update.ts               # `update` subcommand (DNS update with args or config)
    register.ts             # `register` subcommand (systemd service setup)
    uninstall.ts            # `uninstall` subcommand (remove service and files)
    status.ts               # `status` subcommand (service status + config)
  update-dns-target.ts      # Core logic (IP fetch, Route 53 upsert, Zod validation)
  index.ts                  # Barrel export
install.sh                  # One-liner installer script (curl | bash)
terraform/                  # Infrastructure (S3, CloudFront, ACM, R53, IAM)
```

## Essential Commands

```bash
# Run CLI in dev mode
pnpm tsx src/cli.ts update \
  --target <ZONE_ID>:<DOMAIN> \
  [--target <ZONE_ID2>:<DOMAIN2>] \
  [--ttl 60] [--profile <AWS_PROFILE>] [--dry-run]

# Run from config file
pnpm tsx src/cli.ts update --config <PATH_TO_JSON>

# Register as systemd service
pnpm tsx src/cli.ts register \
  --target <ZONE_ID>:<DOMAIN> \
  [--target <ZONE_ID2>:<DOMAIN2>] \
  [--ttl 60] [--profile <AWS_PROFILE>] [--dry-run]

# Uninstall service and remove all files
pnpm tsx src/cli.ts uninstall [--dry-run]

# Check service status and configuration
pnpm tsx src/cli.ts status

# Build binaries (requires bun)
pnpm build

# Formatting
pnpm format          # Check formatting
pnpm format:fix      # Fix formatting

# Linting
pnpm lint            # Check lint
pnpm lint:fix        # Fix lint

# Type checking
pnpm typecheck

# Full validation (format + lint + typecheck)
pnpm validate
pnpm validate:fix
```

## Code Conventions

### TypeScript

- Use `type` with `I` prefix: `type IUserData = {...}`
- Never use switch - use `ts-pattern` or if/else
- Use `T[]` not `Array<T>`
- Avoid `as` assertions (except type guards, `as const`, API boundaries)
- Prefer inline exports: `export type IProps = {...}`
- Use `node:` prefix for Node.js built-in imports (`node:fs`, `node:path`, etc.)
- Use native `fetch` — no axios

### File Naming

- Components: `PascalCase.tsx`
- Everything else: `kebab-case.ts`
- Barrel exports via `index.ts` (imports/exports only, no logic)

### Imports (ESLint enforced order)

1. External packages
2. Sibling packages
3. Internal aliases (`#src/`)
4. Relative imports

### Commander (CLI)

- Commander `.option()` / `.action()` config chain must appear at the **end** of the file
- Extract action handlers into separate named arrow functions above the command definition
- Keep the command export minimal — only configuration, no inline logic

```typescript
// Good
const myAction = async (options: { ... }) => { ... };

export const myCommand = new Command('foo')
  .description('...')
  .option(...)
  .action(myAction);
```

### Frontend

- **Providers vs Components**: Components that render children transparently (middleware, guards, context providers) belong in `src/providers/`, not `src/components/`. Examples: auth guards, access control wrappers, context providers.
- Wrap route components in PageLayout

## AWS SDK

Use the Client/Command pattern:

```typescript
import { Route53Client, ListResourceRecordSetsCommand } from '@aws-sdk/client-route-53';

const client = new Route53Client({ region: 'us-east-1' });
const result = await client.send(new ListResourceRecordSetsCommand({ ... }));
```

## Zod 4 (Critical)

```typescript
// Wrong → Correct
z.nativeEnum(E)     → z.enum(E)
z.string().uuid()   → z.uuid()
z.string().url()    → z.url()
```

## Tooling

- **ESLint**: Flat config (`eslint.config.ts`), uses `defineConfig` from `eslint/config`, requires `jiti` for TS config
- **Prettier**: TS config (`prettier.config.ts`), decoupled from ESLint (no prettier plugin, uses `eslint-config-prettier` to avoid rule conflicts)
- **TypeScript runner**: `pnpm tsx` (not `ts-node`, not `npx tsx`)
- **Binary builds**: `bun build --compile` targeting `bun-linux-x64`, `bun-linux-arm64`, `bun-darwin-x64`, `bun-darwin-arm64`
- **Infrastructure**: Terraform (S3 + CloudFront OAC + ACM + R53) for hosting `install.sh`
- **CI/CD**: GitHub Actions release workflow with OIDC-federated AWS access

## Do NOT

- Use interfaces (use types with `I` prefix)
- Use switch/case (use ts-pattern)
- Use native `Date` (use dayjs)
- Use npm/yarn (pnpm only)
- Use Zod 3 patterns
- Use `ts-node` (use `tsx`)
- Use `npx` (use `pnpm` directly, e.g. `pnpm tsx`)
- Use `eslint-plugin-prettier` (lint and format are decoupled)
- Use deprecated APIs — always use current, non-deprecated signatures
- Use axios (use native `fetch`)

## Research & Lookups

When investigating libraries, APIs, or documentation:

- **https://markdown.new/** — Prefix any URL to get its markdown content directly (e.g. `https://markdown.new/https://docs.aws.amazon.com/...`)
- **https://context7.com/** — Use for library documentation lookups and context gathering

## Dependencies

```bash
pnpm add -E <deps>  # -E = exact version
```

## Code Generation (LLM)

- Use `??` not `||`
- Use `dayjs` for date/time operations
- Use `decimal.js` for currency precision

## Git Commits

```
type(scope?): subject
```

Examples: `feat(auth): add reset flow`, `fix(api): handle null response`
