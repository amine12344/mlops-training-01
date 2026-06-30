# MLOps Training 01

This repository now supports two deployment milestones:

1. Milestone 1: build container images with Docker, create a KinD cluster, load the images locally, and deploy the application with the manual Kubernetes manifests under [k8s/manual](k8s/manual).
2. Milestone 2: build container images, push them to GHCR, deploy the application with Helm, enable monitoring, and wire up Argo CD for GitOps.

## Repository layout
- [api](api) — Node.js API service with health and metrics endpoints
- [frontend](frontend) — Nginx-based frontend
- [k8s/manual](k8s/manual) — Manual Kubernetes manifests for Milestone 1
- [helm/mlops-training](helm/mlops-training) — Helm chart for Milestone 2
- [argocd](argocd) — Argo CD application manifest
- [scripts](scripts) — End-to-end deployment helpers for both milestones

## Milestone 1 — Docker + KinD + Manual Kubernetes

### Prerequisites
- Docker
- kubectl
- kind

### Run from scratch
```bash
./scripts/milestone1-kind-manual.sh
```

### What the script does
- creates or reuses a KinD cluster named `mlops-training`
- builds the API and frontend images locally
- loads both images into the cluster
- applies the manifests from [k8s/manual](k8s/manual)
- waits for the API, frontend, and Postgres deployments to become ready

### Manual steps if you prefer
```bash
kind create cluster --name mlops-training
kubectl config use-context kind-mlops-training

docker build -t mlops-training-api:latest -f api/Dockerfile ./api
docker build -t mlops-training-frontend:latest -f frontend/Dockerfile ./frontend
kind load docker-image mlops-training-api:latest --name mlops-training
kind load docker-image mlops-training-frontend:latest --name mlops-training

kubectl apply -f k8s/manual/
```

### Verify
```bash
kubectl get pods -n mlops-training
kubectl port-forward svc/frontend 8080:80 -n mlops-training
kubectl port-forward svc/api 8090:8090 -n mlops-training
```

## Milestone 2 — Docker + GHCR + Helm + Monitoring + Argo CD

### Prerequisites
- Docker
- kubectl
- kind
- helm
- GHCR credentials (for the push path)

### Run from scratch
```bash
GHCR_USER=<your-user> GHCR_PAT=<your-pat> ./scripts/milestone2-helm-ghcr.sh
```

### What the script does
- creates a fresh KinD cluster
- builds the API and frontend images
- pushes them to GHCR using the `dev` tag by default
- installs the Prometheus stack in the `monitoring` namespace
- installs the application with Helm in the `mlops-training` namespace
- installs Argo CD and applies the GitOps application manifest

### Manual steps if you prefer
```bash
kind create cluster --name mlops-training
kubectl config use-context kind-mlops-training

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update
helm repo update

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace

helm upgrade --install mlops-training helm/mlops-training \
  -n mlops-training --create-namespace \
  -f helm/mlops-training/envs/kind-values.yaml

kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f argocd/mlops-training-app.yaml
```

### Verify
```bash
kubectl get pods -A
kubectl get svc -n mlops-training
kubectl get servicemonitor -n mlops-training
```

### Access points
- Frontend: http://localhost:8080
- API: http://localhost:8090/health
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- Argo CD: https://localhost:8443

## Deep fixes applied for Milestone 2
- Helm installs now tolerate a fresh cluster without namespace ownership conflicts.
- The Helm chart no longer requires a pre-created pull secret for public GHCR images.
- The ServiceMonitor is aligned with the installed Prometheus release name so monitoring can be picked up correctly.
echo "ArgoCD Password: $ARGOCD_PASSWORD"

#### Access ArgoCD UI

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 --decode
echo

kubectl port-forward svc/argocd-server -n argocd 8443:443
```

Open in your browser: **https://localhost:8443**

Log in with:
- **Username**: admin
- **Password**: (from the command above)

(Browser may warn about self-signed certificate—proceed anyway)

### Step 11: Deploy Application via ArgoCD (GitOps)

Create the ArgoCD application pointing to this repository:

```bash
kubectl apply -f argocd/mlops-training-app.yaml
```

Verify the application was created:

```bash
kubectl get application -n argocd
kubectl describe application mlops-training -n argocd
```

Check synchronization status:

```bash
kubectl get application mlops-training -n argocd -o wide
```

ArgoCD will now watch the repository and automatically sync any changes. You can also manually trigger syncs from the ArgoCD UI.

### Step 12: Monitor Everything

You now have a fully operational MLOps platform with:

**Running Services:**
- ✅ Frontend: http://localhost:8080
- ✅ API: http://localhost:8090
- ✅ Prometheus: http://localhost:9090
- ✅ Grafana: http://localhost:3000
- ✅ ArgoCD: https://localhost:8443

**Management Commands:**

Check all running pods:
```bash
kubectl get pods --all-namespaces
```

View logs from API:
```bash
kubectl logs deployment/api -n mlops-training -f
```

View logs from PostgreSQL:
```bash
kubectl logs deployment/postgres -n mlops-training -f
```

Check application sync status in ArgoCD:
```bash
kubectl get application mlops-training -n argocd -w
```

## Deployment Script (Optional - All Steps in One)

If you want to automate the entire process, save this as `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "=== Creating KinD cluster ==="
kind create cluster --name mlops-training

