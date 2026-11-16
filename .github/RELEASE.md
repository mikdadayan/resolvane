# Backend release walkthrough

These workflows describe the intended release process for review. The backend Dockerfile is included; AWS infrastructure and GitHub environment settings are still required before they can execute successfully.

## Files

- `workflows/release.yml` coordinates the release and builds the image once.
- `workflows/deploy-backend.yml` contains the deployment procedure reused for test and production.
- The existing quality and migration workflows continue to run CI independently.

```text
Push to master -> existing CI and migration guard

Manually start Release backend
  -> verify both workflows passed for the exact commit
  -> build container image and push to ECR
  -> run migrations on the test database
  -> deploy backend to test and check /health
  -> wait for production approval
  -> run migrations on the production database
  -> deploy the same image digest to production and check /health
```

Start a release from the `master` branch using Actions -> Release backend -> Run workflow. The release uses the selected branch's commit and rejects it if either existing validation workflow has not passed. It checks existing CI results instead of rerunning the checks.

The commented `workflow_run` trigger shows how to enable automatic test deployment after CI on `master`. The exact-commit checks still apply. If the migration guard is still running when an automatic release checks it, that release fails closed and can be rerun after the guard succeeds.

## Environment configuration

Create GitHub Environments named `testing` and `production`. Configure required reviewers on `production` before enabling releases. Restrict both environments to deployments from `master`. Required reviewers are configured in GitHub settings; the YAML `environment` field selects those rules. Without that setting, the production job starts automatically after test verification.

Set these Variables in each environment:

| Variable | Purpose |
|---|---|
| `AWS_REGION` | Region containing that environment's resources |
| `AWS_DEPLOY_ROLE_ARN` | IAM role GitHub assumes using OIDC |
| `ECR_REPOSITORY` | Backend image repository name; needed by the testing build job |
| `ECS_CLUSTER` | ECS cluster name |
| `ECS_SERVICE` | Backend service name |
| `ECS_TASK_FAMILY` | Existing task definition family for that environment |
| `ECS_CONTAINER_NAME` | Backend container name inside the task definition |
| `ECS_SUBNETS` | Comma-separated private subnet IDs for the migration task |
| `ECS_SECURITY_GROUPS` | Comma-separated security group IDs for the migration task |
| `BACKEND_URL` | Reachable HTTPS backend address used for the health check |

The workflow reads `vars` from whichever environment the job selects. AWS OIDC trust policies must allow the corresponding GitHub environment identity, and deployment roles need scoped ECR, ECS, and IAM PassRole permissions. The production task execution role must be able to pull the exact image published by the testing build job. Cross-account deployments also need an appropriate ECR repository policy.

## Backend and database configuration

Each environment has its own persistent PostgreSQL database and ECS task definition. Infrastructure provisioning happens separately. Releases apply the committed Prisma migrations to the existing database.

The task definitions provide ordinary runtime settings and references to AWS Secrets Manager secrets for database credentials, Better Auth secrets, and API keys. ECS injects these when starting the containers. The release workflow handles resource identifiers and image digests; database passwords stay in AWS.

`server/Dockerfile` builds from the repository root with Node 24.22.3 and pnpm 10.34.9. Build stages install the frozen workspace dependencies and compile core and the server. The final image installs only production dependencies for the backend and core. The Prisma CLI is a production dependency because the same image runs migrations. The image generates the Prisma client during the build using a placeholder database URL; it does not connect to a database or run migrations while building. `.dockerignore` excludes local environment files, dependencies, tests, and generated clients, as well as unrelated repository files.

Build the Linux AMD64 image used by the release workflow with:

```sh
docker build --platform linux/amd64 -f server/Dockerfile -t resolvane-backend:local .
```

The runtime uses the non-root node user, works in `/app/server`, and starts `node dist/index.js` on port 3000. Compiled output includes the knowledge-base asset; no Bun or tsx runtime is required. ECS supplies the real runtime environment and secrets. The migration task overrides the default command with `node node_modules/prisma/build/index.js migrate deploy`; the image has no entrypoint that would force the server to start. Database migrations and initial data provisioning remain separate from image creation.

A fresh environment also needs its initial admin and AI agent users provisioned through the existing seed procedures using that environment's credentials. Ordinary releases run migrations without resetting or reseeding application data.

Private migration tasks need connectivity to PostgreSQL, ECR, Secrets Manager, and logging through the appropriate networking configuration. Configure ECS deployment health checks and rollback behavior in infrastructure. Migrations must remain compatible with the previous backend during rolling updates; reverting an image does not revert the database.

The deployed verification currently checks the existing `/health` endpoint. Full unit, API integration, and browser tests run in CI against temporary services. Testing authenticated behavior against the deployed test environment would require a separate smoke suite with its own test data.


Local builds and disposable-database container checks do not require AWS infrastructure. Actual AWS migrations, service updates, and GitHub approval behavior require the infrastructure and environment configuration above.

References: [GitHub deployment approvals](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [GitHub OIDC for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), [ECS deployment action](https://github.com/aws-actions/amazon-ecs-deploy-task-definition).

## Affected backend releases

The checks job asks `turbo query affected --packages @resolvane/server --base <previous-release> --head <release-commit> --exit-code` whether the backend is affected. Workspace dependencies propagate shared core changes to the server. Client-only source changes skip backend image creation and both deployments. CI still validates the commit independently.

The baseline is the source SHA recorded in the last successful release's `release-source` artifact. Failed releases are excluded. The first release, expired metadata (30 days), or unavailable history causes a conservative backend release. Turbo errors fail the job. Root dependency/configuration changes may conservatively affect all packages. Runtime setting changes made outside Git require separate deployment handling.

## Versioned backend releases

When starting Release backend manually, enter a version such as `1.2.0`. The workflow validates the format and rejects an existing `backend/v1.2.0` tag before building. After production deployment and health verification succeed, it creates that Git tag at the exact source commit and publishes a GitHub Release. The release includes a `release.json` asset recording the source commit, immutable ECR image URI, production environment, and workflow URL. Unaffected backend runs skip publication.

Image tags still identify build attempts; Git release tags provide human-readable release versions. Future rollback tooling can read `release.json` to deploy the retained image by digest. Configure ECR retention to keep released images. Rollback automation and database compatibility checks remain separate work.

Versions are selected manually; the commented automatic trigger requires an explicit version-selection policy before enabling. GitHub must allow the publication job's `contents: write` permission and tag creation. If publication fails after deployment, production may already be updated; rerun the failed publication job rather than rebuilding the image. Existing tags/releases are never intentionally overwritten.
