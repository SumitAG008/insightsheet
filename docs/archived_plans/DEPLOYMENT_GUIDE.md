# Deploying InsightSheet-lite to meldra.ai 🚀

## 🎯 Goal

Deploy your complete application to **meldra.ai** domain:
- **Frontend**: https://insightsheet.meldra.ai (or https://meldra.ai)
- **Backend**: https://api.meldra.ai (or a subdomain of your choice)

## 📋 Prerequisites

1. ✅ Domain **meldra.ai** registered on GoDaddy
2. ✅ Backend code (Python FastAPI)
3. ✅ Frontend code (React + Vite)
4. ✅ Neon PostgreSQL database (already configured)
5. ✅ OpenAI API key

## 🏗️ Deployment Architecture

```
                                meldra.ai Domain (GoDaddy)
                                         |
                    _____________________|______________________
                   |                                            |
        Frontend (React)                            Backend (Python FastAPI)
    https://insightsheet.meldra.ai                https://api.meldra.ai
              or                                          or
         https://meldra.ai                    https://backend.meldra.ai
                   |                                            |
                   |                                            |
        Deployed on:                                  Deployed on:
        - Vercel (Recommended)                       - Railway (Recommended)
        - Netlify                                    - Render
        - Base44 (can keep)                          - Heroku
        - Cloudflare Pages                           - DigitalOcean
```

## 🚀 Option 1: Quick Deploy (Recommended)

### Backend: Deploy to Railway

**Railway** is the easiest and best option for Python backends.

#### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Verify your account

#### Step 2: Deploy Backend

```bash
# In your project root
cd backend

# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize new project
railway init

# Add PostgreSQL (or use your Neon database)
# Skip if using Neon - we already have it configured

# Set environment variables in Railway dashboard:
# - OPENAI_API_KEY=sk-your-key
# - DATABASE_URL=your-neon-postgres-url
# - JWT_SECRET_KEY=your-secret-key
# - CORS_ORIGINS=https://insightsheet.meldra.ai,https://meldra.ai

# Deploy
railway up
```

#### Step 3: Get Railway URL

After deployment, Railway will give you a URL like:
```
https://your-backend-abc123.railway.app
```

#### Step 4: Add Custom Domain in Railway

1. Go to Railway dashboard
2. Click on your backend service
3. Go to "Settings" → "Domains"
4. Click "Add Domain"
5. Enter: **api.meldra.ai** (or backend.meldra.ai)
6. Railway will give you DNS records to add

#### Step 5: Update GoDaddy DNS

1. Login to GoDaddy
2. Go to your domain **meldra.ai**
3. Click "DNS" → "Manage DNS"
4. Add CNAME record:
   - **Type**: CNAME
   - **Name**: api (or backend)
   - **Value**: [Railway provides this]
   - **TTL**: 1 hour

Wait 10-60 minutes for DNS propagation.

Your backend will be at: **https://api.meldra.ai** ✅

### Frontend: Deploy to Vercel

**Vercel** is perfect for React apps and has the best performance.

#### Step 1: Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub
3. Connect your repository

#### Step 2: Deploy Frontend

```bash
# In your project root (not in backend folder)
cd ..  # Go back to root if you're in backend/

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# When prompted:
# - Set up and deploy: Yes
# - Scope: Your account
# - Link to existing project: No
# - Project name: insightsheet
# - Directory: ./ (or leave default)
# - Override settings: No
```

#### Step 3: Set Environment Variables in Vercel

Go to Vercel dashboard → Your project → Settings → Environment Variables

Add:
```env
VITE_API_URL=https://api.meldra.ai
VITE_APP_NAME=InsightSheet-lite
VITE_APP_DOMAIN=meldra.ai
```

#### Step 4: Redeploy with Environment Variables

```bash
vercel --prod
```

#### Step 5: Add Custom Domain in Vercel

1. Go to Vercel dashboard
2. Click your project → Settings → Domains
3. Add domain: **insightsheet.meldra.ai** (or just **meldra.ai**)
4. Vercel will provide DNS records

#### Step 6: Update GoDaddy DNS

Add records in GoDaddy:

For **insightsheet.meldra.ai**:
- **Type**: CNAME
- **Name**: insightsheet
- **Value**: cname.vercel-dns.com
- **TTL**: 1 hour

For root domain **meldra.ai** (if you want):
- **Type**: A
- **Name**: @
- **Value**: 76.76.21.21
- **TTL**: 1 hour

Wait 10-60 minutes for DNS propagation.

Your frontend will be at: **https://insightsheet.meldra.ai** ✅

---

## 🚀 Option 2: All-in-One Deploy (Railway for Both)

Deploy both frontend and backend on Railway:

### Step 1: Deploy Backend (same as above)

### Step 2: Deploy Frontend on Railway

```bash
# In project root (not backend/)
railway init

# Railway will detect your Vite app
# Set environment variables:
# - VITE_API_URL=https://api.meldra.ai

railway up
```

Add custom domains in Railway:
- Backend: **api.meldra.ai**
- Frontend: **insightsheet.meldra.ai** or **meldra.ai**

---

## 🚀 Option 3: Keep Base44 Frontend + Railway Backend

If you want to keep your frontend on Base44:

### Step 1: Deploy Backend to Railway

Follow Railway deployment steps above.

Backend URL: **https://api.meldra.ai**

### Step 2: Update Base44 Frontend

In your Base44 project:

1. Update environment variable:
   ```env
   VITE_API_URL=https://api.meldra.ai
   ```

