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
- enhanced frontend UI for API health, database, and metrics checks
- `nginx:1.27-alpine` frontend image with `style.css`
- Helm chart support for `IfNotPresent` imagePullPolicy and optional `imagePullSecrets`
- configurable Helm `imagePullSecrets` for GHCR or private registries
- Kubernetes deployments with 2 replicas and liveness/readiness probes
- API deployment configured to use PostgreSQL credentials from `postgres-secret`
- added PostgreSQL manifest support with `postgres-secret`, service, and deployment

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
```

### Install or upgrade with Helm
Use the Helm chart in `helm/mlops-training`.

For local `kind` development with loaded images:

```bash
helm upgrade --install mlops-training helm/mlops-training -n mlops-training \
  --set api.image.repository=mlops-training-api \
  --set api.image.tag=latest \
  --set frontend.image.repository=mlops-training-frontend \
  --set frontend.image.tag=latest \
  --set global.imagePullPolicy=Never
```

For GHCR images with a private registry secret:

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<personal-access-token> \
  --docker-email=<email> \
  -n mlops-training

helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring        --create-namespace

helm upgrade --install mlops-training helm/mlops-training \
  --set global.imagePullPolicy=IfNotPresent \
  --set global.imagePullSecrets={ghcr-secret} \
  --create-namespace
```

If Prometheus Operator / ServiceMonitor CRDs are not installed, disable monitoring when installing:

```bash
helm upgrade --install mlops-training helm/mlops-training -n mlops-training \
  --set monitoring.enabled=false \
  --set global.imagePullPolicy=IfNotPresent
```

### Update a single component
If only a component changed, update just that image:

```bash
helm upgrade mlops-training helm/mlops-training -n mlops-training --reuse-values \
  --set frontend.image.tag=dev
```

```bash
helm upgrade mlops-training helm/mlops-training -n mlops-training --reuse-values \
  --set api.image.tag=dev
```

```bash
  helm upgrade mlops-training helm/mlops-training -n mlops-training --reuse-values \
 kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

  kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

 get argo password 
 kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 --decode
  echo 

 create application in  argocd 
  kubectl apply -f argocd/mlops-training-app.yaml
```

### Optional manual manifest apply
If you still want to apply the manual manifests instead of Helm:

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

### Argo CD
To install Argo CD and deploy the application via GitOps:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f argocd/mlops-training-app.yaml
```

To access the Argo CD UI:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Then open `https://localhost:8080` and log in with the Argo CD admin password.

### Grafana
If Grafana is installed in the `monitoring` namespace, port-forward to access it:

```bash
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring
```

Then open `http://localhost:3000` in your browser.

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
