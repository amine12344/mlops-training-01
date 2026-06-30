#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME=${CLUSTER_NAME:-mlops-training}
NAMESPACE=mlops-training

kind get clusters | grep -qx "$CLUSTER_NAME" || kind create cluster --name "$CLUSTER_NAME" --wait 5m
kubectl config use-context "kind-$CLUSTER_NAME"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

docker build -t mlops-training-api:latest -f api/Dockerfile ./api
docker build -t mlops-training-frontend:latest -f frontend/Dockerfile ./frontend
kind load docker-image mlops-training-api:latest --name "$CLUSTER_NAME"
kind load docker-image mlops-training-frontend:latest --name "$CLUSTER_NAME"

kubectl apply -f k8s/manual/

kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=600s || true
kubectl wait --for=condition=ready pod -l app=api -n "$NAMESPACE" --timeout=600s || true
kubectl wait --for=condition=ready pod -l app=frontend -n "$NAMESPACE" --timeout=600s || true

echo "Milestone 1 complete."
echo "Frontend: http://localhost:8080"
echo "API: http://localhost:8090/health"
