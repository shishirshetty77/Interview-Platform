# 🚀 Vercel Deployment Guide for Interview Platform

## ⚠️ **Important Limitation**
**Vercel doesn't support WebSocket connections**, so video calling features will be disabled. This deployment is for **UI/Authentication testing only**.

For full functionality, use platforms like Railway, Render, or DigitalOcean that support WebSockets.

---

## 📋 **Pre-Deployment Setup**

### 1. Set up Google OAuth
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Create **OAuth 2.0 credentials**
5. Add authorized redirect URI: `https://your-vercel-app.vercel.app/api/auth/callback/google`

### 2. Generate Secure Secret
```bash
# Generate a secure NextAuth secret
openssl rand -base64 32
```

---

## 🌐 **Deploy to Vercel**

### Option 1: GitHub Integration (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Import your repository
   - Vercel will auto-detect Next.js settings

### Option 2: Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

---

## 🔧 **Environment Variables Setup**

After deployment, add these environment variables in your Vercel dashboard:

### Required Variables:
```
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-generated-secret-from-step-2
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
DATABASE_URL=file:./dev.db
```

### Optional Variables:
```
NODE_ENV=production
```

---

## 🎯 **What Will Work in Vercel**

✅ **Working Features:**
- User authentication (Google OAuth)
- Dashboard UI
- Interview session creation
- Database operations (SQLite)
- Responsive design
- All UI components

❌ **Not Working Features:**
- Video calling (WebRTC)
- Real-time chat
- Socket.io connections
- Screen sharing

---

## 📊 **Testing Your Deployment**

1. **Visit your Vercel URL**
2. **Test Authentication:**
   - Click "Sign in with Google"
   - Authorize the app
   - Should redirect to dashboard

3. **Test Dashboard:**
   - Create interview sessions
   - View session list
   - Test navigation

4. **Expected Warning:**
   - You should see a yellow warning banner explaining the limitations

---

## 🔄 **Redeployment**

Any push to your main branch will trigger automatic redeployment on Vercel.

```bash
git add .
git commit -m "Update changes"
git push origin main
```

---

## 🛠️ **For Full Functionality**

To get video calling working, deploy to:

- **Railway**: Supports WebSockets + PostgreSQL
- **Render**: Full-stack deployment
- **DigitalOcean**: VPS with Docker
- **Heroku**: With Redis add-on for scaling

---

## 🎉 **Success!**

Your interview platform is now live for UI and authentication testing!

**Demo URL:** `https://your-app-name.vercel.app`

*Note: Remember to update your Google OAuth settings with the production URL.*
