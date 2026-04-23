---
name: vue-project-setup
# prettier-ignore
description: Scaffold a Vue 3 SPA project with localStorage as the data layer. Use when starting a new project, bootstrapping, or creating a new app. AWS infrastructure (Lambda, CDK) is added later by the aws-deploy skill.
---

# Project Setup Skill

Scaffolds the Vue SPA layer of the project. The app uses localStorage
as its data layer during development. AWS infrastructure (Lambda functions,
CDK stacks, shared API types) is added separately by the `aws-deploy` skill
once all domains are working locally.

---

## Stack

- Vue 3 + TypeScript (browser target)
- Vue Router + Pinia
- shadcn-vue + Tailwind CSS
- Storybook
- Vitest
- localStorage as the data layer (switched to AWS API via `VITE_USE_LOCAL_STORAGE` env var)

---

## Required output

Do not consider the task complete until all of the following exist:

**Project root:**
1. `.gitignore`
2. `package.json`
3. `postcss.config.js`
4. `components.json`
5. `tsconfig.base.json`
6. `tsconfig.json`
7. `vitest.config.ts`

**Vue app:**
4. `src/` — full Vue app scaffold
5. `src/tsconfig.json`

**Shared types:**
6. `shared/types/index.ts`
7. `shared/types/api.ts`

**Functions (empty until `aws-deploy` skill):**
8. `functions/tsconfig.json` — Node16 target, ready for Lambda handlers

**Coverage:**
14. `stories/tsconfig.json` — path alias for `@` in story files
15. `stories/blocks/DesignTokens.stories.ts` — baseline Storybook smoke test
16. `src/components/blocks/DesignTokens.vue` — baseline design token component
17. `tests/src/` — mirrors src/ testable layers
18. `tests/functions/` — mirrors functions/

**Docs and skills:**
17. `docs/` — architecture, contributing, decisions
18. `skills/` — all skill files + README

---

## Full directory structure

```
my-project/
│
├── src/                          # Vue SPA — browser target
│   ├── components/
│   │   ├── ui/                   # shadcn-vue primitives
│   │   ├── blocks/               # dumb reusable building blocks
│   │   ├── modules/              # containers + dumb components
│   │   └── layouts/              # slot-based page structure
│   ├── stores/                   # one folder per domain
│   │   └── contacts/
│   │       ├── useContactsStore.ts
│   │       ├── contactsReducers.ts
│   │       ├── contactsService.ts
│   │       └── types.ts
│   ├── composables/
│   │   ├── orchestration/
│   │   └── effects/
│   ├── utils/
│   │   └── reducerPipeline.ts
│   ├── router/
│   ├── pages/
│   ├── assets/
│   │   └── globals.css
│   ├── App.vue
│   ├── main.ts
│   └── tsconfig.json
│
├── functions/                    # Lambda handlers — Node target (populated by aws-deploy skill)
│   └── tsconfig.json
│
├── shared/                       # Contract layer — types only
│   └── types/
│       ├── api.ts                # request/response shapes
│       ├── contact.ts            # example domain type
│       └── index.ts
│
├── stories/                      # mirrors src/components/
│   ├── blocks/
│   │   └── DesignTokens.stories.ts
│   ├── modules/
│   ├── layouts/
│   └── tsconfig.json             # @/* → ../src/* alias for TS language server
│
├── tests/                        # mirrors testable layers
│   ├── src/
│   │   ├── stores/
│   │   ├── composables/
│   │   ├── components/
│   │   │   └── modules/
│   │   └── utils/
│   └── functions/
│       └── contacts/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── DECISIONS.md
│
├── skills/
│   ├── README.md
│   └── [all skill folders]
│
├── package.json
├── tsconfig.base.json
├── vitest.config.ts
└── .env.local
```

---

## Step 1 — Scaffold the Vue app

Write all files directly — do not use `pnpm create vue@latest`. That command externalises version decisions to a scaffolder that drifts and cannot be run non-interactively.

