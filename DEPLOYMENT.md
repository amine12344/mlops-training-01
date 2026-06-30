# MLOps Training - Deployment Guide

## Milestone 1 — Docker, KinD and manual Kubernetes manifests

### 1. Create the cluster
```bash
kind create cluster --name mlops-training
kubectl config use-context kind-mlops-training
```

### 2. Build and load the images locally
```bash
docker build -t mlops-training-api:latest -f api/Dockerfile ./api
docker build -t mlops-training-frontend:latest -f frontend/Dockerfile ./frontend
kind load docker-image mlops-training-api:latest --name mlops-training
kind load docker-image mlops-training-frontend:latest --name mlops-training
```

### 3. Deploy the manual manifests
```bash
kubectl apply -f k8s/manual/
```

### 4. Verify
```bash
kubectl get pods -n mlops-training
kubectl wait --for=condition=ready pod -l app=postgres -n mlops-training --timeout=600s
kubectl wait --for=condition=ready pod -l app=api -n mlops-training --timeout=600s
kubectl wait --for=condition=ready pod -l app=frontend -n mlops-training --timeout=600s
```

## Milestone 2 — GHCR, Helm, monitoring and Argo CD

### 1. Create the cluster
```bash
kind delete cluster --name mlops-training >/dev/null 2>&1 || true
kind create cluster --name mlops-training --wait 5m
kubectl config use-context kind-mlops-training
```

### 2. Build and push images to GHCR
```bash
export GHCR_USER=<your-user>
export GHCR_PAT=<your-pat>
export IMAGE_TAG=dev

docker build -t ghcr.io/amine12344/mlops-training-01/api:${IMAGE_TAG} -f api/Dockerfile ./api
docker build -t ghcr.io/amine12344/mlops-training-01/frontend:${IMAGE_TAG} -f frontend/Dockerfile ./frontend

echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker push ghcr.io/amine12344/mlops-training-01/api:${IMAGE_TAG}
docker push ghcr.io/amine12344/mlops-training-01/frontend:${IMAGE_TAG}
```

### 3. Install monitoring
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update
helm repo update
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
```

### 4. Install the application with Helm
```bash
helm upgrade --install mlops-training helm/mlops-training \
  -n mlops-training --create-namespace \
  -f helm/mlops-training/envs/kind-values.yaml \
  --set api.image.tag=${IMAGE_TAG} \
  --set frontend.image.tag=${IMAGE_TAG}
```

### 5. Install Argo CD and apply the app
```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f argocd/mlops-training-app.yaml
```

### 6. Verify everything
```bash
kubectl get deployments,pods,svc -n mlops-training
kubectl get pods -n monitoring
kubectl get servicemonitor -n mlops-training
```

## What changed for a reliable from-scratch install
- The Helm chart can create the namespace cleanly from a fresh cluster.
- The chart uses public GHCR settings by default so it does not depend on a missing pull secret.
- The ServiceMonitor uses the same release label as the kube-prometheus-stack installation so Prometheus can discover it.
