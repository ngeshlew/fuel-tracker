/**
 * Fuel Price Service
 * 
 * Service for fetching and managing UK average fuel prices from various sources:
 * - UK Government Open Data Scheme (retailer APIs)
 * - UK Government weekly statistics
 * - RAC Fuel Watch data
 * 
 * Features:
 * - Caching with TTL (24 hours for weekly data)
 * - Price comparison calculations
 * - Retailer-specific price tracking
 * - Fallback to manual/default data
 */

export interface RetailerPrice {
  retailer: string;
  unleaded?: number; // pence per litre
  diesel?: number; // pence per litre
  superUnleaded?: number; // pence per litre
  premiumDiesel?: number; // pence per litre
  lastUpdated?: string;
}

export interface UKAveragePrices {
  unleaded: number; // pence per litre
  diesel: number; // pence per litre
  superUnleaded: number; // pence per litre
  premiumDiesel: number; // pence per litre
  lastUpdated: string; // ISO date string
  source: 'GOVERNMENT' | 'RAC' | 'MANUAL' | 'RETAILER_AVERAGE';
  retailers?: RetailerPrice[]; // Individual retailer prices
}

export interface PriceComparison {
  userPrice: number; // pence per litre
  averagePrice: number; // pence per litre
  difference: number; // pence per litre (userPrice - averagePrice)
  percentageDifference: number; // percentage
  isBelowAverage: boolean;
}

// Retailer API endpoints from UK Government Open Data Scheme
export const RETAILER_ENDPOINTS: Record<string, string> = {
  'Ascona Group': 'https://fuelprices.asconagroup.co.uk/newfuel.json',
  'Asda': 'https://storelocator.asda.com/fuel_prices_data.json',
  'BP': 'https://www.bp.com/en_gb/united-kingdom/home/fuelprices/fuel_prices_data.json',
  'Esso Tesco Alliance': 'https://fuelprices.esso.co.uk/latestdata.json',
  'JET Retail UK': 'https://jetlocal.co.uk/fuel_prices_data.json',
  'Karan Retail Ltd': 'https://api.krl.live/integration/live_price/krl',
  'Morrisons': 'https://www.morrisons.com/fuel-prices/fuel.json',
  'Moto': 'https://moto-way.com/fuel-price/fuel_prices.json',
  'Motor Fuel Group': 'https://fuel.motorfuelgroup.com/fuel_prices_data.json',
  'Rontec': 'https://www.rontec-servicestations.co.uk/fuel-prices/data/fuel_prices_data.json',
  'Sainsbury\'s': 'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json',
  'SGN': 'https://www.sgnretail.uk/files/data/SGN_daily_fuel_prices.json',
  'Shell': 'https://www.shell.co.uk/fuel-prices-data.html', // Note: This may be HTML, not JSON
  'Tesco': 'https://www.tesco.com/fuel_prices/fuel_prices_data.json',
};

/**
 * Get list of available retailers
 */
export function getRetailerList(): string[] {
  return Object.keys(RETAILER_ENDPOINTS).filter(key => key !== 'Shell'); // Exclude Shell as it's HTML
}

// Cache for UK average prices
let cachedPrices: UKAveragePrices | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Default UK average prices (fallback)
 * Based on RAC Fuel Watch data as of November 2024
 */
const DEFAULT_PRICES: UKAveragePrices = {
  unleaded: 136.8, // pence per litre
  diesel: 145.4, // pence per litre
  superUnleaded: 150.5, // pence per litre
  premiumDiesel: 162.1, // pence per litre
  lastUpdated: new Date().toISOString(),
  source: 'MANUAL'
};

/**
 * Get UK average fuel prices
 * 
 * Attempts to fetch from cache first, then from external sources if cache is stale.
 * Falls back to default prices if all else fails.
 */
export async function getUKAveragePrices(): Promise<UKAveragePrices> {
  // Check cache first
  if (cachedPrices && cacheTimestamp) {
    const now = Date.now();
    const cacheAge = now - cacheTimestamp;
    
    if (cacheAge < CACHE_TTL) {
      return cachedPrices;
    }
  }

  // Try to fetch from retailer APIs (Open Data Scheme)
  try {
    const prices = await fetchRetailerData();
    if (prices) {
      cachedPrices = prices;
      cacheTimestamp = Date.now();
      return prices;
    }
  } catch (error) {
    console.warn('Failed to fetch retailer fuel price data:', error);
  }

  // Try to fetch from government weekly statistics as fallback
  try {
    const prices = await fetchGovernmentData();
    if (prices) {
      cachedPrices = prices;
      cacheTimestamp = Date.now();
      return prices;
    }
  } catch (error) {
    console.warn('Failed to fetch government fuel price data:', error);
  }

  // Fallback to default prices
  if (!cachedPrices) {
    cachedPrices = DEFAULT_PRICES;
    cacheTimestamp = Date.now();
  }

  return cachedPrices;
}