```json
// package.json
{
  "name": "my-project",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:app": "vitest --project app",
    "test:functions": "vitest --project functions",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "type-check": "vue-tsc --noEmit"
  },
  "dependencies": {
    "@vueuse/core": "^14.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-vue-next": "^1.0.0",
    "pinia": "^2.2.0",
    "reka-ui": "^2.0.0",
    "tailwind-merge": "^2.5.0",
    "vue": "^3.5.0",
    "vue-router": "^4.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.0",
    "@vue/test-utils": "^2.4.0",
    "@vue/tsconfig": "^0.5.0",
    "autoprefixer": "^10.4.0",
    "esbuild": "^0.27.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "~5.6.0",
    "vite": "^8.0.0",
    "vitest": "^3.0.0",
    "vue-tsc": "^2.1.0",
    "storybook": "^10.0.0",
    "@storybook/vue3": "^10.0.0",
    "@storybook/vue3-vite": "^10.0.0",
    "@types/node": "^25.0.0"
  },
  "pnpm": {
    "overrides": {
      "vite": "^8.0.0"
    }
  },
  "engines": {
    "node": ">=20.19",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.0.0"
}
```

```ini
# .npmrc
shamefully-hoist=false
strict-peer-dependencies=false
```

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Project</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```ts
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/globals.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

```vue
<!-- src/App.vue -->
<template>
  <RouterView />
</template>
```

```ts
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [],
})

export default router
```

```ts
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const serverConfig = (() => {
    if (!env.API_URL) return undefined
    const apiUrl = new URL(env.API_URL)
    const stagePath = apiUrl.pathname.replace(/\/$/, '') // e.g. /V1
    return {
      proxy: {
        '/api': {
          target: apiUrl.origin, // scheme + host only — http-proxy drops target path
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, stagePath),
        },
      },
    }
  })()

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    server: serverConfig,
  }
})
```

```ini
# .gitignore
node_modules/
dist/
dist-ssr/
storybook-static/
coverage/
*.local
.env*.local
.DS_Store
Thumbs.db
*.log

# CDK
cdk/cdk.out/
cdk/dist/

# Prevent stale CDK tsc output from shadowing vite.config.ts
# CDK's `tsc` compiles bin/ and lib/ but can accidentally emit vite.config.js
# to the project root. Vite loads .js before .ts — this file silently wins.
vite.config.js
```

Then install:

```bash
pnpm install
```

---

## Step 2 — Configure Tailwind

`tailwindcss`, `postcss`, and `autoprefixer` are already in `devDependencies`
and will be installed by `pnpm install` in Step 1. Write both config files
directly — do not run `tailwindcss init`.

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{vue,ts}', './stories/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config
```

The `<alpha-value>` placeholder is how Tailwind injects opacity into custom
colors. It enables opacity modifier syntax like `bg-primary/50` and
`text-foreground/75` to work correctly alongside the CSS variables.

---

## Step 3 — Configure shadcn-vue with MCP server (preferred)

This project uses shadcn’s Model Context Protocol (MCP) server workflow as the primary way to discover and install UI components.

- Preferred: natural language install via MCP (Copilot, VS Code, Claude Code).
- Fallback: manual CLI (`pnpm dlx shadcn-vue add ...`).
- `components.json` remains the source of component registry metadata.

### 3.1 components.json (core metadata)

```json
// components.json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "default",
  "typescript": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/assets/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/composables"
  }
}
```

For private registries, add entries here and set credentials in `.env.local`:

```ini
REGISTRY_TOKEN=your_token_here
API_KEY=your_api_key_here
```

### 3.2 Copilot / VS Code MCP config

Create `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn-vue@latest", "mcp"]
    }
  }
}
```

Reload VS Code, open the Copilot/MCP panel, and confirm shadcn is connected.

### 3.3 Claude Code MCP setup

Run:

```bash
pnpm dlx shadcn-vue@latest mcp init --client claude
```

