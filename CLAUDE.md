# CLAUDE.md

## Project Context

**aws-ec2-ddns** is a Dynamic DNS (DDNS) CLI tool and systemd service for AWS EC2 instances. It fetches the instance's current public IP (via `checkip.amazonaws.com`), compares it against the existing Route 53 A record(s), and upserts only when the IP has changed.

- **Language/Runtime**: TypeScript (latest, strict mode), Node.js (latest LTS), ESM (`"type": "module"`)
- **Package Manager**: pnpm
- **Execution**: Runs directly via `tsx` (no build/compile step)
- **AWS Integration**: Route 53 (`@aws-sdk/client-route-53` — Client/Command pattern), credential providers (`@aws-sdk/credential-providers`)
- **Key deps**: axios, commander, zod (v4), boxen, package-directory

### Structure

- `src/update-dns-target.ts` — Core logic (IP fetch, Route 53 upsert, Zod config validation)
- `src/index.ts` — Barrel export
- `scripts/install-service.ts` — Installs as a systemd `oneshot` service
- `scripts/update-dns-target-with-args.ts` — CLI entry point (commander args)
- `scripts/update-dns-target-with-config.ts` — Entry point reading JSON config from `.installations/`
- `services/aws-ec2-ddns.service` — Systemd unit template

## Essential Commands

```bash
# Run DNS update with CLI args
pnpm script scripts/update-dns-target-with-args.ts \
  --hosted-zone-id <ZONE_ID> \
  --record-name <DOMAIN> \
  [--ttl 60] [--profile <AWS_PROFILE>] [--dry-run]

# Install as systemd service
pnpm script scripts/install-service.ts \
  --hosted-zone-id <ZONE_ID> \
  --record-name <DOMAIN1> [<DOMAIN2>...] \
  [--ttl 60] [--profile <AWS_PROFILE>] [--dry-run]

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

### File Naming

- Components: `PascalCase.tsx`
- Everything else: `kebab-case.ts`
- Barrel exports via `index.ts` (imports/exports only, no logic)

### Imports (ESLint enforced order)

1. External packages
2. Sibling packages
3. Internal aliases (`#src/`)
4. Relative imports

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

- **ESLint**: Flat config (`eslint.config.ts`), requires `jiti` for TS config
- **Prettier**: TS config (`prettier.config.ts`), decoupled from ESLint (no prettier plugin, uses `eslint-config-prettier` to avoid rule conflicts)
- **TypeScript runner**: `tsx` (not `ts-node`)

## Do NOT

- Use interfaces (use types with `I` prefix)
- Use switch/case (use ts-pattern)
- Use native `Date` (use dayjs)
- Use npm/yarn (pnpm only)
- Use Zod 3 patterns
- Use `ts-node` (use `tsx`)
- Use `eslint-plugin-prettier` (lint and format are decoupled)
- Use deprecated APIs — always use current, non-deprecated signatures

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