echo "=== Creating namespaces ==="
kubectl create namespace mlops-training || true
kubectl create namespace monitoring || true
kubectl create namespace argocd || true

echo "=== Building Docker images ==="
docker build -t mlops-training-api:latest -f api/Dockerfile ./api
docker build -t mlops-training-frontend:latest -f frontend/Dockerfile ./frontend

echo "=== Loading images into KinD ==="
kind load docker-image mlops-training-api:latest --name mlops-training
kind load docker-image mlops-training-frontend:latest --name mlops-training

echo "=== Installing Prometheus Stack ==="
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
kubectl wait --for=condition=available --timeout=300s deployment/kube-prometheus-stack-operator -n monitoring || true

echo "=== Deploying MLOps application ==="
helm upgrade --install mlops-training helm/mlops-training \
  -n mlops-training \
  -f helm/mlops-training/envs/kind-values.yaml

echo "=== Waiting for all pods to be ready ==="
kubectl wait --for=condition=ready pod -l app=postgres -n mlops-training --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=api -n mlops-training --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=frontend -n mlops-training --timeout=300s || true

echo "=== Installing ArgoCD ==="
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd || true

echo "=== Deploying via ArgoCD ==="
kubectl apply -f argocd/mlops-training-app.yaml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:8080 (after: kubectl port-forward svc/frontend 8080:80 -n mlops-training)"
echo "  API: http://localhost:8090 (after: kubectl port-forward svc/api 8090:8090 -n mlops-training)"
echo "  Prometheus: http://localhost:9090 (after: kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090)"
echo "  Grafana: http://localhost:3000 (after: kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80)"
echo "  ArgoCD: https://localhost:8443 (after: kubectl port-forward svc/argocd-server -n argocd 8443:443)"
echo ""
echo "ArgoCD password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 --decode
echo ""
```

Run it with:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Branch Updates in This Feature Branch

This branch (`feat/upgrade-application`) includes:
- New API endpoints: `/health`, `/readyz`, `/db`, `/metrics`, `/crash`
- Prometheus metrics via `prom-client`
- Enhanced frontend UI for API health, database, and metrics checks
- `nginx:1.27-alpine` frontend image with styled frontend (style.css)
- Helm chart with support for `IfNotPresent` imagePullPolicy and optional `imagePullSecrets`
- Configurable Helm `imagePullSecrets` for GHCR or private registries
- Kubernetes deployments with 2 replicas and liveness/readiness probes
- API deployment configured to use PostgreSQL credentials from `postgres-secret`
- PostgreSQL manifest support with `postgres-secret`, service, and deployment
- ServiceMonitor for Prometheus scraping
- ArgoCD integration for GitOps deployments

## Manual Kubernetes Deployment (Alternative to Helm)

If you prefer to use manual YAML manifests instead of Helm:

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

Then follow the same port-forward commands from Step 5 onwards.

## Environment-Specific Configuration

### For local KinD development
Use `helm/mlops-training/envs/kind-values.yaml`:
- `imagePullPolicy: Never` — Kubernetes uses locally loaded images
- `imagePullSecrets: []` — No private registry credentials needed

### For production with private registry (GHCR)
First, create a registry secret:

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<personal-access-token> \
  --docker-email=<email> \
  -n mlops-training
```

Then deploy with:

```bash
helm upgrade --install mlops-training helm/mlops-training \
  -n mlops-training --create-namespace \
  --set global.imagePullPolicy=IfNotPresent \
  --set global.imagePullSecrets={ghcr-secret}
```

## Updating Components

Update just the API image tag:

```bash
helm upgrade mlops-training helm/mlops-training -n mlops-training --reuse-values \
  --set api.image.tag=v1.2.3
```

Update just the frontend image tag:

```bash
helm upgrade mlops-training helm/mlops-training -n mlops-training --reuse-values \
  --set frontend.image.tag=v1.2.3
```

## Troubleshooting

### Pods not starting
Check pod status and logs:

```bash
kubectl describe pod <pod-name> -n mlops-training
kubectl logs <pod-name> -n mlops-training
```

### Database connection issues
Ensure PostgreSQL is running:

```bash
kubectl get pods -n mlops-training | grep postgres
kubectl logs deployment/postgres -n mlops-training
```

Test database connectivity from API:

```bash
kubectl port-forward svc/api 8090:8090 -n mlops-training
curl http://localhost:8090/readyz
```

### Images not found in KinD
Make sure images are loaded:

```bash
kind load docker-image mlops-training-api:latest --name mlops-training
kind load docker-image mlops-training-frontend:latest --name mlops-training
```

### Monitoring not scraping
Verify ServiceMonitor is created:

```bash
kubectl get servicemonitor -n mlops-training
```

Check Prometheus configuration to ensure the scrape job is registered.

## Development Notes
- API entrypoint: `api/app.js`
- Frontend entrypoint: `frontend/app.js`
- All service endpoints are automatically configured via Helm templates

## Related Files
- See `Dockerfile.vmultistage` and `Dockerfile.voptimized` for optimized builds.
- For detailed application metrics, see Prometheus at http://localhost:9090

---
For additional help or custom configurations, refer to the Helm chart values in `helm/mlops-training/values.yaml` or the Kubernetes manifests in `k8s/manual/`.

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
