# Deployment Guide for meldra.ai

Complete deployment guide for InsightSheet on your custom domain.

## 🌐 Domain Structure

```
https://meldra.ai              → Frontend (React app)
https://api.meldra.ai          → Backend (Node.js API)
https://app.meldra.ai          → Alternative frontend URL (optional)
```

---

## 📦 Part 1: Deploy Backend (api.meldra.ai)

### Option A: Railway (Recommended - Free Tier) ⭐

**1. Sign up at Railway**
- Visit https://railway.app
- Sign up with GitHub

**2. Create New Project**
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose `insightsheet` repository
- Select `backend` folder as root

**3. Add MongoDB Database**
- In your project, click "New"
- Select "Database" → "MongoDB"
- Railway automatically provisions MongoDB
- Connection string auto-added to env vars

**4. Configure Environment Variables**
```
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://meldra.ai
MONGODB_URI=(auto-filled by Railway)
JWT_SECRET=generate-a-strong-random-secret-here
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**5. Deploy**
- Railway auto-deploys from GitHub
- Get your Railway URL (e.g., `your-app.railway.app`)

**6. Configure Custom Domain**
- Project Settings → Domains
- Add custom domain: `api.meldra.ai`
- Add DNS record at your domain provider:
  ```
  Type: CNAME
  Name: api
  Value: your-app.railway.app
  ```

**Cost:** FREE (500 hours/month)

---

### Option B: Render

**1. Create Web Service**
- Visit https://render.com
- New → Web Service
- Connect GitHub repository
- Root Directory: `backend`

**2. Configure Build**
- Build Command: `npm install`
- Start Command: `npm start`
- Instance Type: Free

**3. Add MongoDB**
- Dashboard → New → MongoDB
- Copy connection string

**4. Environment Variables**
Same as Railway above

**5. Custom Domain**
- Settings → Custom Domains
- Add `api.meldra.ai`
- Configure DNS (CNAME record)

**Cost:** FREE

---

## 🎨 Part 2: Deploy Frontend (meldra.ai)

### Option A: Vercel (Recommended) ⭐

**1. Install Vercel CLI**
```bash
npm install -g vercel
```

**2. Create .env.production**
```bash
cd C:\Users\sumit\Documents\Insightlite
echo VITE_API_URL=https://api.meldra.ai/api > .env.production
```

**3. Build and Deploy**
```bash
# Build
npm run build

# Deploy
vercel

# Prompts:
# Set up and deploy? Y
# Scope: Your account
# Link to existing project? N
# Project name: insightsheet
# Directory: ./
# Override settings? N

# Deploy to production
vercel --prod
```

**4. Configure Custom Domain**
- Vercel Dashboard → Project → Settings → Domains
- Add domain: `meldra.ai`
- Vercel provides DNS instructions
- Or if you use Cloudflare/other DNS:
  ```
  Type: CNAME
  Name: @
  Value: cname.vercel-dns.com
  ```

**5. Add www redirect (optional)**
- Add domain: `www.meldra.ai`
- Vercel auto-redirects to `meldra.ai`

**Cost:** FREE

---

### Option B: Netlify

**1. Install Netlify CLI**
```bash
npm install -g netlify-cli
```

**2. Build and Deploy**
```bash
npm run build
netlify deploy --prod --dir=dist
```

**3. Custom Domain**
- Site Settings → Domain Management
- Add `meldra.ai`
- Configure DNS

**Cost:** FREE

---

## 📱 Part 3: Update Mobile Apps

**After backend is deployed:**

**1. Update capacitor.config.ts**
```typescript
const config: CapacitorConfig = {
  appId: 'com.meldra.insightsheet',
  appName: 'InsightSheet',
  webDir: '../dist',
  server: {
    url: 'https://meldra.ai',  // Your production frontend
    androidScheme: 'https',
    iosScheme: 'https'
  }
};
```

**2. Create .env in mobile folder**
```bash
echo VITE_API_URL=https://api.meldra.ai/api > mobile/.env
```

**3. Rebuild mobile apps**
```bash
cd mobile
npm run build:web
npx cap sync android
cd android
gradlew assembleRelease
```

**4. Distribute**
- Google Play Store: Upload release AAB
- Direct distribution: Share release APK
- iOS: Build on Mac, submit to App Store

---

## 🔒 Part 4: SSL/HTTPS (Automatic)

All platforms provide automatic HTTPS:
- ✅ Vercel: Auto SSL
- ✅ Netlify: Auto SSL
- ✅ Railway: Auto SSL
- ✅ Render: Auto SSL

No configuration needed!

---

## 🔧 Part 5: Environment Variables Summary

### Frontend (.env.production)
```bash
VITE_API_URL=https://api.meldra.ai/api
```

### Backend (Railway/Render)
```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://meldra.ai
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/insightsheet
JWT_SECRET=your-super-secret-jwt-key-64-chars-minimum
```

---

## 📊 DNS Configuration at Domain Registrar

**If you use Cloudflare/GoDaddy/Namecheap:**

### For meldra.ai (Frontend)
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
Proxy: Yes (if Cloudflare)
```

