# 🚀 CI/CD & Kubernetes Deployment Guide

## 📋 Table of Contents
1. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🔄 CI/CD Pipeline Setup

### Overview
The CI/CD pipeline uses **GitHub Actions** to:
- Run tests (backend & frontend)
- Build Docker images
- Push to GitHub Container Registry
- Deploy to Kubernetes automatically

### Pipeline Stages

1. **Backend Tests** - Runs Python tests with PostgreSQL
2. **Frontend Tests** - Runs linting and builds frontend
3. **Build & Push** - Creates Docker images and pushes to registry
4. **Deploy** - Updates Kubernetes deployments

### Files Created
- `.github/workflows/ci-cd.yml` - Main CI/CD pipeline
- `Dockerfile.frontend` - Frontend Docker image
- `nginx.conf` - Nginx configuration for frontend

---

## ☸️ Kubernetes Deployment

### Architecture

```
┌─────────────────┐
│   Ingress       │ (nginx-ingress)
│   (meldra.ai)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│Frontend│ │Backend│
│  (2)   │ │  (3)  │
└────────┘ └───────┘
              │
         ┌────▼────┐
         │PostgreSQL│
         │ (Neon)   │
         └──────────┘
```

### Kubernetes Manifests

All manifests are in the `k8s/` directory:

1. **namespace.yaml** - Creates `insightsheet` namespace
2. **configmap.yaml** - Non-sensitive configuration
3. **secrets.yaml** - Sensitive data (API keys, passwords)
4. **backend-deployment.yaml** - Backend service (3 replicas)
5. **frontend-deployment.yaml** - Frontend service (2 replicas)
6. **ingress.yaml** - Routes traffic to services

---

## 📦 Prerequisites

### 1. Kubernetes Cluster
- **Option A**: Cloud Provider (GKE, EKS, AKS)
- **Option B**: Local (Minikube, Kind, Docker Desktop)
- **Option C**: Managed (DigitalOcean, Linode)

### 2. Required Tools
```bash
# Install kubectl
# Windows: choco install kubernetes-cli
# Mac: brew install kubectl
# Linux: apt-get install kubectl

# Install Helm (for cert-manager)
# Windows: choco install kubernetes-helm
# Mac: brew install helm
# Linux: curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Docker (for building images)
```

### 3. GitHub Secrets
Set these in your GitHub repository settings (Settings → Secrets):

- `KUBECONFIG` - Base64 encoded kubeconfig file
- `VITE_API_URL` - Frontend API URL (e.g., `https://api.meldra.ai`)

---

## 🛠️ Step-by-Step Setup

### Step 1: Set Up Kubernetes Cluster

#### For Google Cloud (GKE):
```bash
# Create cluster
gcloud container clusters create insightsheet-cluster \
  --num-nodes=3 \
  --zone=us-central1-a \
  --machine-type=n1-standard-2

# Get credentials
gcloud container clusters get-credentials insightsheet-cluster --zone=us-central1-a
```

#### For AWS (EKS):
```bash
# Create cluster
eksctl create cluster \
  --name insightsheet-cluster \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3

# Get credentials (automatic with eksctl)
```

#### For Local (Minikube):
```bash
# Start Minikube
minikube start --cpus=4 --memory=8192

# Enable ingress
minikube addons enable ingress
```

### Step 2: Install Ingress Controller

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Wait for it to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### Step 3: Install Cert-Manager (for SSL)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for it to be ready
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=90s

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Step 4: Deploy Application

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (UPDATE VALUES FIRST!)
kubectl apply -f k8s/secrets.yaml

# Create configmap
kubectl apply -f k8s/configmap.yaml

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

### Step 5: Verify Deployment

```bash
# Check pods
kubectl get pods -n insightsheet

# Check services
kubectl get svc -n insightsheet

# Check ingress
kubectl get ingress -n insightsheet

# View logs
kubectl logs -f deployment/insightsheet-backend -n insightsheet
kubectl logs -f deployment/insightsheet-frontend -n insightsheet
```

### Step 6: Set Up GitHub Actions

1. **Get Kubeconfig**:
```bash
# For GKE
gcloud container clusters get-credentials insightsheet-cluster --zone=us-central1-a

# Export and encode
cat ~/.kube/config | base64 -w 0  # Linux/Mac
cat ~/.kube/config | base64       # Windows (PowerShell)
```

