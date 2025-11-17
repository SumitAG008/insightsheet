# PostgreSQL Backend Deployment for Global Multi-User Access

Deploy InsightSheet with PostgreSQL backend for handling users worldwide with subscriptions.

---

## 🌍 Architecture for Global Access

```
Users Worldwide (USA, India, Europe, etc.)
            ↓
  Frontend (CloudFront/Vercel) - CDN for fast global access
            ↓
  Backend API (AWS EC2 / Railway / Render)
            ↓
  PostgreSQL Database (AWS RDS / Supabase / Railway)
```

**Zero-Storage Principle:**
- ✅ User files processed **client-side only**
- ❌ NO file uploads to server
- ✅ Only auth, subscriptions stored in PostgreSQL
- ✅ Complete data privacy

---

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended) ⭐

**Best for:** Easy setup, free PostgreSQL, auto-scaling

**Deploy in 10 minutes:**

1. **Sign up:** https://railway.app

2. **Create PostgreSQL Database:**
   ```
   New Project → Database → PostgreSQL
   Railway auto-provisions PostgreSQL
   Connection string auto-added
   ```

3. **Deploy Backend:**
   ```
   New → GitHub Repo → Select insightsheet
   Root Directory: backend
   ```

4. **Environment Variables:**
   ```
   DATABASE_URL=(auto-filled by Railway)
   JWT_SECRET=your-secret-here
   FRONTEND_URL=https://meldra.ai
   STRIPE_SECRET_KEY=sk_live_...
   NODE_ENV=production
   ```

5. **Custom Domain:**
   ```
   Settings → Domains → Add: api.meldra.ai
   Add CNAME record at DNS provider
   ```

**Cost:**
- FREE: $5 credit/month (~500 hours)
- Paid: $5/month for more usage
- PostgreSQL: Included free

**Handles:**
- ✅ 1000+ concurrent users
- ✅ Auto-scaling
- ✅ Global CDN
- ✅ Built-in load balancing

---

### Option 2: Render + Supabase

**Backend on Render, Database on Supabase**

**Step 1: Supabase (PostgreSQL)**

1. Sign up: https://supabase.com
2. New Project → Create PostgreSQL database
3. Copy connection string

**Free tier:**
- 500MB database
- Unlimited API requests
- Auto backups

**Step 2: Render (Backend)**

1. Sign up: https://render.com
2. New Web Service → Connect GitHub
3. Settings:
   ```
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   Environment: Node
   ```

4. Environment Variables:
   ```
   DATABASE_URL=postgresql://[supabase-connection]
   JWT_SECRET=your-secret
   FRONTEND_URL=https://meldra.ai
   ```

5. Custom Domain: Add `api.meldra.ai`

**Cost:** FREE

**Handles:**
- ✅ Unlimited requests
- ✅ 750 hours/month free
- ✅ Auto-scaling
- ✅ Global deployment

---

### Option 3: AWS (Production-Grade)

**Best for:** High traffic, full control, enterprise

**Architecture:**
```
Route 53 (DNS) → CloudFront (CDN) → S3 (Frontend)
                                  ↓
Route 53 → Application Load Balancer → EC2 Auto Scaling Group (Backend)
                                        ↓
                                   RDS PostgreSQL (Multi-AZ)
```

**Step-by-Step:**

**1. RDS PostgreSQL:**
```bash
# AWS Console: RDS → Create Database

Engine: PostgreSQL 15
Template: Free tier (for testing) or Production
DB instance class: db.t3.micro (free) or db.t3.medium
Storage: 20GB SSD (free tier) or more
Multi-AZ: Yes (production)
Public access: No
VPC: Default or custom
```

**Connection string:**
```
postgresql://username:password@instance.region.rds.amazonaws.com:5432/insightsheet
```

**2. EC2 Backend:**
```bash
# Launch EC2 instance
AMI: Ubuntu 22.04
Instance type: t3.small
Security Group: Allow 443, 80, 22

# SSH and setup
ssh -i key.pem ubuntu@ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/SumitAG008/insightsheet.git
cd insightsheet/backend
npm install

# Create .env
nano .env
# DATABASE_URL=postgresql://...
# JWT_SECRET=...

# Start with PM2
pm2 start server.js --name insightsheet-api
pm2 save
pm2 startup
```

**3. Application Load Balancer:**
```bash
# AWS Console: EC2 → Load Balancers → Create

Type: Application Load Balancer
Scheme: Internet-facing
Listeners: HTTP (80), HTTPS (443)
Target Group: Point to EC2 instances
Health Check: /health endpoint
```

**4. Auto Scaling:**
```bash
# EC2 → Auto Scaling Groups → Create

Launch Template: From EC2 instance above
Min: 2 instances
Max: 10 instances
Desired: 2 instances
Scaling Policy: Target 70% CPU
```

**5. CloudFront:**
```bash
# For API
Origin: ALB DNS
Cache: No cache for API
SSL: ACM certificate for api.meldra.ai

# For Frontend
Origin: S3 bucket
Cache: Aggressive caching
SSL: ACM certificate for meldra.ai
```

**Cost (Monthly):**
- RDS t3.micro: FREE (1 year) → $15/month
- EC2 t3.small x2: ~$30/month
- ALB: ~$20/month
- CloudFront: ~$5/month
- **Total: ~$70/month** (or ~$15 after free tier)

