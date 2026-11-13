# Deploy Closer to AWS

Closer ships as two container images (API + web) built in GitHub Actions. Tests and a dry-run image build must pass before the deploy job runs. Deploy runs only on pushes to `main`.

## Pipeline order

Defined in `.github/workflows/test.yml`:

1. `backend` — Ruff + pytest  
2. `frontend` — TypeScript check + Vitest  
3. `build-images` — needs `backend` and `frontend`; builds API and web Docker images (no push)  
4. `deploy` — needs `backend`, `frontend`, and `build-images`; pushes to ECR and rolls ECS services

If any test job fails, images are not treated as releasable and deploy does not start.

## AWS shape (target)

| Piece | Role |
|---|---|
| Amazon ECR | `closer-api` and `closer-web` repositories |
| ECS Fargate | One service for the API, one for the nginx frontend |
| RDS Postgres | Application database (`DATABASE_URL`) |
| EFS or S3 | Optional later; MVP media can use an EFS mount at `MEDIA_ROOT` |
| ALB / HTTPS | Terminate TLS; route `/` to web, `/api` or API host to the API |

Wire `CORS_ORIGINS` and `VITE_API_URL` to the public HTTPS origins before the first production build.

## GitHub configuration

### Secrets (Actions → Secrets)

| Secret | Purpose |
|---|---|
| `AWS_ROLE_ARN` | IAM role for GitHub OIDC (`id-token: write` on the deploy job) |
| `ECR_REGISTRY` | Registry host, e.g. `123456789012.dkr.ecr.eu-west-1.amazonaws.com` |
| `ECS_CLUSTER` | ECS cluster name |
| `ECS_SERVICE_API` | ECS service name for the API |
| `ECS_SERVICE_WEB` | ECS service name for the frontend |

Do not commit access keys. Prefer OIDC federation to the `AWS_ROLE_ARN` role with least privilege: ECR push, ECS update/describe, and pass-role only as required.

### Variables (Actions → Variables)

| Variable | Purpose |
|---|---|
| `AWS_REGION` | Defaults to `eu-west-1` if unset |
| `VITE_API_URL` | Public API base URL baked into the web image at build time |
| `DEPLOY_ENABLED` | Set to `true` to run the `deploy` job on `main`; leave unset until secrets exist |

### Environment

The deploy job uses the `production` environment so you can require reviewers and store environment-scoped secrets.

## Application secrets on the API task

Set these on the ECS task definition / Secrets Manager (not in git):

- `DATABASE_URL`
- `JWT_SECRET` (strong random string, min 32 characters; placeholders rejected at boot)
- `CORS_ORIGINS`
- `MEDIA_ROOT` (path on the task filesystem or mount)
- `GEMINI_API_KEY`, `GEMINI_MODEL` (optional; ideas stay disabled until a couple opts in)

Match names in `.env.example`.

## First-time AWS checklist

1. Create ECR repos `closer-api` and `closer-web`.
2. Create RDS Postgres; run `alembic upgrade head` from a one-off task or release step using the API image.
3. Create ECS cluster + task definitions that pull from ECR and inject secrets.
4. Create the GitHub OIDC provider and deploy role; store `AWS_ROLE_ARN` and the secrets above.
5. Set `VITE_API_URL` and `AWS_REGION` repository variables.
6. Push to `main` and confirm `backend` → `frontend` → `build-images` → `deploy`.

## Rollback

1. Find the previous good image tag (prior `github.sha`) in ECR.  
2. Update both ECS task definitions (or services) to that tag for `closer-api` and `closer-web`.  
3. Run:

```bash
aws ecs update-service --cluster "$ECS_CLUSTER" --service "$ECS_SERVICE_API" --force-new-deployment
aws ecs update-service --cluster "$ECS_CLUSTER" --service "$ECS_SERVICE_WEB" --force-new-deployment
aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE_API" "$ECS_SERVICE_WEB"
```

4. If a bad migration shipped, restore RDS from the last snapshot before retrying a forward migration. Prefer expand/contract migrations so rollback rarely needs a down revision in production.

## Local images (no AWS)

```bash
docker compose build
docker compose up
```

CI’s `build-images` job is the same Dockerfiles with `push: false`.
