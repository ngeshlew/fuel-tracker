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
 * Fetch fuel price data from retailer APIs (UK Government Open Data Scheme)
 * 
 * Fetches data from multiple retailers and calculates averages.
 * Each retailer may have different JSON structures, so we handle various formats.
 */
async function fetchRetailerData(): Promise<UKAveragePrices | null> {
  const retailerPrices: RetailerPrice[] = [];
  const priceSums = {
    unleaded: [] as number[],
    diesel: [] as number[],
    superUnleaded: [] as number[],
    premiumDiesel: [] as number[],
  };

  // Fetch from all retailers in parallel with timeout
  const fetchPromises = Object.entries(RETAILER_ENDPOINTS).map(async ([retailer, url]) => {
    try {
      // Skip Shell as it's HTML, not JSON
      if (retailer === 'Shell') {
        return null;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const prices = parseRetailerData(retailer, data);

      if (prices) {
        retailerPrices.push(prices);

        // Add to sums for averaging
        if (prices.unleaded !== undefined) priceSums.unleaded.push(prices.unleaded);
        if (prices.diesel !== undefined) priceSums.diesel.push(prices.diesel);
        if (prices.superUnleaded !== undefined) priceSums.superUnleaded.push(prices.superUnleaded);
        if (prices.premiumDiesel !== undefined) priceSums.premiumDiesel.push(prices.premiumDiesel);
      }

      return prices;
    } catch (error) {
      // Silently fail for individual retailers - we'll use what we can get
      console.debug(`Failed to fetch from ${retailer}:`, error);
      return null;
    }
  });

  await Promise.allSettled(fetchPromises);

  // Calculate averages if we have data
  if (retailerPrices.length === 0) {
    return null;
  }

  const calculateAverage = (prices: number[]) => {
    if (prices.length === 0) return undefined;
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  };

  const averages: UKAveragePrices = {
    unleaded: calculateAverage(priceSums.unleaded) ?? DEFAULT_PRICES.unleaded,
    diesel: calculateAverage(priceSums.diesel) ?? DEFAULT_PRICES.diesel,
    superUnleaded: calculateAverage(priceSums.superUnleaded) ?? DEFAULT_PRICES.superUnleaded,
    premiumDiesel: calculateAverage(priceSums.premiumDiesel) ?? DEFAULT_PRICES.premiumDiesel,
    lastUpdated: new Date().toISOString(),
    source: 'RETAILER_AVERAGE',
    retailers: retailerPrices,
  };

  return averages;
}

/**
 * Parse retailer data from various JSON formats
 * 
 * Different retailers use different JSON structures, so we need to handle multiple formats.
 */
function parseRetailerData(retailer: string, data: any): RetailerPrice | null {
  try {
    const result: RetailerPrice = { retailer };

    // Common patterns in retailer JSON structures:
    // 1. Array of stations with prices
    // 2. Object with fuel type keys
    // 3. Nested structure with stations array

    // Try to extract prices from various possible structures
    let stations: any[] = [];
    
    if (Array.isArray(data)) {
      stations = data;
    } else if (data.stations && Array.isArray(data.stations)) {
      stations = data.stations;
    } else if (data.data && Array.isArray(data.data)) {
      stations = data.data;
    } else if (typeof data === 'object') {
      // Might be a single object with price fields
      stations = [data];
    }

    if (stations.length === 0) {
      return null;
    }

    // Extract prices from stations
    const prices = {
      unleaded: [] as number[],
      diesel: [] as number[],
      superUnleaded: [] as number[],
      premiumDiesel: [] as number[],
    };

    stations.forEach((station: any) => {
      // Try various field name patterns
      const getPrice = (field: string, altFields: string[] = []) => {
        if (station[field] !== undefined) return parseFloat(station[field]);
        for (const alt of altFields) {
          if (station[alt] !== undefined) return parseFloat(station[alt]);
        }
        return null;
      };

      // Unleaded / Petrol
      const unleaded = getPrice('unleaded', ['petrol', 'ULSP', 'ulsp', 'Unleaded', 'UNLEADED']);
      if (unleaded !== null && !isNaN(unleaded)) prices.unleaded.push(unleaded);

      // Diesel
      const diesel = getPrice('diesel', ['ULSD', 'ulsd', 'Diesel', 'DIESEL']);
      if (diesel !== null && !isNaN(diesel)) prices.diesel.push(diesel);

      // Super Unleaded
      const superUnleaded = getPrice('superUnleaded', ['super_unleaded', 'super', 'Super Unleaded', 'SUPER_UNLEADED']);
      if (superUnleaded !== null && !isNaN(superUnleaded)) prices.superUnleaded.push(superUnleaded);

      // Premium Diesel
      const premiumDiesel = getPrice('premiumDiesel', ['premium_diesel', 'premium', 'Premium Diesel', 'PREMIUM_DIESEL']);
      if (premiumDiesel !== null && !isNaN(premiumDiesel)) prices.premiumDiesel.push(premiumDiesel);
    });

    // Calculate averages for this retailer
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

    result.unleaded = avg(prices.unleaded);
    result.diesel = avg(prices.diesel);
    result.superUnleaded = avg(prices.superUnleaded);
    result.premiumDiesel = avg(prices.premiumDiesel);
    result.lastUpdated = new Date().toISOString();

    // Only return if we have at least one price
    if (result.unleaded !== undefined || result.diesel !== undefined || 
        result.superUnleaded !== undefined || result.premiumDiesel !== undefined) {
      return result;
    }

    return null;
  } catch (error) {
    console.debug(`Failed to parse data from ${retailer}:`, error);
    return null;
  }
}

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