2. **Add GitHub Secrets**:
   - Go to: `Settings → Secrets and variables → Actions`
   - Add `KUBECONFIG` secret with the base64 encoded value
   - Add `VITE_API_URL` secret with your API URL

3. **Update Workflow**:
   - Edit `.github/workflows/ci-cd.yml`
   - Update `REGISTRY` and `IMAGE_NAME` if needed
   - Update namespace in deploy step if different

---

## 🔍 Monitoring & Maintenance

### View Logs
```bash
# Backend logs
kubectl logs -f deployment/insightsheet-backend -n insightsheet

# Frontend logs
kubectl logs -f deployment/insightsheet-frontend -n insightsheet

# All pods
kubectl logs -f -l app=insightsheet-backend -n insightsheet
```

### Scale Services
```bash
# Scale backend
kubectl scale deployment insightsheet-backend --replicas=5 -n insightsheet

# Scale frontend
kubectl scale deployment insightsheet-frontend --replicas=3 -n insightsheet
```

### Update Deployment
```bash
# Manual update
kubectl set image deployment/insightsheet-backend \
  backend=ghcr.io/your-org/insightsheet-backend:new-tag \
  -n insightsheet

# Or let CI/CD handle it automatically
```

### Rollback
```bash
# View rollout history
kubectl rollout history deployment/insightsheet-backend -n insightsheet

# Rollback to previous version
kubectl rollout undo deployment/insightsheet-backend -n insightsheet
```

### Health Checks
```bash
# Check pod status
kubectl get pods -n insightsheet

# Describe pod (if issues)
kubectl describe pod <pod-name> -n insightsheet

# Check events
kubectl get events -n insightsheet --sort-by='.lastTimestamp'
```

---

## 🔐 Security Best Practices

1. **Secrets Management**:
   - Use Kubernetes Secrets (not ConfigMaps)
   - Rotate secrets regularly
   - Consider using external secret managers (AWS Secrets Manager, HashiCorp Vault)

2. **Network Policies**:
   - Restrict pod-to-pod communication
   - Only allow necessary ingress/egress

3. **Resource Limits**:
   - Set CPU/memory limits (already in manifests)
   - Monitor resource usage

4. **Image Security**:
   - Scan Docker images for vulnerabilities
   - Use private registries
   - Pin image tags (avoid `latest`)

---

## 📊 Cost Optimization

1. **Right-size Resources**:
   - Adjust CPU/memory requests/limits based on actual usage
   - Use horizontal pod autoscaling (HPA)

2. **Auto-scaling**:
```bash
# Install metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Create HPA
kubectl autoscale deployment insightsheet-backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n insightsheet
```

3. **Use Spot Instances** (for non-critical workloads)

---

## 🐛 Troubleshooting

### Pods Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n insightsheet

# Common issues:
# - Image pull errors → Check image name/tag
# - Resource limits → Increase limits
# - ConfigMap/Secret missing → Apply them
```

### Ingress Not Working
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress status
kubectl describe ingress insightsheet-ingress -n insightsheet

# Test from inside cluster
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
```

### Database Connection Issues
```bash
# Check backend logs
kubectl logs deployment/insightsheet-backend -n insightsheet

# Verify DATABASE_URL in secrets
kubectl get secret insightsheet-secrets -n insightsheet -o jsonpath='{.data.DATABASE_URL}' | base64 -d
```

---

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Cert-Manager Documentation](https://cert-manager.io/docs/)

---

## ✅ Checklist

- [ ] Kubernetes cluster created
- [ ] Ingress controller installed
- [ ] Cert-manager installed (for SSL)
- [ ] Secrets updated in `k8s/secrets.yaml`
- [ ] ConfigMap updated in `k8s/configmap.yaml`
- [ ] All manifests applied
- [ ] Pods running successfully
- [ ] Ingress configured and accessible
- [ ] GitHub Actions secrets configured
- [ ] CI/CD pipeline tested
- [ ] Monitoring set up
- [ ] Backup strategy in place

---

**Need Help?** Check the logs, describe resources, and verify all secrets/configmaps are correctly set.
