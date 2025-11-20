# Netlify Deployment Guide for Fuel Tracker

This guide will help you deploy the Fuel Tracker frontend to Netlify.

## Prerequisites

1. A Netlify account (sign up at [netlify.com](https://www.netlify.com))
2. Your Fuel Tracker repository pushed to GitHub
3. Your Railway backend URL (e.g., `https://fuel-tracker-production.up.railway.app`)

## Step 1: Prepare Your Repository

Ensure your repository is ready for deployment:

```bash
# Make sure all changes are committed
git add -A
git commit -m "Prepare for Netlify deployment"
git push origin main
```

## Step 2: Create Netlify Configuration

Create a `netlify.toml` file in the root of your project:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

## Step 3: Deploy via Netlify Dashboard

### Option A: Deploy from GitHub (Recommended)

1. **Log in to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Sign in with your GitHub account

2. **Add New Site**
   - Click "Add new site" → "Import an existing project"
   - Select "GitHub" as your Git provider
   - Authorize Netlify to access your GitHub repositories
   - Select your `fuel-tracker` repository

3. **Configure Build Settings**
   - **Base directory**: Leave empty (or `./` if your frontend is in root)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

4. **Set Environment Variables**
   - Click "Show advanced" → "New variable"
   - Add the following environment variable:
     - **Key**: `VITE_SERVER_URL`
     - **Value**: `https://fuel-tracker-production.up.railway.app` (or your Railway URL)
   - Click "Deploy site"

### Option B: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize Site**
   ```bash
   netlify init
   ```
   - Follow the prompts to link your site
   - Select "Create & configure a new site"
   - Choose a site name or use the default

4. **Set Environment Variables**
   ```bash
   netlify env:set VITE_SERVER_URL https://fuel-tracker-production.up.railway.app
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

## Step 4: Configure Build Settings

After initial deployment, configure your build settings:

1. Go to **Site settings** → **Build & deploy** → **Build settings**
2. Ensure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18` (or latest LTS)

## Step 5: Configure Environment Variables

1. Go to **Site settings** → **Environment variables**
2. Add/verify:
   - `VITE_SERVER_URL`: Your Railway backend URL
   - Example: `https://fuel-tracker-production.up.railway.app`

## Step 6: Configure CORS on Railway Backend

Ensure your Railway backend allows requests from your Netlify domain:

1. In your Railway project, check your CORS configuration
2. Add your Netlify domain to allowed origins:
   - Example: `https://your-site-name.netlify.app`
   - Or use `*` for development (not recommended for production)

## Step 7: Configure Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click "Add custom domain"
3. Follow Netlify's DNS configuration instructions

## Step 8: Enable Continuous Deployment

Netlify automatically deploys when you push to your main branch. To configure:

1. Go to **Site settings** → **Build & deploy** → **Continuous Deployment**
2. Ensure your GitHub repository is connected
3. Configure branch settings:
   - **Production branch**: `main`
   - **Branch deploys**: Enable if you want preview deployments

## Troubleshooting

### Build Fails

1. **Check build logs** in Netlify dashboard
2. **Verify Node version** matches your local environment
3. **Check environment variables** are set correctly
4. **Verify build command** matches your `package.json` scripts

### API Connection Issues

1. **Verify `VITE_SERVER_URL`** is set correctly
2. **Check CORS settings** on Railway backend
3. **Test API endpoint** directly in browser:
   ```
   https://fuel-tracker-production.up.railway.app/health
   ```

### 404 Errors on Routes

1. **Verify redirect rule** in `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

### Environment Variables Not Working

1. **Redeploy** after adding environment variables
2. **Check variable names** match exactly (case-sensitive)
3. **Verify variable values** don't have trailing spaces

## Quick Deploy Commands

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy to production
netlify deploy --prod

# Deploy preview
netlify deploy

# View site
netlify open:site

# View logs
netlify logs
```

## Post-Deployment Checklist

- [ ] Site loads correctly
- [ ] API connection works (check browser console)
- [ ] Can create fuel topups
- [ ] Can view topup history
- [ ] Analytics endpoints work
- [ ] Real-time updates work (if using WebSockets)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic with Netlify)

## Support

- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify Community](https://answers.netlify.com/)
- [Railway Documentation](https://docs.railway.app/)