Then use `/mcp` in Claude Code, select shadcn server, and invoke natural-language tasks.

### 3.4 Optional root MCP config

Create `.mcp.json` with the same contents as `.vscode/mcp.json` if you need generic client support.

### 3.5 Recommended MCP prompts

- "Add button and dialog components"
- "Create a contact form using shadcn components"
- "List available card components"

### 3.6 Fallback CLI install (only if required)

```bash
pnpm dlx shadcn-vue add button
pnpm dlx shadcn-vue add dialog
```

### 3.7 Troubleshooting

- If MCP does not respond: restart the client, confirm config file path, run `npx clear-npx-cache`.
- If no tools appear: verify `shadcn-vue` is installed and run `pnpm dlx shadcn-vue@latest mcp status`.

The CSS tokens (Step 4) and path aliases (`vite.config.ts`) are already handled elsewhere — `components.json` just registers their locations for the CLI.

---

## Step 4 — globals.css tokens

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: 221 83% 53%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 221 83% 53%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 0 0% 100%;
    --card: 222 47% 13%;
    --card-foreground: 0 0% 100%;
    --popover: 222 47% 13%;
    --popover-foreground: 0 0% 100%;
    --primary: 217 91% 65%;
    --primary-foreground: 222 47% 11%;
    --secondary: 217 33% 18%;
    --secondary-foreground: 0 0% 100%;
    --muted: 217 33% 18%;
    --muted-foreground: 215 20% 65%;
    --accent: 217 33% 18%;
    --accent-foreground: 0 0% 100%;
    --border: 217 33% 25%;
    --input: 217 33% 25%;
    --ring: 217 91% 65%;
  }
}
```

---

## Step 5 — shadcn utility and reducerPipeline

shadcn components import `cn` from `@/lib/utils`. Create this file so all
shadcn UI components resolve correctly. Keep it separate from project
utilities — `src/lib/` is shadcn's concern, `src/utils/` is the project's.

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```ts
// src/utils/reducerPipeline.ts
type Reducer<S> = (state: S, payload?: unknown) => S

export function reducerPipeline<S>(...reducers: Reducer<S>[]) {
  return (state: S, payload?: unknown): S =>
    reducers.reduce((s, r) => r(s, payload), state)
}
```

---

## Step 6 — Shared types

No framework imports. Plain TypeScript only.

```ts
// shared/types/api.ts
export interface ApiResponse<T> {
  data: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
}
```

```ts
// shared/types/contact.ts
export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
}
```

```ts
// shared/types/index.ts
export * from './api'
export * from './contact'
```

---

## Step 7 — TypeScript config

```json
// tsconfig.base.json (root)
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

```json
// tsconfig.json (root — covers vite.config.ts and vitest.config.ts)
// @/* paths here are required for shadcn-vue CLI/MCP to resolve aliases
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

```json
// src/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM"],
    "moduleResolution": "bundler",
    "types": ["vite/client"],
    "paths": {
      "@/*": ["./*"],
      "@shared/*": ["../shared/*"]
    }
  }
}
```

```json
// functions/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "Node16",
    "moduleResolution": "node16",
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["./**/*.ts"]
}
```

---

## Step 8 — Vitest config

Two named projects — correct environment per layer.

```ts
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
}

