# Debugging "Add Topup" Issue

## Current Status
- ✅ Backend deployed on Railway (port 8080)
- ✅ Frontend deployed on Netlify
- ✅ Builds are successful
- ❌ "Add Topup" button triggers ErrorBoundary

## Likely Causes

### 1. **Netlify Environment Variable Issue**
The `VITE_SERVER_URL` in Netlify might be set incorrectly.

**Check in Netlify Dashboard:**
1. Go to Site settings → Environment variables
2. Verify `VITE_SERVER_URL` is set to: `https://fuel-tracker.up.railway.app`
3. If it's set to the wrong URL (like `fuel-tracker-production.up.railway.app`), update it
4. Trigger a new deployment

### 2. **React Component Error**
The ErrorBoundary is catching a rendering error, likely in `FuelTopupForm` or `FuelTopupPanel`.

**Check Browser Console:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "Add Topup" button
4. Look for any red error messages
5. Check the error stack trace

**Common causes:**
- Missing Google Maps API key initialization
- Undefined state/props access
- Missing dependency/import

### 3. **API Connection Issue**
The frontend might not be able to reach the backend.

**Test Backend Health:**
```bash
curl https://fuel-tracker.up.railway.app/health
```

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "...",
  "uptime": ...
}
```

**Test API Endpoint:**
```bash
curl https://fuel-tracker.up.railway.app/api/fuel-topups
```

### 4. **CORS Issue**
Check Network tab in DevTools:
1. Open DevTools → Network tab
2. Click "Add Topup"
3. Look for failed requests
4. Check if CORS errors appear

## Debugging Steps

### Step 1: Verify API URL in Production
1. Open the deployed Netlify site
2. Open browser console
3. Type: `import.meta.env.VITE_SERVER_URL`
4. Or check Network tab to see what URL requests are going to

### Step 2: Check Railway Backend Logs
1. Go to Railway dashboard
2. Select your fuel-tracker service
3. Go to "Logs" tab
4. Look for any error messages when "Add Topup" is clicked

### Step 3: Test Backend Endpoint Directly
Try creating a topup via curl:
```bash
curl -X POST https://fuel-tracker.up.railway.app/api/fuel-topups \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "vehicle-1",
    "litres": 50,
    "costPerLitre": 1.50,
    "totalCost": 75,
    "date": "2024-11-23T10:00:00Z",
    "type": "MANUAL"
  }'
```

### Step 4: Check React Error Details
The ErrorBoundary should show error details in development mode. If you can access the error screen:
- Look for the error message
- Check the stack trace
- Note which component/file is mentioned

## Quick Fixes to Try

### Fix 1: Update Netlify Environment Variable
If `VITE_SERVER_URL` is wrong:
1. Netlify Dashboard → Site settings → Environment variables
2. Update `VITE_SERVER_URL` to: `https://fuel-tracker.up.railway.app`
3. Redeploy (or it will auto-redeploy on next push)

### Fix 2: Clear Browser Cache
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Or clear site data: DevTools → Application → Clear storage

### Fix 3: Check Google Maps API Key
If the form uses Google Maps for location autocomplete:
1. Verify `VITE_GOOGLE_MAPS_API_KEY` is set in Netlify
2. Check if the key is valid and has proper permissions

## Next Steps
Once you identify the specific error from the browser console or Railway logs, we can fix it. Please share:
1. Browser console errors
2. Network tab failed requests
3. Railway backend logs
4. ErrorBoundary error message (if visible)

