# Kubernetes deployment manifests

Reference manifests for deploying SEM to any conformant Kubernetes
cluster (EKS, GKE, AKS, k3s, etc.). Not opinionated about which cloud
runs them.

## Apply order

```bash
kubectl create namespace sem
kubectl -n sem apply -f 00-configmap.yaml
kubectl -n sem apply -f 01-secrets.example.yaml   # replace with your own
kubectl -n sem apply -f 10-backend-deployment.yaml
kubectl -n sem apply -f 11-backend-service.yaml
kubectl -n sem apply -f 12-backend-hpa.yaml
kubectl -n sem apply -f 20-frontend-deployment.yaml
kubectl -n sem apply -f 21-frontend-service.yaml
kubectl -n sem apply -f 22-frontend-hpa.yaml
kubectl -n sem apply -f 30-ingress.yaml
kubectl -n sem apply -f 40-pdb.yaml
```

## What's not included

- **Postgres / Redis / Elasticsearch** — use managed services in
  production (RDS/Cloud SQL, ElastiCache/Memorystore, Opensearch or
  Elastic Cloud). Point the app at them via the Secret in
  `01-secrets.example.yaml`.
- **Cert-manager / Let's Encrypt** — the Ingress assumes cert-manager
  is already installed and referenced by the annotation. Adjust for
  your cluster.
- **Image registry** — the Deployments reference `sem-backend:latest`
  and `sem-frontend:latest`. Retag to your registry (e.g.
  `ghcr.io/org/sem-backend:v5.5.0`) before applying.

## Autoscaling

Both backend and frontend HPAs scale between 2 and 10 replicas based
on CPU (default 70 %) and memory (default 80 %) utilisation. The
backend HPA also includes a request-rate custom metric block that's
commented out — enable it once you install a metrics adapter like
`prometheus-adapter` or `keda`.
