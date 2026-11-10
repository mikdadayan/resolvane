# Backend release walkthrough

These workflows describe the intended release process for review. They need the backend Dockerfile, AWS infrastructure, and GitHub environment settings before they can execute successfully.

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

The future image must target Linux AMD64, use the server directory as its working directory, contain the pinned Prisma CLI and committed migrations, and generate the Prisma client during image creation. Its default command must start the Bun server without hot reload. The migration task overrides that command with `bun --bun run prisma migrate deploy`. Its entrypoint must permit command overrides.

A fresh environment also needs its initial admin and AI agent users provisioned through the existing seed procedures using that environment's credentials. Ordinary releases run migrations without resetting or reseeding application data.

Private migration tasks need connectivity to PostgreSQL, ECR, Secrets Manager, and logging through the appropriate networking configuration. Configure ECS deployment health checks and rollback behavior in infrastructure. Migrations must remain compatible with the previous backend during rolling updates; reverting an image does not revert the database.

The deployed verification currently checks the existing `/health` endpoint. Full unit, API integration, and browser tests run in CI against temporary services. Testing authenticated behavior against the deployed test environment would require a separate smoke suite with its own test data.


Workflow structure and action inputs can be reviewed locally. Actual image builds, AWS migrations, service updates, and GitHub approval behavior require the infrastructure and environment configuration above.

References: [GitHub deployment approvals](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [GitHub OIDC for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), [ECS deployment action](https://github.com/aws-actions/amazon-ecs-deploy-task-definition).
