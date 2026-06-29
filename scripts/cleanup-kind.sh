#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME=${CLUSTER_NAME:-mlops-training}

echo "Cleaning deployed resources for cluster $CLUSTER_NAME..."

if command -v helm >/dev/null 2>&1; then
  helm uninstall mlops-training -n mlops-training --ignore-not-found >/dev/null 2>&1 || true
  helm uninstall kube-prometheus-stack -n monitoring --ignore-not-found >/dev/null 2>&1 || true
fi

if command -v kubectl >/dev/null 2>&1; then
  kubectl delete namespace mlops-training --ignore-not-found=true --wait=false >/dev/null 2>&1 || true
  kubectl delete namespace monitoring --ignore-not-found=true --wait=false >/dev/null 2>&1 || true
  kubectl delete namespace argocd --ignore-not-found=true --wait=false >/dev/null 2>&1 || true
  kubectl config unset current-context >/dev/null 2>&1 || true
fi

if command -v kind >/dev/null 2>&1; then
  kind delete cluster --name "$CLUSTER_NAME" >/dev/null 2>&1 || true
fi

# if command -v docker >/dev/null 2>&1; then
#   docker image rm ghcr.io/amine12344/mlops-training-01/api:dev >/dev/null 2>&1 || true
#   docker image rm ghcr.io/amine12344/mlops-training-01/frontend:dev >/dev/null 2>&1 || true
#   docker image rm mlops-training-api:latest >/dev/null 2>&1 || true
#   docker image rm mlops-training-frontend:latest >/dev/null 2>&1 || true
# fi

echo "Cleanup complete."
if command -v kind >/dev/null 2>&1; then
  echo "Remaining kind clusters:"
  kind get clusters || true
fi