**Handles:**
- ✅ 100,000+ concurrent users
- ✅ Auto-scaling to millions
- ✅ <50ms latency worldwide
- ✅ 99.99% uptime
- ✅ Multi-region ready

---

## 📊 Database Schema (PostgreSQL)

**Tables:**

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    features JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Activity table (for analytics)
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255),
    resource_id VARCHAR(255),
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_subscription_user ON subscriptions(user_id);
CREATE INDEX idx_activity_user_date ON user_activities(user_id, created_at DESC);
```

**No file storage tables!** Files processed client-side only.

---

## 🔐 Security Best Practices

### Environment Variables

```bash
# .env (NEVER commit to git!)
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=super-secret-64-chars-minimum
STRIPE_SECRET_KEY=sk_live_...
FRONTEND_URL=https://meldra.ai
NODE_ENV=production

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=https://meldra.ai,https://www.meldra.ai
```

### Database Security

```sql
-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Create app user with limited permissions
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
```

### Connection Pooling

```javascript
// backend/config/database-postgres.js
pool: {
  max: 20,        // Maximum connections
  min: 5,         // Minimum connections
  acquire: 30000, // Max time to get connection
  idle: 10000     // Max idle time
}
```

---

## 🌍 Global Performance Optimization

### 1. CDN for Frontend

**CloudFront (AWS):**
```bash
# Cache static assets aggressively
Cache-Control: public, max-age=31536000, immutable

# For HTML
Cache-Control: public, max-age=0, must-revalidate
```

**Vercel/Netlify:**
- Auto CDN enabled
- Edge caching worldwide
- <100ms response time

### 2. Database Replication

**Read Replicas (for high traffic):**
```bash
# AWS RDS: Create Read Replica
Primary: us-east-1 (writes)
Replica 1: eu-west-1 (reads for Europe)
Replica 2: ap-southeast-1 (reads for Asia)

# In backend code:
const writeDB = new Sequelize(process.env.DATABASE_URL);
const readDB = new Sequelize(process.env.READ_REPLICA_URL);

// Use read replica for queries
User.findAll({ replication: 'read' });
```

### 3. Connection Pooling

```javascript
// Optimize for concurrent connections
pool: {
  max: Math.ceil(CPU_CORES * 2),
  min: CPU_CORES,
  acquire: 30000,
  idle: 10000
}
```

### 4. Caching Layer

**Redis for session/cache:**
```bash
# Add Redis for frequently accessed data
npm install ioredis

# Cache user subscriptions
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Cache for 1 hour
await redis.setex(`user:${userId}:subscription`, 3600, JSON.stringify(subscription));
```

---

## 📊 Handling High Load

### For 10,000+ Concurrent Users:

**Backend:**
- Auto Scaling Group: 5-20 EC2 instances
- Load Balancer: Application LB with health checks
- Database: RDS with read replicas
- Cache: Redis cluster
- CDN: CloudFront

**Database Optimization:**
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_user_email ON users(email);
CREATE INDEX CONCURRENTLY idx_subscription_status ON subscriptions(status, current_period_end);
CREATE INDEX CONCURRENTLY idx_activity_recent ON user_activities(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';
```

### Monitoring

**CloudWatch Alarms (AWS):**
```bash
- CPU > 70% → Scale up
- Database connections > 80% → Alert
- API latency > 500ms → Alert
- Error rate > 1% → Alert
```

**Application Monitoring:**
- New Relic / Datadog
- Track API response times
- Database query performance
- User session tracking

---

## 💰 Cost Scaling Guide

### For Different User Loads:

| Users | Frontend | Backend | Database | Total/Month |
|-------|----------|---------|----------|-------------|
| **0-1K** | Vercel FREE | Railway FREE | Railway FREE | **$0** |
| **1K-10K** | Vercel FREE | Railway $5 | Railway $5 | **$10** |
| **10K-50K** | Vercel $20 | Render $25 | Supabase $25 | **$70** |
| **50K-100K** | CloudFront $10 | EC2 x2 $30 | RDS $50 | **$90** |
| **100K+** | CloudFront $20 | EC2 AS $100+ | RDS Replica $150 | **$270+** |

**Key Point:** Start FREE, scale as you grow!

---

## ✅ Deployment Checklist

**Before going live:**

- [ ] Frontend deployed to CDN
- [ ] Backend API deployed
- [ ] PostgreSQL database provisioned
- [ ] SSL certificates installed
- [ ] Custom domain configured (meldra.ai)
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Health check endpoint works
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Error logging setup
- [ ] Monitoring/alerts configured
- [ ] Backup strategy in place
- [ ] Test from multiple countries
- [ ] Load testing completed
- [ ] Security audit done

---

## 🧪 Testing Global Access

### Test from Multiple Locations:

**Tools:**
- https://www.webpagetest.org (test from 40+ locations)
- https://tools.pingdom.com (global speed test)
- https://loader.io (load testing)

**Expected Performance:**
- North America: <100ms
- Europe: <150ms
- Asia: <200ms
- Everywhere else: <300ms

### Load Testing

```bash
# Install Artillery
npm install -g artillery

# Create test file: load-test.yml
artillery run load-test.yml

# Test with 1000 concurrent users
artillery quick --count 1000 --num 10 https://api.meldra.ai/health
```

---

## 🚀 CI/CD Pipeline

**GitHub Actions auto-deploy:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install && npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

**Your PostgreSQL backend is ready for global scale! 🌍**

Choose your deployment option and go live with multi-user support worldwide.
