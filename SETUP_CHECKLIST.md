# Setup Checklist - Fuel Tracker Enhancements

## ✅ What's Been Implemented

- ✅ Removed all tariff sections from dashboard
- ✅ Added retailer dropdown (matches UK Government Open Data Scheme retailers)
- ✅ Added fuel grade selection (Unleaded/Super Unleaded, Standard/Premium Diesel)
- ✅ Added VAT tracking (rate, net price, VAT amount, total cost)
- ✅ Added Google Maps Places Autocomplete for location selection
- ✅ Added location fields (name, address, coordinates, Place ID)
- ✅ Updated UK price comparison with retailer-specific prices
- ✅ All database schema changes ready
- ✅ All frontend and backend code updated

## 🔧 What You Need to Do

### 1. Database Migration (Required)

The database schema has been updated but needs to be applied. You have two options:

#### Option A: Run on Railway (Recommended - Automatic)
The migration will run automatically when you deploy, as the `start` script includes `npm run db:push`.

**Steps:**
1. Commit and push your changes to GitHub
2. Railway will automatically deploy
3. The migration runs as part of the start script

#### Option B: Run Locally (For Testing)
If you want to test locally first:

```bash
cd server
# Set your DATABASE_URL in .env file
echo "DATABASE_URL=your_postgresql_connection_string" >> .env
# Run migration
npm run db:push
npm run db:generate
```

### 2. Google Maps API Key Setup (Required for Location Feature)

**Get Your API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable "Places API"
4. Create an API key
5. (Recommended) Restrict the key to Places API only

**Set Up Environment Variable:**

**For Local Development:**
1. Create/update `.env` file in the root directory:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
2. Restart your dev server:
   ```bash
   npm run dev
   ```

**For Netlify (Production):**
1. Go to your Netlify site dashboard
2. Navigate to: **Site settings** > **Environment variables**
3. Add new variable:
   - **Key**: `VITE_GOOGLE_MAPS_API_KEY`
   - **Value**: Your Google Maps API key
4. Redeploy your site (or it will auto-deploy on next push)

**Note:** Without the API key, the location autocomplete won't work, but all other features will function normally.

### 3. Verify Everything Works

**Test Checklist:**

1. **Add Fuel Topup:**
   - ✅ Select retailer from dropdown (should show all UK retailers)
   - ✅ Select fuel grade (Unleaded/Super Unleaded for Petrol, Standard/Premium for Diesel)
   - ✅ Enter litres and cost per litre
   - ✅ Verify VAT calculations display correctly
   - ✅ Test location autocomplete (type "Sainsbury Chertsey" - should show Google Maps suggestions)
   - ✅ Select a location from autocomplete
   - ✅ Submit and verify it saves

2. **View Topups Log:**
   - ✅ Check that retailer column shows selected retailer
   - ✅ Check that location column shows location name and address
   - ✅ Click on a topup to see full details including location

3. **Price Comparison:**
   - ✅ View dashboard
   - ✅ Check "UK Price Comparison" card appears
   - ✅ Verify it shows UK averages and retailer prices
   - ✅ If you have topups, verify it compares your prices to retailers

### 4. Optional: Update Default Prices

If you want to update the default UK average prices (used as fallback):

Edit: `src/services/fuelPriceService.ts`

Find the `DEFAULT_PRICES` object (around line 40) and update:
```typescript
const DEFAULT_PRICES: UKAveragePrices = {
  unleaded: 136.8, // Update with current average
  diesel: 145.4,   // Update with current average
  superUnleaded: 150.5,
  premiumDiesel: 162.1,
  // ...
};
```

## 🚨 Important Notes

### Database Migration
- **DO NOT** run `prisma migrate` - use `prisma db push` instead
- The migration will add new columns to existing `fuel_topups` table
- Existing data will be preserved (new fields will be NULL)

### Google Maps API
- Free tier: $200/month credit (covers ~28,000 autocomplete requests)
- Set up billing alerts in Google Cloud Console
- The API key is only used client-side (in the browser)

### Environment Variables Summary

**Frontend (Netlify):**
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `VITE_SERVER_URL` - Backend API URL (already set)

**Backend (Railway):**
- `DATABASE_URL` - PostgreSQL connection string (already set)
- Other backend env vars (already configured)

## 📝 Quick Start Commands

```bash
# 1. Set up Google Maps API key locally
echo "VITE_GOOGLE_MAPS_API_KEY=your_key" >> .env

# 2. Run database migration (if testing locally)
cd server
npm run db:push
npm run db:generate
cd ..

# 3. Start development server
npm run dev

# 4. Test the new features
# - Open http://localhost:5173
# - Click "Add Topup"
# - Try selecting retailer and searching for location
```

## 🐛 Troubleshooting

### Location Autocomplete Not Working
- Check browser console for errors
- Verify `VITE_GOOGLE_MAPS_API_KEY` is set correctly
- Check that Places API is enabled in Google Cloud Console
- Verify API key restrictions allow your domain

### Database Migration Fails
- Check `DATABASE_URL` is set correctly
- Verify database connection
- Check Railway logs for errors

### Retailer Prices Not Showing
- Check browser console for network errors
- Verify retailer APIs are accessible (some may be rate-limited)
- The app will fall back to default prices if retailer APIs fail

## ✅ Ready to Go!

Once you've:
1. ✅ Set up Google Maps API key (or skip if you don't need location feature yet)
2. ✅ Run database migration (automatic on Railway, or manual locally)
3. ✅ Test the new features

Everything should be working! The app will gracefully handle missing API keys (location feature just won't work) and will use default prices if retailer APIs are unavailable.

