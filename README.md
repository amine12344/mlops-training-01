# MLOps Training 01

Short repo for the MLOps training exercises: contains a simple API and frontend and example Kubernetes manifests.

## Structure
- `api/` — Node.js API service (app.js, Dockerfile)
- `frontend/` — Simple frontend (app.js, Dockerfile, index.html)
- `k8s/manual/` — Kubernetes manifests for deploying API and frontend
- `docker-compose.yml` — Local compose setup

## Quick start (local)
1. Install dependencies (if needed):

```bash
npm install
```

2. Run with Docker Compose:

```bash
docker-compose up --build
```

The compose setup runs the API and frontend for local testing.

## Branch updates in this feature branch
This branch adds the following updates:
- new API endpoints: `/health`, `/readyz`, `/db`, `/metrics`, and `/crash`
- Prometheus metrics via `prom-client`
- frontend UI buttons for health, database, and metrics checks
- `nginx:1.27-alpine` frontend image with `style.css`
- Kubernetes deployments with 2 replicas, `Always` imagePullPolicy, and liveness/readiness probes
- API deployment configured to use PostgreSQL credentials from `postgres-secret`

## Kubernetes
Manifests are in `k8s/manual/`. Apply them to a cluster (ensure `kubectl` is configured):

```bash
kubectl apply -f k8s/manual/namespace.yaml
kubectl apply -f k8s/manual/postgres-secret.yaml
kubectl apply -f k8s/manual/postgres-deployment.yaml
kubectl apply -f k8s/manual/postgres-service.yaml
kubectl apply -f k8s/manual/api-deployment.yaml
kubectl apply -f k8s/manual/api-service.yaml
kubectl apply -f k8s/manual/frontend-deployment.yaml
kubectl apply -f k8s/manual/frontend-service.yaml
```

To access the frontend locally:

```bash
kubectl port-forward service/frontend 8080:80 -n mlops-training
```

Then open `http://localhost:8080` in your browser.

### Using kind
If you are using `kind`, create a cluster, build the local images, and load them before applying manifests.

```bash
kind create cluster --name mlops-training

docker build -t mlops-training-api:latest -f api/Dockerfile ./api
docker build -t mlops-training-frontend:latest -f frontend/Dockerfile frontend

kind load docker-image mlops-training-api:latest --name mlops-training
kind load docker-image mlops-training-frontend:latest --name mlops-training

kubectl apply -f k8s/manual/namespace.yaml
kubectl apply -f k8s/manual/postgres-secret.yaml
kubectl apply -f k8s/manual/postgres-deployment.yaml
kubectl apply -f k8s/manual/postgres-service.yaml
kubectl apply -f k8s/manual/api-deployment.yaml
kubectl apply -f k8s/manual/api-service.yaml
kubectl apply -f k8s/manual/frontend-deployment.yaml
kubectl apply -f k8s/manual/frontend-service.yaml
```

## Development notes
- API entrypoint: `api/app.js`
- Frontend entrypoint: `frontend/app.js`

## Related files
- See `Dockerfile.vmultistage`, `Dockerfile.voptimized` for optimized builds.

---
If you want a more detailed README (badges, CI, examples), tell me what to include and I will expand it.
# MLOps Training - Node.js API

This is a simple Node.js API for MLOps training, featuring a basic Express server.

## Prerequisites

- Node.js (version 16 or higher)
- Docker (for containerized deployment)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/amine12344/mlops-training-01.git
   cd mlops-training-01
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Locally
```bash
npm start
```
The server will start on port 8090.

### Using Docker
1. Build the Docker image:
   ```bash
   docker build -f Dockerfile.vbad -t api-lab-test .
   ```

2. Run the container:
   ```bash
   docker run -p 8090:8090 api-lab-test
   ```

### Using Docker Compose
This repository includes a `docker-compose.yml` stack that starts:
- `proxy`: an NGINX reverse proxy on host port `8070`
- `api`: the API service built from `./api`
- `db`: a PostgreSQL database initialized with `mlops_db`

Run the full stack with:
```bash
docker-compose up --build
```

Then visit:
- `http://localhost:8070` for the proxied API

Stop and remove containers, networks, and volumes with:
```bash
docker-compose down -v
```

## Health Check
Run the health check script:
```bash
npm run health
```

## Project Structure
- `app.js`: Main application file
- `health.js`: Health check script
- `package.json`: Project dependencies and scripts
- `Dockerfile.vbad`: Docker configuration
- `.gitignore`: Git ignore rules
- `.dockerignore`: Docker ignore rules

## Ignoring Files
- `.gitignore`: Ensures that sensitive files, dependencies, and build artifacts are not committed to version control.
- `.dockerignore`: Optimizes Docker builds by excluding unnecessary files from the build context.

## Added Features
This branch (`feat/compose-api`) introduces the following new features compared to the `main` branch:

- **Docker Compose Setup**: A complete multi-service stack including:
  - NGINX reverse proxy on port 8070
  - Node.js API service built from the `./api` directory
  - PostgreSQL database with health checks and proper initialization

- **CI/CD Pipeline**: Automated workflow (`.github/workflows/image-promotion.yml`) for:
  - Building and scanning Docker images for vulnerabilities using Trivy
  - Promoting images through development, staging, and production environments
  - Generating security reports and SARIF uploads for GitHub Security

- **Health Checks**: 
  - Added `/health` endpoint to the API for service monitoring
  - Database health checks in Docker Compose to ensure services start in the correct order

These features enhance the MLOps capabilities by providing container orchestration, automated deployment, and monitoring tools.
