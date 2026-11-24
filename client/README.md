# React + TypeScript + Vite

## Container development

Run `pnpm dev` from the repository root to build/start Vite and the backend in
Docker. Open http://localhost:5173. Source edits hot-reload; dependencies stay
inside the images. Run `pnpm dev:logs` for logs and `pnpm dev:stop` to stop both.
Re-run `pnpm dev` after dependency or configuration changes. PostgreSQL stays
on the host; see `server/README.md` for its environment setup.

`pnpm dev:local` runs both apps on the host. The development-only client
Dockerfile does not change production hosting: CI builds static files for S3
and CloudFront.


## Testing deployment

After merging the workflow into master and waiting for CI and Migration Guard
to pass on that exact commit, run **Actions → Release frontend testing → Run
workflow**, selecting master. This workflow does not release the backend.

The GitHub `testing` environment needs `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`,
`FRONTEND_S3_BUCKET`, and `FRONTEND_URL`. The URL is the CloudFront HTTPS origin
shared by frontend pages and `/api/*`. Its deployment role needs S3 list/read/write
permissions on the frontend bucket. CloudFront must use `CachingDisabled` for
the frontend behavior; this workflow does not create invalidations or change
distribution settings. Uploads use `Cache-Control: no-store` for browser caches.

CI builds core and the client, generating Prisma types for the client's type-only
auth imports. No migration or database connection is performed. The deployment
downloads the build artifact, generates public `config.js`, uploads assets first
and index.html last, then checks the public HTML, config, and `/tickets` rewrite.
Old hashed assets are retained so existing browser tabs keep working; bucket
storage cleanup is a separate future task. These HTTP checks do not verify login.

After the HTTP checks, the `smoke` job runs Chromium against the deployed URL:
login, load Tickets through the real API, refresh `/tickets`, log out, and verify
the protected page requires login again. Its dedicated Playwright configuration
does not load local `.env` files, start services, seed users, or modify tickets.

Add `SMOKE_EMAIL` and `SMOKE_PASSWORD` as **secrets** in GitHub's `testing`
environment. Use an existing dedicated, non-admin agent account in the testing
database. The workflow does not create that account. Missing secrets fail the
deployment before any upload. Secrets are not written into the frontend build.

Run the suite directly with `pnpm test:smoke` after setting `SMOKE_BASE_URL`,
`SMOKE_EMAIL`, and `SMOKE_PASSWORD` in your shell environment. The base URL is
the HTTPS frontend origin. This suite is separate from the existing local E2E
suite. Reports are retained for three days and can contain testing account or
ticket details; treat them as private. Browser traces/video are disabled to
avoid recording login request credentials. A smoke-test failure fails the
release but does not roll back uploaded files.

Before testing login, configure the backend's `BETTER_AUTH_URL` and
`BETTER_AUTH_TRUSTED_ORIGINS` for the CloudFront HTTPS origin and deploy the new
task definition. The S3 bucket remains private and readable through CloudFront OAC.

## Runtime configuration

`public/config.js` is loaded before the app and copied unchanged to `dist/config.js` during a build. For each deployment, supply that file with the environment's public settings:

```js
window.APP_CONFIG = {
  apiBaseUrl: "https://api.resolvane.example",
  sentryDsn: "",
  sentryEnvironment: "production",
};
```

The same built JS/CSS can be promoted from test to production by changing only `dist/config.js`. Configure hosting to serve this file with `Cache-Control: no-store`. All its values are public.

With no overrides, production uses the frontend's own origin for API calls and disables Sentry. During development and tests, the existing `VITE_*` values from `.env` remain defaults.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