export default defineConfig({
  plugins: [vue()],
  resolve: { alias },
  test: {
    projects: [
      {
        plugins: [vue()],
        resolve: { alias },
        test: {
          name: 'app',
          include: ['tests/src/**/*.test.ts'],
          environment: 'jsdom',
          globals: true,
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'functions',
          include: ['tests/functions/**/*.test.ts'],
          environment: 'node',
          globals: true,
        },
      },
    ],
  },
})
```

Run independently or together:
```bash
vitest --project app          # Vue tests only
vitest --project functions    # Lambda tests only
vitest                        # everything
```

---

## Step 9 — functions/ placeholder

`functions/` starts empty. Lambda handlers are added by the `aws-deploy` skill
when the team is ready to move to AWS. The `tsconfig.json` is created here so
the Vitest `functions` project and the TypeScript compiler are configured from
day one — tests in `tests/functions/` can be written against pure handler logic
without deploying anything.

`functions/tsconfig.json` is already written in Step 7.

```json
// cdk/cdk.json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "watch": {
    "include": ["**"],
    "exclude": ["README.md", "cdk*.json", "**/*.d.ts", "**/*.js", "tsconfig.json", "package*.json", "node_modules", "dist"]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws", "aws-cn"],
    "@aws-cdk/aws-apigateway:disableCloudWatchRole": true,
    "@aws-cdk/core:enablePartitionLiterals": true,
    "@aws-cdk/aws-iam:minimizePolicies": true,
    "@aws-cdk/aws-s3:createDefaultLoggingPolicy": true,
    "@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021": true,
    "@aws-cdk/customresources:installLatestAwsSdkDefault": false
  }
}
```

```json
// cdk/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "Node16",
    "moduleResolution": "node16",
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "types": ["node"]
  },
  "include": ["bin/**/*.ts", "lib/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

```json
// cdk/package.json
{
  "name": "[project-name]-infra",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "tsc",
    "cdk": "cdk"
  },
  "dependencies": {
    "aws-cdk-lib": "^2.160.0",
    "constructs": "^10.4.0",
    "source-map-support": "^0.5.21"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.0",
    "@types/node": "^22.0.0",
    "aws-cdk": "^2.160.0",
    "esbuild": "^0.24.0",
    "ts-node": "^10.9.0",
    "typescript": "~5.6.0"
  }
}
```

```ts
// cdk/lib/api-stack.ts
import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import { Construct } from 'constructs'

interface ApiStackProps extends cdk.StackProps {
  stageName: string
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `api-${props.stageName}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    })

    this.apiUrl = api.url
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url })
  }
}
```

```ts
// cdk/lib/hosting-stack.ts
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Construct } from 'constructs'
import * as path from 'path'

interface HostingStackProps extends cdk.StackProps {
  stageName: string
  apiUrl: string
}

export class HostingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id, props)

    const bucket = new s3.Bucket(this, 'SpaBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.stageName === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stageName !== 'prod',
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
      defaultRootObject: 'index.html',
    })

    new s3deploy.BucketDeployment(this, 'DeployApp', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../dist'))],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
    })

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
    })
  }
}
```

```ts
// cdk/bin/app.ts
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ApiStack } from '../lib/api-stack'
import { HostingStack } from '../lib/hosting-stack'

const app = new cdk.App()
const stageName = app.node.tryGetContext('stage') ?? 'dev'

const apiStack = new ApiStack(app, `App-Api-${stageName}`, {
  stageName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})

new HostingStack(app, `App-Hosting-${stageName}`, {
  stageName,
  apiUrl: apiStack.apiUrl,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})
```

---

## Step 10 — Configure Storybook

Add to `devDependencies` in `package.json`:

```json
"storybook": "^10.0.0",
"@storybook/vue3": "^10.0.0",
"@storybook/vue3-vite": "^10.0.0"
```

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts'],
  addons: [],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
}

export default config
```

```ts
// .storybook/preview.ts
import '../src/assets/globals.css'
import type { Preview } from '@storybook/vue3'

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
  },
}

export default preview
```

The `stories/` directory is outside `src/`, so the TypeScript language server
won't find the `@` alias from `src/tsconfig.json`. Add a dedicated tsconfig:

```json
// stories/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM"],
    "moduleResolution": "bundler",
    "types": ["vite/client"],
    "paths": {
      "@/*": ["../src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["./**/*.ts"]
}
```

---

## Step 11 — Baseline DesignTokens story

