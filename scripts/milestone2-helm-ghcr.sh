#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME=${CLUSTER_NAME:-mlops-training}
NAMESPACE=mlops-training
IMAGE_TAG=${IMAGE_TAG:-dev}
GHCR_USER=${GHCR_USER:-}
GHCR_PAT=${GHCR_PAT:-}

if [[ -z "$GHCR_USER" || -z "$GHCR_PAT" ]]; then
  echo "GHCR_USER and GHCR_PAT must be set" >&2
  exit 1
fi

kind get clusters | grep -qx "$CLUSTER_NAME" || kind create cluster --name "$CLUSTER_NAME" --wait 5m
kubectl config use-context "kind-$CLUSTER_NAME"

for ns in "$NAMESPACE" monitoring argocd; do
  kubectl delete namespace "$ns" --ignore-not-found=true --wait=true --timeout=180s >/dev/null 2>&1 || true
  while kubectl get namespace "$ns" >/dev/null 2>&1; do
    echo "Waiting for namespace $ns to be removed..."
    sleep 2
  done
done

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

kubectl delete secret postgres-secret -n "$NAMESPACE" --ignore-not-found=true || true
kubectl label namespace "$NAMESPACE" app.kubernetes.io/managed-by=Helm --overwrite=true || true
kubectl annotate namespace "$NAMESPACE" meta.helm.sh/release-name=mlops-training meta.helm.sh/release-namespace="$NAMESPACE" --overwrite=true || true

docker build -t ghcr.io/amine12344/mlops-training-01/api:${IMAGE_TAG} -f api/Dockerfile ./api
docker build -t ghcr.io/amine12344/mlops-training-01/frontend:${IMAGE_TAG} -f frontend/Dockerfile ./frontend

echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker push ghcr.io/amine12344/mlops-training-01/api:${IMAGE_TAG}
docker push ghcr.io/amine12344/mlops-training-01/frontend:${IMAGE_TAG}

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update
helm repo update

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
kubectl wait --for=condition=available --timeout=600s deployment/kube-prometheus-stack-operator -n monitoring || true

cat > /tmp/mlops-kind-overrides.yaml <<EOF
global:
  imagePullPolicy: IfNotPresent
  imagePullSecrets: []
EOF

helm upgrade --install mlops-training helm/mlops-training -n "$NAMESPACE" \
  -f /tmp/mlops-kind-overrides.yaml \
  -f helm/mlops-training/envs/kind-values.yaml \
  --set api.image.tag=${IMAGE_TAG} \
  --set frontend.image.tag=${IMAGE_TAG}

kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=600s || true
kubectl wait --for=condition=ready pod -l app=api -n "$NAMESPACE" --timeout=600s || true
kubectl wait --for=condition=ready pod -l app=frontend -n "$NAMESPACE" --timeout=600s || true

kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f argocd/mlops-training-app.yaml

echo "Milestone 2 complete."
echo "Frontend: http://localhost:8080"
echo "API: http://localhost:8090/health"
echo "Argo CD: https://localhost:8443"