### For api.meldra.ai (Backend)
```
Type: CNAME
Name: api
Value: your-app.railway.app
Proxy: Yes (if Cloudflare)
```

### For www.meldra.ai (Optional)
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
Proxy: Yes (if Cloudflare)
```

---

## 🚀 Complete Deployment Workflow

### Initial Deployment (One Time)

```bash
# 1. Deploy Backend to Railway
# - Sign up, create project, connect GitHub
# - Add MongoDB, configure env vars
# - Add custom domain: api.meldra.ai

# 2. Deploy Frontend to Vercel
cd C:\Users\sumit\Documents\Insightlite
echo VITE_API_URL=https://api.meldra.ai/api > .env.production
npm run build
vercel --prod
# - Add custom domain: meldra.ai

# 3. Configure DNS
# - Add CNAME records as above
# - Wait 5-30 minutes for propagation

# 4. Test
# - Visit https://meldra.ai
# - Test signup/login
# - Check API calls in Network tab
```

### Future Updates

```bash
# Frontend updates
cd C:\Users\sumit\Documents\Insightlite
# Make changes to src/
npm run build
vercel --prod  # Auto-deploys

# Backend updates
cd backend
# Make changes
git push  # Railway auto-deploys from GitHub
```

---

## 🎯 Post-Deployment Checklist

- [ ] Frontend accessible at https://meldra.ai
- [ ] Backend API at https://api.meldra.ai/health returns OK
- [ ] User registration works
- [ ] User login works
- [ ] File upload works
- [ ] Mobile apps connect to production API
- [ ] HTTPS working (green lock icon)
- [ ] All HTTP auto-redirects to HTTPS

---

## 💰 Cost Summary

| Service | Purpose | Cost |
|---------|---------|------|
| Vercel | Frontend hosting | FREE |
| Railway | Backend + MongoDB | FREE (500hr/mo) |
| Domain (meldra.ai) | Already owned | $0 |
| SSL Certificates | HTTPS | FREE (auto) |
| **Total** | | **$0/month** |

**For scaling:**
- Railway: $5/month for more hours
- MongoDB Atlas: FREE → $9/month for dedicated
- Vercel: FREE → $20/month for teams

---

## 📈 Scaling Considerations

### Free Tier Limits

**Railway Free:**
- 500 execution hours/month
- 512 MB RAM
- 1 GB Disk
- Good for ~1000 users/month

**Vercel Free:**
- Unlimited bandwidth
- 100 GB free
- Unlimited sites
- Good for ~100,000 users/month

### When to Upgrade

**Upgrade Railway if:**
- >500 hours/month (app runs 24/7 for ~20 days)
- Need more RAM/storage
- >1000 concurrent users

**Upgrade MongoDB if:**
- Database >512 MB
- Need backups
- >1000 writes/second

---

## 🐛 Troubleshooting

### Frontend can't reach backend

**Check:**
1. API URL in `.env.production`: `https://api.meldra.ai/api`
2. Backend CORS allows: `https://meldra.ai`
3. Backend is deployed and running
4. DNS propagated (check with `nslookup api.meldra.ai`)

### CORS errors

**Backend .env:**
```
FRONTEND_URL=https://meldra.ai
```

### SSL certificate errors

- Wait 5-10 minutes after domain configuration
- All platforms auto-provision SSL
- Check DNS is pointing correctly

### Mobile app can't connect

**Check:**
1. `capacitor.config.ts` has `url: 'https://meldra.ai'`
2. Rebuilt and synced after changing config
3. Mobile app has internet permission

---

## 📚 Useful Commands

```bash
# Check if backend is running
curl https://api.meldra.ai/health

# Check DNS propagation
nslookup api.meldra.ai
nslookup meldra.ai

# Deploy frontend
cd C:\Users\sumit\Documents\Insightlite
vercel --prod

# View Railway logs
railway logs

# Test API locally
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"Test"}'
```

---

## 🎉 You're Live!

After deployment:

- ✅ **Web App:** https://meldra.ai
- ✅ **API:** https://api.meldra.ai
- ✅ **Global access:** Users worldwide can access
- ✅ **Mobile apps:** Connect to production API
- ✅ **Scalable:** Auto-scales with traffic
- ✅ **Secure:** HTTPS everywhere

**Your app is now live and accessible worldwide!** 🚀
