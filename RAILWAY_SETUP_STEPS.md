# 🚂 Railway Setup Guide for Fuel Tracker

## Quick Answer

**Yes, you should add a Postgres database for the fuel-tracker!** Here's how to configure everything:

---

## Step-by-Step Railway Configuration

### 1. Add PostgreSQL Database

1. In Railway, click **"+ Create"** button (top right)
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a Postgres service
4. **Important**: Note the service name (e.g., "Postgres" or "Postgres2")

### 2. Configure Fuel Tracker Service

#### A. Root Directory
1. Go to **fuel-tracker** service → **Settings** tab
2. Under **"Source"** section, click **"Add Root Directory"**
3. Set root directory to: **`server`**
   - This tells Railway to build/deploy from the `server/` folder, not the root

#### B. Build Command
1. In **Settings** → **"Build"** section
2. Set **Build Command** to:
   ```bash
   npm install && npm run build
   ```

#### C. Start Command
1. In **Settings** → **"Deploy"** section
2. Set **Start Command** to:
   ```bash
   npm start
   ```
   (This runs: `npm run db:generate && npm run db:push && node dist/index.js`)

#### D. Environment Variables
1. Go to **fuel-tracker** service → **Variables** tab
2. Add these variables:

   **Required:**
   ```
   DATABASE_URL = [Auto-generated from Postgres service]
   ```
   - Railway will auto-generate this when you link the Postgres service
   - Or manually copy from Postgres service → Variables → `DATABASE_URL`

   **Optional (but recommended):**
   ```
   PORT = 3001
   NODE_ENV = production
   ```

### 3. Link Postgres to Fuel Tracker

**Option A: Automatic (Recommended)**
1. In **fuel-tracker** service → **Settings** → **"Variables"**
2. Railway should auto-detect the Postgres service
3. Click **"Add Reference"** next to `DATABASE_URL`
4. Select your Postgres service

**Option B: Manual**
1. Copy `DATABASE_URL` from Postgres service → Variables
2. Paste into fuel-tracker → Variables → `DATABASE_URL`

### 4. Network Configuration

1. Go to **fuel-tracker** → **Settings** → **"Networking"**
2. Make sure the service is **publicly accessible**
3. Railway will generate a URL like: `fuel-tracker-production.up.railway.app`

### 5. Deploy

1. Railway will auto-deploy when you push to the `main` branch
2. Or click **"Deploy"** button in the Railway dashboard
3. Watch the **Logs** tab for deployment progress

---

## Database Decision: Separate vs Shared

### Option 1: Separate Database (Recommended) ✅
**Create a NEW Postgres service for fuel-tracker**

**Pros:**
- ✅ Clean separation of data
- ✅ Independent scaling
- ✅ No risk of affecting electricity-tracker data
- ✅ Easier to manage and debug

**Cons:**
- ⚠️ Uses more resources (2 databases)

**When to use:** Always recommended for production

### Option 2: Shared Database (Not Recommended) ❌
**Use the existing Postgres from electricity-tracker**

**Pros:**
- ✅ Saves resources
- ✅ Single database to manage

**Cons:**
- ❌ Data mixing (electricity + fuel in same tables)
- ❌ Risk of conflicts
- ❌ Harder to separate later
- ❌ Migration complexity

**When to use:** Only for testing/development

---

## Recommended Setup

```
Railway Project: perpetual-radiance
├── Postgres (existing - for electricity-tracker)
├── electricity-tracker (service)
└── Postgres2 (NEW - for fuel-tracker) ✅
└── fuel-tracker (service) ✅
```

---

## Configuration Checklist

- [ ] Created new Postgres service for fuel-tracker
- [ ] Set root directory to `server`
- [ ] Configured build command: `npm install && npm run build`
- [ ] Configured start command: `npm start`
- [ ] Added `DATABASE_URL` environment variable (linked to Postgres)
- [ ] Service is publicly accessible
- [ ] Deployed successfully
- [ ] Tested `/health` endpoint
- [ ] Tested `/test-db` endpoint (should show database connection)

---

## Testing After Deployment

1. **Health Check:**
   ```
   GET https://fuel-tracker-production.up.railway.app/health
   ```
   Should return: `{"status": "OK", ...}`

2. **Database Connection:**
   ```
   GET https://fuel-tracker-production.up.railway.app/test-db
   ```
   Should return: `{"status": "OK", "message": "Database connection successful"}`

3. **API Endpoints:**
   ```
   GET https://fuel-tracker-production.up.railway.app/api/fuel-topups
   ```
   Should return: `{"success": true, "data": []}`

---

## Troubleshooting

### Issue: Build fails
- Check that root directory is set to `server`
- Verify `package.json` exists in `server/` folder
- Check build logs for specific errors

### Issue: Database connection fails
- Verify `DATABASE_URL` is set correctly
- Check Postgres service is running
- Ensure Postgres is linked to fuel-tracker service
- Check database URL format: `postgresql://user:password@host:port/database`

### Issue: Service won't start
- Check start command is correct: `npm start`
- Verify TypeScript build completed (`dist/` folder exists)
- Check logs for Prisma errors

### Issue: Prisma migration fails
- The start script runs `prisma db push` automatically
- If it fails, check Prisma schema is valid
- Verify `DATABASE_URL` has correct permissions

---

## Next Steps After Setup

1. **Update Backend Code:**
   - Update Prisma schema (see `RAILWAY_MIGRATION_GUIDE.md`)
   - Update API routes from meter-readings to fuel-topups
   - Update Socket.io events

2. **Update Frontend:**
   - Update API base URL in `src/services/api.ts`
   - Point to your new Railway URL

3. **Test Everything:**
   - Create a fuel topup via API
   - Verify data saves to database
   - Test real-time updates

---

## Quick Reference: Railway Settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `server` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Environment** | `production` |
| **Branch** | `main` |
| **Port** | `3001` (or Railway auto-assigned) |

---

**Need Help?** Check Railway logs in the **Logs** tab for detailed error messages.