/**
 * Fetch fuel price data from backend API (which proxies retailer API requests)
 * 
 * This avoids CORS issues by fetching through our backend server.
 * The backend handles fetching from multiple retailers and calculating averages.
 */
async function fetchRetailerData(): Promise<UKAveragePrices | null> {
  try {
    // Use the same smart URL detection as the main API service
    const getApiBaseUrl = (): string => {
      if (import.meta.env.VITE_SERVER_URL) {
        return import.meta.env.VITE_SERVER_URL;
      }
      if (import.meta.env.DEV) {
        return 'http://localhost:3001';
      }
      return 'https://fuel-tracker.up.railway.app';
    };

    const apiBaseUrl = getApiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for aggregated request

    const response = await fetch(`${apiBaseUrl}/api/fuel-prices/averages`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Failed to fetch fuel prices from backend:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data as UKAveragePrices;
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch retailer fuel price data from backend:', error);
    return null;
  }
}

// Note: parseRetailerData function was moved to backend server/src/routes/fuelPrices.ts
// to avoid CORS issues. All retailer API requests are now proxied through the backend.

/**
 * Fetch fuel price data from UK Government weekly statistics
 * 
 * Note: The UK Government provides weekly CSV/JSON downloads.
 * This function would need to be implemented based on the actual API endpoint
 * or CSV parsing mechanism.
 * 
 * See: https://www.gov.uk/government/statistics/weekly-road-fuel-prices
 * See: https://www.gov.uk/guidance/access-fuel-price-data
 */
async function fetchGovernmentData(): Promise<UKAveragePrices | null> {
  // TODO: Implement actual API call or CSV parsing
  // For now, return null to use fallback
  
  return null;
}

/**
 * Compare user's price to UK average
 * 
 * @param userPrice - User's price in pence per litre
 * @param averagePrice - UK average price in pence per litre
 * @returns Price comparison data
 */
export function getPriceComparison(
  userPrice: number,
  averagePrice: number
): PriceComparison {
  const difference = userPrice - averagePrice;
  const percentageDifference = (difference / averagePrice) * 100;
  const isBelowAverage = difference < 0;

  return {
    userPrice,
    averagePrice,
    difference: Math.abs(difference),
    percentageDifference: Math.abs(percentageDifference),
    isBelowAverage
  };
}

/**
 * Get average price for a specific fuel grade
 * 
 * @param fuelGrade - Fuel grade type
 * @returns Average price in pence per litre
 */
export async function getAveragePriceForGrade(
  fuelGrade: 'UNLEADED' | 'SUPER_UNLEADED' | 'PREMIUM_DIESEL' | 'STANDARD_DIESEL'
): Promise<number> {
  const prices = await getUKAveragePrices();
  
  switch (fuelGrade) {
    case 'UNLEADED':
      return prices.unleaded;
    case 'SUPER_UNLEADED':
      return prices.superUnleaded;
    case 'PREMIUM_DIESEL':
      return prices.premiumDiesel;
    case 'STANDARD_DIESEL':
      return prices.diesel;
    default:
      return prices.unleaded; // fallback
  }
}

/**
 * Update cached prices manually (for admin/testing)
 * 
 * @param prices - New UK average prices
 */
export function updateCachedPrices(prices: UKAveragePrices): void {
  cachedPrices = prices;
  cacheTimestamp = Date.now();
}

/**
 * Clear the price cache (force refresh on next request)
 */
export function clearPriceCache(): void {
  cachedPrices = null;
  cacheTimestamp = null;
}

/**
 * Get retailer-specific prices
 * 
 * @returns Array of retailer prices, or empty array if not available
 */
export async function getRetailerPrices(): Promise<RetailerPrice[]> {
  const prices = await getUKAveragePrices();
  return prices.retailers || [];
}

/**
 * Get price for a specific retailer
 * 
 * @param retailerName - Name of the retailer
 * @param fuelGrade - Fuel grade type
 * @returns Price in pence per litre, or null if not available
 */
export async function getRetailerPrice(
  retailerName: string,
  fuelGrade: 'UNLEADED' | 'SUPER_UNLEADED' | 'PREMIUM_DIESEL' | 'STANDARD_DIESEL'
): Promise<number | null> {
  const retailers = await getRetailerPrices();
  const retailer = retailers.find(r => 
    r.retailer.toLowerCase().includes(retailerName.toLowerCase()) ||
    retailerName.toLowerCase().includes(r.retailer.toLowerCase())
  );

  if (!retailer) return null;

  switch (fuelGrade) {
    case 'UNLEADED':
      return retailer.unleaded ?? null;
    case 'SUPER_UNLEADED':
      return retailer.superUnleaded ?? null;
    case 'PREMIUM_DIESEL':
      return retailer.premiumDiesel ?? null;
    case 'STANDARD_DIESEL':
      return retailer.diesel ?? null;
    default:
      return null;
  }
}

