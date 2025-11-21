# Google Maps API Setup Guide

## Overview
The Fuel Tracker application uses Google Maps Places API for location autocomplete when adding fuel topups. This allows users to search for and select specific locations (e.g., "Sainsbury Chertsey") and track prices by location.

## Getting a Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project**
   - Create a new project or select an existing one
   - Give it a name (e.g., "Fuel Tracker")

3. **Enable Places API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Places API"
   - Click "Enable"

4. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

5. **Restrict API Key (Recommended)**
   - Click on the API key to edit it
   - Under "API restrictions", select "Restrict key"
   - Choose "Places API" from the list
   - Under "Application restrictions", you can restrict by:
     - HTTP referrers (for web apps)
     - IP addresses (for server-side)
   - Save the restrictions

## Setting Up the API Key

### For Local Development

1. Create a `.env` file in the root directory (if it doesn't exist):
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

### For Production (Netlify)

1. Go to your Netlify site dashboard
2. Navigate to "Site settings" > "Environment variables"
3. Add a new variable:
   - **Key**: `VITE_GOOGLE_MAPS_API_KEY`
   - **Value**: Your Google Maps API key
4. Redeploy your site

## API Usage and Billing

### Free Tier
- Google Maps Platform offers $200 in free credits per month
- This typically covers:
  - ~28,000 Places API requests (Autocomplete)
  - ~40,000 Geocoding requests

### Pricing (After Free Tier)
- Places API (Autocomplete): $2.83 per 1,000 requests
- Geocoding: $5.00 per 1,000 requests

### Best Practices
1. **Cache Results**: The app caches location data to reduce API calls
2. **Debounce Input**: Autocomplete is only triggered on focus, not on every keystroke
3. **Monitor Usage**: Set up billing alerts in Google Cloud Console

## Features Enabled

- **Places Autocomplete**: Users can search for locations by name
- **Place Details**: Retrieves name, address, coordinates, and Place ID
- **Location Tracking**: Stores location data for price comparison by region

## Troubleshooting

### API Key Not Working
- Verify the API key is correct
- Check that Places API is enabled
- Verify API key restrictions allow your domain/IP

### Autocomplete Not Showing
- Check browser console for errors
- Verify `VITE_GOOGLE_MAPS_API_KEY` is set correctly
- Ensure the Google Maps script is loading (check Network tab)

### CORS Errors
- Google Maps API should work from any domain
- If issues occur, check API key restrictions

## Security Notes

- Never commit API keys to version control
- Use environment variables for all API keys
- Restrict API keys to specific APIs and domains
- Monitor API usage regularly
- Set up billing alerts to avoid unexpected charges

