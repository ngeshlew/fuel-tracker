# UK Fuel Price Data Sources

## Overview
This document outlines the available data sources for UK average fuel prices and how they can be integrated into the Fuel Tracker application.

## Data Sources

### 1. UK Government - Weekly Road Fuel Prices
**URL**: https://www.gov.uk/government/statistics/weekly-road-fuel-prices

**Description**: 
- Weekly statistics published by the UK Government
- Provides average UK retail 'pump' prices on a weekly basis
- Data is updated weekly

**Access Method**:
- CSV/JSON downloads available from the statistics page
- Open data scheme: https://www.gov.uk/guidance/access-fuel-price-data
- May require manual download and parsing initially
- No official REST API endpoint found (as of 2024)

**Data Format**:
- CSV format with columns for unleaded, diesel, super unleaded, premium diesel
- Includes regional variations
- Historical data available

**Implementation Notes**:
- Would need to implement CSV parsing or check for JSON endpoint
- Update frequency: Weekly
- Cache TTL: 24 hours recommended

### 2. RAC Fuel Watch
**URL**: https://www.rac.co.uk/drive/advice/fuel-watch/

**Description**:
- Daily monitoring of UK fuel prices
- Tracks wholesale and pump prices
- Monitors major supermarkets (Asda, Tesco, Sainsbury's, Morrisons, Costco)
- Also tracks other brands (BP, Shell, Esso, Texaco, TotalEnergies)

**Access Method**:
- Website displays current averages
- No official public API found
- May require web scraping (with respect for robots.txt and rate limiting)
- Alternative: Manual data entry or partnership with RAC

**Data Format**:
- Displayed on website as:
  - Unleaded: Average price in pence per litre
  - Diesel: Average price in pence per litre
  - Super unleaded: Average price in pence per litre
  - Premium diesel: Average price in pence per litre

**Update Frequency**:
- Daily updates
- More frequent than government data

**Implementation Notes**:
- Web scraping would require:
  - Respect for robots.txt
  - Rate limiting
  - Error handling for page structure changes
  - Fallback to manual/default data

### 3. Confused.com Fuel Prices
**URL**: https://www.confused.com/petrol-prices

**Description**:
- Fuel price comparison service
- Shows current UK averages and local prices
- Uses UK Government open data scheme

**Access Method**:
- Website only, no public API
- Uses government data source

### 4. Ageas Fuel Price Checker
**URL**: Various (example: ageas.co.uk)

**Description**:
- Insurance company providing fuel price tracking
- Uses government data

## Recommended Implementation Strategy

### Phase 1: Manual/Default Data (Current)
- Use hardcoded default prices based on RAC Fuel Watch averages
- Update manually when needed
- Provides immediate functionality

### Phase 2: CSV Import (Short-term)
- Implement CSV parser for UK Government weekly data
- Allow manual CSV upload
- Store in database or local storage
- Update weekly

### Phase 3: Automated Fetching (Long-term)
- If government provides API: Implement API client
- If RAC provides API: Implement API client with authentication
- Otherwise: Implement web scraping with proper rate limiting and error handling

## Current Default Prices

Based on RAC Fuel Watch data (November 2024):
- Unleaded: 136.8 pence per litre
- Diesel: 145.4 pence per litre
- Super Unleaded: 150.5 pence per litre
- Premium Diesel: 162.1 pence per litre

## Data Update Frequency

- **UK Government**: Weekly (typically Monday)
- **RAC Fuel Watch**: Daily
- **Recommended Cache TTL**: 24 hours (balances freshness with API rate limits)

## Future Enhancements

1. **Location-based Pricing**: If user provides postcode, could fetch regional averages
2. **Historical Price Tracking**: Store historical averages for trend analysis
3. **Provider-specific Averages**: Track averages by provider brand
4. **Price Alerts**: Notify users when prices drop below certain thresholds

## API Integration Notes

### UK Government Open Data
- Check https://www.gov.uk/guidance/access-fuel-price-data for latest API information
- May require registration or API key
- Rate limits may apply

### RAC Fuel Watch
- No public API found
- Would require partnership or web scraping
- Consider reaching out to RAC for API access

## References

- UK Government Statistics: https://www.gov.uk/government/statistics/weekly-road-fuel-prices
- UK Government Open Data Guidance: https://www.gov.uk/guidance/access-fuel-price-data
- RAC Fuel Watch: https://www.rac.co.uk/drive/advice/fuel-watch/