Create a smoke-test story that proves Storybook, Tailwind, and the shadcn CSS
variables are all wired up correctly. The component exercises:
- Solid token colors (`bg-primary`, `text-foreground`, `border-border`)
- Opacity modifiers (`text-foreground/50`, `bg-primary/15`)
- Hover and focus variants on buttons (`hover:bg-primary/80`, `focus:ring-primary`)

```vue
<!-- src/components/blocks/DesignTokens.vue -->
<script setup lang="ts">
const colorTokens = [
  { name: '--background',            label: 'Background',            swatch: 'bg-background' },
  { name: '--foreground',            label: 'Foreground',            swatch: 'bg-foreground' },
  { name: '--card',                  label: 'Card',                  swatch: 'bg-card' },
  { name: '--card-foreground',       label: 'Card Foreground',       swatch: 'bg-card-foreground' },
  { name: '--primary',               label: 'Primary',               swatch: 'bg-primary' },
  { name: '--primary-foreground',    label: 'Primary Foreground',    swatch: 'bg-primary-foreground' },
  { name: '--secondary',             label: 'Secondary',             swatch: 'bg-secondary' },
  { name: '--secondary-foreground',  label: 'Secondary Foreground',  swatch: 'bg-secondary-foreground' },
  { name: '--destructive',           label: 'Destructive',           swatch: 'bg-destructive' },
  { name: '--destructive-foreground',label: 'Destructive Foreground',swatch: 'bg-destructive-foreground' },
  { name: '--border',                label: 'Border',                swatch: 'bg-border' },
  { name: '--input',                 label: 'Input',                 swatch: 'bg-input' },
]

const opacitySwatches = [
  { stop: 100, primary: 'bg-primary/100', foreground: 'bg-foreground/100' },
  { stop: 75,  primary: 'bg-primary/75',  foreground: 'bg-foreground/75'  },
  { stop: 50,  primary: 'bg-primary/50',  foreground: 'bg-foreground/50'  },
  { stop: 25,  primary: 'bg-primary/25',  foreground: 'bg-foreground/25'  },
  { stop: 10,  primary: 'bg-primary/10',  foreground: 'bg-foreground/10'  },
]
</script>

<template>
  <div class="p-8 space-y-10 bg-background text-foreground">
    <section>
      <h2 class="text-lg font-semibold mb-4">Color Tokens</h2>
      <div class="grid grid-cols-3 gap-4">
        <div v-for="token in colorTokens" :key="token.name" class="flex flex-col gap-1.5">
          <div class="h-14 rounded border border-border" :class="token.swatch" />
          <p class="text-sm font-medium leading-none">{{ token.label }}</p>
          <p class="text-xs text-foreground/50">{{ token.name }}</p>
        </div>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-1">Buttons</h2>
      <p class="text-xs text-foreground/50 mb-4">Hover and focus each button to verify modifier support.</p>
      <div class="flex flex-wrap gap-3">
        <button class="px-4 py-2 rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
          Primary
        </button>
        <button class="px-4 py-2 rounded text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
          Secondary
        </button>
        <button class="px-4 py-2 rounded text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/80 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-background">
          Destructive
        </button>
        <button class="px-4 py-2 rounded text-sm font-medium border border-border bg-transparent text-foreground hover:bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
          Outline
        </button>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-1">Opacity Modifiers</h2>
      <p class="text-xs text-foreground/50 mb-4">Verifies that <code class="font-mono">bg-primary/N</code> and <code class="font-mono">bg-foreground/N</code> resolve correctly.</p>
      <div class="space-y-4">
        <div>
          <p class="text-xs font-mono text-foreground/50 mb-2">bg-primary/N</p>
          <div class="flex gap-3">
            <div v-for="s in opacitySwatches" :key="s.stop" class="flex flex-col items-center gap-1.5">
              <div class="h-10 w-16 rounded border border-border" :class="s.primary" />
              <span class="text-xs font-mono text-foreground/50">{{ s.stop }}%</span>
            </div>
          </div>
        </div>
        <div>
          <p class="text-xs font-mono text-foreground/50 mb-2">bg-foreground/N</p>
          <div class="flex gap-3">
            <div v-for="s in opacitySwatches" :key="s.stop" class="flex flex-col items-center gap-1.5">
              <div class="h-10 w-16 rounded border border-border" :class="s.foreground" />
              <span class="text-xs font-mono text-foreground/50">{{ s.stop }}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-4">Typography</h2>
      <div class="space-y-2">
        <p class="text-3xl font-bold tracking-tight">Display 3xl bold</p>
        <p class="text-2xl font-semibold">Heading 2xl semibold</p>
        <p class="text-xl font-medium">Heading xl medium</p>
        <p class="text-base">Body base — the quick brown fox jumps over the lazy dog</p>
        <p class="text-sm">Body sm — the quick brown fox jumps over the lazy dog</p>
        <p class="text-xs text-foreground/50">Caption xs muted</p>
      </div>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-4">Spacing &amp; Radius</h2>
      <div class="flex items-end gap-4">
        <div
          v-for="size in ['p-2', 'p-4', 'p-6', 'p-8', 'p-12']"
          :key="size"
          :class="[size, 'rounded bg-primary/15']"
        >
          <span class="text-xs font-mono">{{ size }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
```

