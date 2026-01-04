# 🔗 How to Change Your Vercel URL

## 🎯 Options to Change URL

You have **3 ways** to change your Vercel URL:

---

## 🌐 Option 1: Add Custom Domain (Best - Recommended)

**Change to:** `https://meldra.ai` or `https://www.meldra.ai`

### **Steps:**

1. **In Vercel Dashboard:**
   - Go to your project: `meldra`
   - Click **"Settings"** tab
   - Click **"Domains"** in the sidebar

2. **Add Domain:**
   - Click **"Add Domain"** button
   - Enter: `meldra.ai`
   - Click **"Add"**
   - Enter: `www.meldra.ai`
   - Click **"Add"**

3. **Configure DNS:**
   - Vercel will show you DNS records
   - Go to GoDaddy → DNS Management
   - Add the records (see `MELDRA_AI_DOMAIN_SETUP.md`)

4. **Wait for DNS:**
   - DNS propagation: 24-48 hours
   - Your site will be at: `https://meldra.ai` ✅

**This is the best option!** Your site will have your custom domain.

---

## 📝 Option 2: Change Project Name

**Change to:** `https://meldra.vercel.app` (shorter, cleaner)

### **Steps:**

1. **In Vercel Dashboard:**
   - Go to your project
   - Click **"Settings"** tab
   - Scroll to **"General"** section

2. **Change Name:**
   - Find **"Project Name"**
   - Click **"Edit"** or the name field
   - Change from: `insightsheet` or `meldra-244xojuid`
   - Change to: `meldra`
   - Click **"Save"**

3. **New URL:**
   - Your URL will be: `https://meldra.vercel.app`
   - Old URL will redirect to new one

**Note:** This only changes the Vercel subdomain, not to a custom domain.

---

## 🔄 Option 3: Create New Project with Different Name

If you want a completely fresh URL:

1. **Create New Project:**
   - Vercel Dashboard → "Add New" → "Project"
   - Import same GitHub repo
   - Name it: `meldra`

2. **Delete Old Project:**
   - Settings → Delete Project (optional)

**Not recommended** - just rename the existing project instead.

---

## ✅ Recommended: Use Custom Domain

**Best approach:**
1. ✅ Add custom domain: `meldra.ai`
2. ✅ Configure DNS at GoDaddy
3. ✅ Your site: `https://meldra.ai`

**Why?**
- Professional domain name
- Brand consistency
- Better for users
- SEO benefits

---

## 📋 Quick Steps (Custom Domain)

1. **Vercel Dashboard** → Your Project → **Settings** → **Domains**
2. **Click "Add Domain"**
3. **Enter:** `meldra.ai`
4. **Click "Add"**
5. **Enter:** `www.meldra.ai`
6. **Click "Add"**
7. **Copy DNS records** from Vercel
8. **Go to GoDaddy** → DNS Management → Add records
9. **Wait 24-48 hours** for DNS propagation

---

## 🎯 Summary

| Option | New URL | Difficulty | Recommended |
|--------|---------|------------|-------------|
| **Custom Domain** | `meldra.ai` | Medium | ✅ **Yes!** |
| **Rename Project** | `meldra.vercel.app` | Easy | ⚠️ Temporary |
| **New Project** | `new-name.vercel.app` | Easy | ❌ Not needed |

---

**I recommend adding your custom domain `meldra.ai`!** 🌐

See `MELDRA_AI_DOMAIN_SETUP.md` for detailed DNS setup instructions.
