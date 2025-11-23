import express from 'express';

const router = express.Router();

// Retailer API endpoints from UK Government Open Data Scheme
const RETAILER_ENDPOINTS: Record<string, string> = {
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
  'Tesco': 'https://www.tesco.com/fuel_prices/fuel_prices_data.json',
};

// Default UK average prices (fallback)
const DEFAULT_PRICES = {
  unleaded: 136.8, // pence per litre
  diesel: 145.4, // pence per litre
  superUnleaded: 150.5, // pence per litre
  premiumDiesel: 162.1, // pence per litre
  lastUpdated: new Date().toISOString(),
  source: 'MANUAL' as const,
};

interface RetailerPrice {
  retailer: string;
  unleaded?: number;
  diesel?: number;
  superUnleaded?: number;
  premiumDiesel?: number;
  lastUpdated?: string;
}

interface UKAveragePrices {
  unleaded: number;
  diesel: number;
  superUnleaded: number;
  premiumDiesel: number;
  lastUpdated: string;
  source: 'GOVERNMENT' | 'RAC' | 'MANUAL' | 'RETAILER_AVERAGE';
  retailers?: RetailerPrice[];
}

/**
 * Parse retailer data from various JSON formats
 */
function parseRetailerData(retailer: string, data: any): RetailerPrice | null {
  try {
    const result: RetailerPrice = { retailer };

    let stations: any[] = [];
    
    if (Array.isArray(data)) {
      stations = data;
    } else if (data.stations && Array.isArray(data.stations)) {
      stations = data.stations;
    } else if (data.data && Array.isArray(data.data)) {
      stations = data.data;
    } else if (typeof data === 'object') {
      stations = [data];
    }

    if (stations.length === 0) {
      return null;
    }

    const prices = {
      unleaded: [] as number[],
      diesel: [] as number[],
      superUnleaded: [] as number[],
      premiumDiesel: [] as number[],
    };

    stations.forEach((station: any) => {
      const getPrice = (field: string, altFields: string[] = []) => {
        if (station[field] !== undefined) return parseFloat(station[field]);
        for (const alt of altFields) {
          if (station[alt] !== undefined) return parseFloat(station[alt]);
        }
        return null;
      };

      const unleaded = getPrice('unleaded', ['petrol', 'ULSP', 'ulsp', 'Unleaded', 'UNLEADED']);
      if (unleaded !== null && !isNaN(unleaded)) prices.unleaded.push(unleaded);

      const diesel = getPrice('diesel', ['ULSD', 'ulsd', 'Diesel', 'DIESEL']);
      if (diesel !== null && !isNaN(diesel)) prices.diesel.push(diesel);

      const superUnleaded = getPrice('superUnleaded', ['super_unleaded', 'super', 'Super Unleaded', 'SUPER_UNLEADED']);
      if (superUnleaded !== null && !isNaN(superUnleaded)) prices.superUnleaded.push(superUnleaded);

      const premiumDiesel = getPrice('premiumDiesel', ['premium_diesel', 'premium', 'Premium Diesel', 'PREMIUM_DIESEL']);
      if (premiumDiesel !== null && !isNaN(premiumDiesel)) prices.premiumDiesel.push(premiumDiesel);
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

    // Only assign if value is defined (required by exactOptionalPropertyTypes)
    const avgUnleaded = avg(prices.unleaded);
    if (avgUnleaded !== undefined) result.unleaded = avgUnleaded;
    
    const avgDiesel = avg(prices.diesel);
    if (avgDiesel !== undefined) result.diesel = avgDiesel;
    
    const avgSuperUnleaded = avg(prices.superUnleaded);
    if (avgSuperUnleaded !== undefined) result.superUnleaded = avgSuperUnleaded;
    
    const avgPremiumDiesel = avg(prices.premiumDiesel);
    if (avgPremiumDiesel !== undefined) result.premiumDiesel = avgPremiumDiesel;
    
    result.lastUpdated = new Date().toISOString();

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
 * GET /api/fuel-prices/averages - Get UK average fuel prices
 * 
 * Fetches data from retailer APIs and calculates averages.
 * This endpoint proxies requests to avoid CORS issues.
 */
router.get('/averages', async (_req, res) => {
  try {
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Fuel-Tracker/1.0',
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

          if (prices.unleaded !== undefined) priceSums.unleaded.push(prices.unleaded);
          if (prices.diesel !== undefined) priceSums.diesel.push(prices.diesel);
          if (prices.superUnleaded !== undefined) priceSums.superUnleaded.push(prices.superUnleaded);
          if (prices.premiumDiesel !== undefined) priceSums.premiumDiesel.push(prices.premiumDiesel);
        }

        return prices;
      } catch (error) {
        console.debug(`Failed to fetch from ${retailer}:`, error);
        return null;
      }
    });

    await Promise.allSettled(fetchPromises);

    // Calculate averages if we have data
    if (retailerPrices.length === 0) {
      // Return default prices if no retailer data available
      res.json({
        success: true,
        data: DEFAULT_PRICES,
      });
      return;
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

    res.json({
      success: true,
      data: averages,
    });
    return;
  } catch (error) {
    console.error('Failed to fetch fuel prices:', error);
    // Return default prices on error
    res.json({
      success: true,
      data: DEFAULT_PRICES,
    });
    return;
  }
});

/**
 * GET /api/fuel-prices/retailers - Get list of available retailers
 */
router.get('/retailers', (_req, res) => {
  res.json({
    success: true,
    data: Object.keys(RETAILER_ENDPOINTS),
  });
});

export default router;

