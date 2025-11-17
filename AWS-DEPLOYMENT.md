# AWS Deployment Guide for meldra.ai

Complete guide to deploy InsightSheet on AWS infrastructure.

---

## 🏗️ AWS Architecture

```
┌─────────────────────────────────────────────┐
│  CloudFront (CDN) → meldra.ai               │
│  SSL Certificate (ACM)                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  S3 Bucket (Frontend) - React App           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  API Gateway → api.meldra.ai                │
│  SSL Certificate (ACM)                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Lambda or EC2 (Backend) - Node.js API      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  DocumentDB or Atlas (MongoDB)              │
└─────────────────────────────────────────────┘
```

---

## 📦 Part 1: Deploy Frontend to S3 + CloudFront

### Step 1: Create S3 Bucket

```bash
# AWS Console or CLI
aws s3api create-bucket \
  --bucket meldra-frontend \
  --region us-east-1

# Enable static website hosting
aws s3 website s3://meldra-frontend/ \
  --index-document index.html \
  --error-document index.html
```

### Step 2: Build Frontend

```bash
cd C:\Users\sumit\Documents\Insightlite

# Create production environment file
echo VITE_API_URL=https://api.meldra.ai/api > .env.production

# Build
npm run build
```

### Step 3: Upload to S3

**Option A: AWS Console**
1. Go to S3 Console
2. Open `meldra-frontend` bucket
3. Upload entire `dist/` folder
4. Set permissions: Public read access

**Option B: AWS CLI**
```bash
# Sync dist folder to S3
aws s3 sync dist/ s3://meldra-frontend/ --delete

# Make files public
aws s3 ls s3://meldra-frontend --recursive | awk '{print $4}' | xargs -I {} aws s3api put-object-acl --bucket meldra-frontend --key {} --acl public-read
```

### Step 4: Create CloudFront Distribution

```bash
# Via AWS Console:
# CloudFront > Create Distribution

# Settings:
Origin Domain: meldra-frontend.s3.amazonaws.com
Origin Path: (leave empty)
Viewer Protocol Policy: Redirect HTTP to HTTPS
Allowed HTTP Methods: GET, HEAD, OPTIONS
Cache Policy: CachingOptimized
Alternate Domain Names (CNAMEs): meldra.ai, www.meldra.ai
SSL Certificate: Request certificate from ACM
```

**Request SSL Certificate (ACM)**
1. AWS Certificate Manager → Request Certificate
2. Domain names: `meldra.ai`, `*.meldra.ai`
3. Validation: DNS validation
4. Add CNAME records to your domain's DNS
5. Wait for validation (~5-30 minutes)

### Step 5: Configure DNS

**At your domain registrar (GoDaddy/Namecheap/Cloudflare):**

```
Type: A (Alias)
Name: @
Value: [CloudFront Distribution URL]

Type: A (Alias)
Name: www
Value: [CloudFront Distribution URL]
```

**Cost:** $0-5/month (mostly free tier eligible)

---

## 🚀 Part 2: Deploy Backend to Lambda (Serverless)

### Option A: Lambda + API Gateway (Recommended for Low Traffic)

**Step 1: Prepare Backend for Lambda**

Create `backend/lambda.js`:
```javascript
const serverless = require('serverless-http');
const app = require('./server');

module.exports.handler = serverless(app);
```

Update `backend/package.json`:
```json
{
  "dependencies": {
    "serverless-http": "^3.2.0",
    ...existing dependencies
  }
}
```

**Step 2: Install Serverless Framework**

```bash
npm install -g serverless

cd backend

# Create serverless.yml
```

Create `backend/serverless.yml`:
```yaml
service: insightsheet-api

provider:
  name: aws
  runtime: nodejs18.x
  stage: prod
  region: us-east-1
  environment:
    NODE_ENV: production
    MONGODB_URI: ${env:MONGODB_URI}
    JWT_SECRET: ${env:JWT_SECRET}
    FRONTEND_URL: https://meldra.ai

functions:
  api:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true

plugins:
  - serverless-offline
```

**Step 3: Deploy**

```bash
cd backend

# Set environment variables
export MONGODB_URI="your-mongodb-connection-string"
export JWT_SECRET="your-jwt-secret"

# Deploy
serverless deploy
```

**Step 4: Custom Domain (api.meldra.ai)**

```bash
# Install domain plugin
serverless plugin install -n serverless-domain-manager

# Add to serverless.yml:
customDomain:
  domainName: api.meldra.ai
  certificateName: '*.meldra.ai'
  basePath: 'api'
  stage: prod
  createRoute53Record: true

# Create domain
serverless create_domain

# Deploy
serverless deploy
```

**Cost:** FREE tier: 1M requests/month, then $0.20 per 1M requests

---

### Option B: EC2 Instance (Full Control)

**Step 1: Launch EC2 Instance**

```bash
# AWS Console:
# EC2 > Launch Instance

# Settings:
AMI: Ubuntu Server 22.04 LTS
Instance Type: t3.micro (free tier) or t3.small
Security Group: Allow HTTP (80), HTTPS (443), SSH (22)
Key Pair: Create/select for SSH access
```

**Step 2: Connect and Setup**

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

**Step 3: Deploy Backend**

```bash
# Clone repository
git clone https://github.com/SumitAG008/insightsheet.git
cd insightsheet/backend

# Install dependencies
npm install

# Create .env
nano .env
# Add your environment variables

# Start with PM2
pm2 start server.js --name insightsheet-api
pm2 save
pm2 startup
```

**Step 4: Configure Nginx**

```bash
sudo nano /etc/nginx/sites-available/api.meldra.ai
```

Add:
```nginx
server {
    listen 80;
    server_name api.meldra.ai;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/api.meldra.ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 5: SSL Certificate (Let's Encrypt)**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.meldra.ai

# Auto-renewal (already set up)
```

