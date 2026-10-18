# ForgeOS

ForgeOS is an AI-powered project management application designed to help users organize projects, break down goals into actionable tasks, track progress, and plan their work with AI assistance.

> **Status:** Active development. Features, database structures, and configuration requirements may change as the project evolves.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [AI Provider Configuration](#ai-provider-configuration)
- [Security](#security)
- [Available Scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **Project Management** — Create and manage projects associated with your account.
- **Task Management** — Organize tasks with descriptions, priorities, and scheduled days.
- **Kanban Board** — Track task progress through `todo`, `in_progress`, and `done` statuses.
- **AI Task Breakdown** — Use a compatible AI provider to help break project goals into actionable tasks.
- **Custom AI Providers** — Configure provider names, API endpoints, model IDs, and API keys.
- **Encrypted API Key Storage** — Protect stored AI provider API keys using server-side AES-256-GCM encryption.
- **Authentication and Data Isolation** — Use Supabase authentication and Row Level Security (RLS) to restrict access to user-owned data.
- **AI Rate Limiting** — Use Upstash Redis to help limit AI requests.

AI functionality depends on the selected provider, model availability, valid credentials, and compatible API endpoints.

## Technology Stack

| Technology      | Purpose                                               |
| --------------- | ----------------------------------------------------- |
| Next.js         | Web application framework                             |
| React           | User interface                                        |
| TypeScript      | Type safety                                           |
| Tailwind CSS    | Styling                                               |
| Supabase        | Authentication and PostgreSQL database                |
| `@supabase/ssr` | Supabase integration for server-rendered applications |
| Upstash Redis   | AI request rate limiting                              |
| Node.js Crypto  | Server-side encryption                                |
| Lucide React    | Icons                                                 |
| Vitest          | Automated testing                                     |

Package versions are defined in `package.json` and the repository's lockfile.

## Requirements

Before getting started, make sure you have:

- A compatible Node.js LTS version.
- npm.
- A Supabase account and project.
- An Upstash Redis database.
- AI provider credentials if you want to use AI features.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/dwianto27/ForgeOS.git
cd ForgeOS
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root and configure the variables listed in [Environment Variables](#environment-variables).

Never commit `.env.local` or share its secret values.

### 4. Set up Supabase

Create or select a Supabase project. Apply the database schema from `supabase/schema.sql` using the Supabase Dashboard SQL Editor after the file has been added to the repository.

Do not run the schema against a database that already contains these objects without first reviewing the SQL and backing up the database.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file with the following variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

AI_SETTINGS_ENCRYPTION_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

| Variable                               | Description                                                 |
| -------------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL of your Supabase project.                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key used by the application.           |
| `AI_SETTINGS_ENCRYPTION_KEY`           | Server-side encryption key for stored AI provider API keys. |
| `UPSTASH_REDIS_REST_URL`               | Upstash Redis REST endpoint.                                |
| `UPSTASH_REDIS_REST_TOKEN`             | Authentication token for Upstash Redis.                     |

Keep all secret values private. Variables prefixed with `NEXT_PUBLIC_` may be exposed to the browser and must never contain server-only secrets.

### Generate the encryption key

ForgeOS uses AES-256-GCM to encrypt stored AI provider API keys. Generate a 32-byte key represented as 64 hexadecimal characters with Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set the generated value as `AI_SETTINGS_ENCRYPTION_KEY`.

**Important:** Preserve the same encryption key when moving a database containing previously encrypted AI settings. Changing the key may prevent existing encrypted values from being decrypted.

## Database Setup

ForgeOS uses Supabase PostgreSQL with three primary tables.

| Table                  | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `projects`             | Stores user-owned projects.                                         |
| `tasks`                | Stores tasks associated with projects.                              |
| `ai_provider_settings` | Stores each user's AI provider configuration and encrypted API key. |

The database uses Row Level Security (RLS) policies to restrict access to user-owned records. Task access is checked against ownership of the associated project.

### Schema file

The database schema will be maintained at:

```text
supabase/schema.sql
```

This file is intended to document the database structure, including tables, constraints, indexes, and RLS policies.

Once the file has been committed to GitHub, it can be used to set up a compatible database through the Supabase Dashboard SQL Editor:

1. Create a Supabase project.
2. Open the project's SQL Editor.
3. Review `supabase/schema.sql`.
4. Execute the SQL against the intended database.
5. Verify that the tables, constraints, indexes, and RLS policies were created successfully.
6. Configure the application environment variables.

**Note:** The schema file must exist in the repository before it can be used from GitHub. Creating the schema does not migrate existing user accounts or application data.

Back up an existing database before making structural changes. Review the SQL before running it, particularly when the database already contains tables or policies.

## AI Provider Configuration

ForgeOS supports configurable AI providers through the application's AI settings page.

General setup:

1. Sign in to ForgeOS.
2. Open the AI settings page.
3. Enter the provider name.
4. Configure the API endpoint.
5. Enter a model ID supported by the provider.
6. Enter the provider API key.
7. Save the configuration and test the AI functionality.

Provider compatibility depends on the API format implemented by ForgeOS.

### Example: NVIDIA NIM

[NVIDIA NIM](https://build.nvidia.com/) is one possible provider to configure, provided the selected model and endpoint are compatible with the application.

Check the provider's current documentation for the correct endpoint, model ID, authentication requirements, and usage limits. Model availability and pricing may change.

Never hardcode provider API keys into frontend code or commit them to Git.

## Security

Follow these practices when developing and deploying ForgeOS:

- Never commit `.env.local`, API keys, passwords, or access tokens.
- Keep `AI_SETTINGS_ENCRYPTION_KEY` private and securely backed up.
- Keep Supabase service-role credentials on the server; never expose them through browser code or `NEXT_PUBLIC_` variables.
- Use Supabase RLS to enforce user-level data access.
- Test data isolation with multiple user accounts.
- Keep AI provider API keys encrypted at rest using the application's server-side encryption mechanism.
- Keep Upstash Redis credentials private.
- Review and test database policies before deploying changes to production.

Security depends on the application's implementation, environment configuration, database policies, and deployment practices.

## Available Scripts

Run the following commands from the project root:

| Command         | Purpose                               |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start the development server.         |
| `npm run build` | Build the application for production. |
| `npm run start` | Start the production server.          |
| `npm run lint`  | Run the configured lint checks.       |
| `npm test`      | Run the test suite.                   |

Run scripts from the repository's `package.json`. Additional commands should only be used if they are defined in the project configuration.

## Troubleshooting

### Supabase configuration errors

Verify that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured correctly. Restart the development server after changing environment variables.

### Missing tables or columns

Verify that the schema has been applied to the intended Supabase project and that the database structure matches the application's queries.

### Projects or tasks are not visible

Check the authentication session, project ownership, task relationships, and RLS policies. Do not disable RLS as a permanent workaround.

### AI provider requests fail

Check the endpoint, model ID, API key, provider availability, usage limits, and request format.

### AI API key decryption fails

Verify that `AI_SETTINGS_ENCRYPTION_KEY` matches the key used when the data was encrypted. Do not replace the key if existing encrypted settings still need to be recovered.

### AI rate limiting errors

Verify the Upstash Redis REST URL and token. Also check the configured rate-limit policy and the availability of the Redis service.

## License

No license has been specified for this project yet. Until a license is added, permission to use, modify, or redistribute this software should not be assumed.