Note: swatch class names (`bg-primary`, `bg-foreground`, etc.) must appear as
complete string literals in the component file so Tailwind's content scanner
includes them. Do not construct them dynamically from partial strings.

```ts
// stories/blocks/DesignTokens.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import DesignTokens from '@/components/blocks/DesignTokens.vue'

const meta: Meta<typeof DesignTokens> = {
  title: 'Blocks/DesignTokens',
  component: DesignTokens,
}

export default meta
type Story = StoryObj<typeof DesignTokens>

export const Default: Story = {}

export const DarkMode: Story = {
  decorators: [
    (story) => ({
      components: { story },
      template: '<div class="dark"><story /></div>',
    }),
  ],
}
```

---

## Step 12 — Create directory scaffold

```bash
# Vue app layers
mkdir -p src/components/{ui,blocks,modules,layouts}
mkdir -p src/stores/contacts
mkdir -p src/composables/{orchestration,effects}
mkdir -p src/utils src/router src/pages

# Peer layers
mkdir -p functions/contacts
mkdir -p shared/types

# Coverage
mkdir -p stories/{blocks,modules,layouts}
mkdir -p tests/src/{stores,composables,utils}
mkdir -p tests/src/components/modules
mkdir -p tests/functions/contacts

# Docs and skills
mkdir -p docs skills
```

---

## Step 13 — Environment file

```bash
# .env.local
VITE_API_URL=https://your-api-id.execute-api.region.amazonaws.com/prod
```

---

## Deploy commands

```bash
cd cdk

# First time per AWS account/region
pnpm cdk bootstrap

# Deploy
pnpm cdk deploy --all --context stage=dev
pnpm cdk deploy --all --context stage=prod

# Destroy (never on prod)
pnpm cdk destroy --all --context stage=dev
```

---

## Layer summary

| Layer | Target | Build tool | Test environment |
|---|---|---|---|
| `src/` | Browser | Vite | jsdom |
| `functions/` | Node 20 | esbuild via CDK | node |
| `shared/` | Both | tsc check only | — |
| `cdk/` | CDK synth | tsc | — |

---

## Conventions

### shared/
- Plain TypeScript only — no Vue, no AWS SDK imports
- Types shared between `src/` and `functions/`
- Compiler is the test — no test files needed

### functions/
- One folder per domain — mirrors store domain pattern
- Pure handler functions — easy to test without AWS
- Bundled independently by CDK `NodejsFunction`
- Scale to ~15 functions before considering monorepo

### src/
- See `vue-block`, `vue-store`, `vue-smart-container` skills
  for component and store conventions

### When to extract to monorepo
- A second Vue app genuinely needs shared components
- Build in the single app first, extract when proven
- See `vue-monorepo-setup` skill when ready