2. Push to Base44:
   ```bash
   # Your existing Base44 deployment process
   git push base44 main
   ```

3. Your frontend stays at: **https://insightsheet.meldra.ai**

4. Update CORS in backend `.env`:
   ```env
   CORS_ORIGINS=https://insightsheet.meldra.ai,https://meldra.ai
   ```

---

## 🔧 Complete DNS Setup for GoDaddy

### Recommended DNS Configuration

#### Option A: Frontend on Root Domain

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 (Vercel) | 1 hour |
| CNAME | www | cname.vercel-dns.com | 1 hour |
| CNAME | api | [Railway URL] | 1 hour |

Result:
- **https://meldra.ai** → Frontend
- **https://www.meldra.ai** → Frontend
- **https://api.meldra.ai** → Backend

#### Option B: Frontend on Subdomain

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | insightsheet | cname.vercel-dns.com | 1 hour |
| CNAME | api | [Railway URL] | 1 hour |

Result:
- **https://insightsheet.meldra.ai** → Frontend
- **https://api.meldra.ai** → Backend

---

## 🔒 Update Backend CORS

After deploying, update your backend `.env` on Railway:

```env
CORS_ORIGINS=https://meldra.ai,https://www.meldra.ai,https://insightsheet.meldra.ai,https://api.meldra.ai
```

Or in `backend/app/main.py`, update CORS middleware:

```python
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS + ["https://meldra.ai", "https://*.meldra.ai", "https://insightsheet.meldra.ai"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ✅ Post-Deployment Checklist

### Test Backend

```bash
# Health check
curl https://api.meldra.ai/health

# Should return:
{
  "status": "healthy",
  "service": "InsightSheet-lite Backend",
  "version": "1.0.0"
}
```

### Test Frontend

1. Visit **https://insightsheet.meldra.ai** (or meldra.ai)
2. Register a new account
3. Login
4. Test features:
   - Upload Excel → Convert to PPT
   - Upload ZIP → Clean filenames
   - Ask AI a question

### Test Integration

1. Open browser console (F12)
2. Network tab
3. Upload a file
4. Check requests go to `api.meldra.ai`
5. Should see successful responses

---

## 🐛 Troubleshooting

### DNS Not Working?

```bash
# Check DNS propagation
nslookup api.meldra.ai
nslookup insightsheet.meldra.ai

# Or use online tool:
# https://www.whatsmydns.net/
```

Wait 10-60 minutes for DNS to propagate globally.

### CORS Errors?

1. Check backend `.env` has correct CORS_ORIGINS
2. Redeploy backend: `railway up` or redeploy in Railway dashboard
3. Clear browser cache
4. Try in incognito mode

### Backend Not Starting?

1. Check Railway logs:
   - Go to Railway dashboard
   - Click your service
   - View "Deployments" → Latest deployment → Logs

2. Check environment variables are set
3. Check database connection string

### Frontend Not Loading Backend?

1. Check `.env` in frontend:
   ```env
   VITE_API_URL=https://api.meldra.ai
   ```

2. Redeploy frontend: `vercel --prod`
3. Check browser console for errors
4. Make sure backend is running: `curl https://api.meldra.ai/health`

---

## 💰 Cost Estimate

### Free Tier (Recommended for Testing)

- **Railway**: $5 credit/month (enough for small apps)
- **Vercel**: Unlimited free tier for personal projects
- **Neon PostgreSQL**: Free tier (0.5GB storage)
- **GoDaddy Domain**: ~$12/year (you already have this)

**Total**: ~$1-2/month (or free with credits)

### Production Tier (If Needed)

- **Railway**: ~$5-20/month (based on usage)
- **Vercel**: Free (or $20/month for pro)
- **Neon PostgreSQL**: Free tier or ~$19/month for pro

**Total**: ~$5-40/month

---

## 🚀 Quick Start Commands

### Deploy Backend to Railway

```bash
cd backend
npm install -g @railway/cli
railway login
railway init
railway up

# Set environment variables in Railway dashboard
# Add custom domain: api.meldra.ai
```

### Deploy Frontend to Vercel

```bash
cd ..  # Back to project root
npm install -g vercel
vercel login
vercel

# Set environment variables in Vercel dashboard:
# VITE_API_URL=https://api.meldra.ai

vercel --prod

# Add custom domain: insightsheet.meldra.ai
```

### Update GoDaddy DNS

1. Login to GoDaddy
2. Go to meldra.ai → DNS → Manage DNS
3. Add CNAME records:
   - **api.meldra.ai** → [Railway URL]
   - **insightsheet.meldra.ai** → cname.vercel-dns.com

Wait 10-60 minutes for DNS propagation.

---

## 🎉 Final Result

After deployment:

✅ **Frontend**: https://insightsheet.meldra.ai (or https://meldra.ai)
✅ **Backend**: https://api.meldra.ai
✅ **Database**: Neon PostgreSQL (already configured)
✅ **Domain**: meldra.ai (GoDaddy)

Your app is live and fully independent from Base44! 🚀

---

## 📞 Need Help?

- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- GoDaddy DNS help: https://www.godaddy.com/help/dns-management-19131

Your complete stack:
- **Domain**: meldra.ai (GoDaddy)
- **Frontend**: React + Vite (Vercel)
- **Backend**: Python FastAPI (Railway)
- **Database**: PostgreSQL (Neon)
- **AI**: OpenAI GPT-4

---

**Ready to deploy? Start with Railway for backend, then Vercel for frontend!** 🚀