**Step 6: Configure DNS**

Point `api.meldra.ai` to your EC2 IP:
```
Type: A
Name: api
Value: [EC2 Public IP]
```

**Cost:**
- t3.micro: FREE (750 hours/month for 12 months)
- t3.small: ~$15/month

---

## 🗄️ Part 3: Database Options

### Option A: MongoDB Atlas (Recommended)

**Free Tier: 512MB**

```bash
# Sign up at mongodb.com/cloud/atlas

# Create cluster:
# 1. Select AWS
# 2. Region: us-east-1 (same as your app)
# 3. Tier: M0 (Free)
# 4. Cluster name: insightsheet

# Get connection string:
mongodb+srv://username:password@cluster.mongodb.net/insightsheet

# Update backend .env:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/insightsheet
```

**Cost:** FREE → $9/month (M10 tier for production)

---

### Option B: DocumentDB (AWS Native)

```bash
# AWS Console: DocumentDB > Create Cluster

# Settings:
Instance Class: db.t3.medium
Number of instances: 1
VPC: Same as EC2 (if using EC2)

# Cost: ~$50/month (no free tier)
```

---

### Option C: Self-Hosted MongoDB on EC2

```bash
# On EC2 instance
sudo apt install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Connection string
MONGODB_URI=mongodb://localhost:27017/insightsheet
```

**Cost:** Included in EC2 costs

---

## 📱 Part 4: Update Mobile Apps

After deployment, update mobile app configuration:

**Edit `mobile/capacitor.config.ts`:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.meldra.insightsheet',
  appName: 'InsightSheet',
  webDir: '../dist',
  server: {
    url: 'https://meldra.ai',  // Your CloudFront domain
    androidScheme: 'https',
    iosScheme: 'https'
  }
};
```

**Rebuild:**
```bash
cd mobile
npm run build:web
npx cap sync android
cd android
gradlew assembleRelease
```

---

## 💰 Cost Summary

| Service | Free Tier | Paid | Monthly Cost |
|---------|-----------|------|--------------|
| **S3** | 5GB storage | $0.023/GB | ~$1-2 |
| **CloudFront** | 50GB/month | $0.085/GB | ~$5-10 |
| **Lambda** | 1M requests | $0.20/1M requests | $0-5 |
| **EC2 t3.micro** | 750 hrs (1 year) | $0.0104/hr | ~$8 or FREE |
| **MongoDB Atlas** | 512MB | $9-25 | FREE or $9 |
| **Route 53** | - | $0.50/zone | $0.50 |
| **ACM SSL** | FREE | FREE | FREE |
| **TOTAL** | | | **$0-30/month** |

---

## 🔧 Deployment Commands Summary

### Frontend (S3 + CloudFront)
```bash
# Build
cd C:\Users\sumit\Documents\Insightlite
npm run build

# Upload
aws s3 sync dist/ s3://meldra-frontend/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Backend (Lambda)
```bash
cd backend
serverless deploy
```

### Backend (EC2)
```bash
# SSH and update
ssh -i key.pem ubuntu@your-ec2-ip
cd insightsheet/backend
git pull
npm install
pm2 restart insightsheet-api
```

---

## 🔒 Security Checklist

- [ ] Enable CloudFront HTTPS only
- [ ] Restrict S3 bucket access (CloudFront only)
- [ ] Set proper CORS headers
- [ ] Enable WAF (Web Application Firewall) on CloudFront
- [ ] Use Secrets Manager for sensitive env vars
- [ ] Enable CloudWatch logs
- [ ] Set up AWS Backup for MongoDB
- [ ] Enable MFA for AWS account
- [ ] Use IAM roles (not root access keys)
- [ ] Enable VPC for EC2/DocumentDB

---

## 📊 Monitoring

**CloudWatch Alarms:**
```bash
# Create alarms for:
- High CPU usage (EC2)
- High error rates (Lambda)
- CloudFront 4xx/5xx errors
- Database connections
```

**Logging:**
```bash
# Lambda logs automatically in CloudWatch
# EC2: Install CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

---

## 🚀 CI/CD Pipeline (Optional)

**GitHub Actions for auto-deploy:**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Build Frontend
        run: |
          npm install
          npm run build

      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --delete
        env:
          AWS_S3_BUCKET: meldra-frontend
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: 'dist'

      - name: Invalidate CloudFront
        uses: chetan/invalidate-cloudfront-action@master
        env:
          DISTRIBUTION: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
          PATHS: '/*'
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 🆘 Troubleshooting

### CloudFront shows 403/404
- Check S3 bucket policy allows CloudFront access
- Verify index.html exists in S3
- Check CloudFront origin settings

### API Gateway timeout
- Lambda timeout set too low (increase to 30s)
- Cold start issues (use provisioned concurrency)
- Database connection slow

### CORS errors
- Add CORS headers in API response
- Check CloudFront allows OPTIONS method
- Verify FRONTEND_URL matches exactly

### SSL certificate not working
- DNS validation incomplete
- Wrong region (use us-east-1 for CloudFront)
- Certificate not attached to CloudFront

---

## ✅ Post-Deployment Checklist

- [ ] https://meldra.ai loads correctly
- [ ] https://api.meldra.ai/health returns OK
- [ ] SSL certificate shows green lock
- [ ] User registration works
- [ ] User login works
- [ ] File upload works
- [ ] Mobile apps connect successfully
- [ ] CloudWatch logs are working
- [ ] Database backups configured
- [ ] DNS propagated (24-48 hours)

---

**Your app is now on AWS! 🎉**

For scaling: Upgrade to larger EC2 instances, use Auto Scaling Groups, add RDS/DocumentDB replicas, enable CloudFront caching.
