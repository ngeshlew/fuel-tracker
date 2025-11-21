import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { getUKAveragePrices, getPriceComparison, getRetailerPrices, UKAveragePrices, RetailerPrice } from '@/services/fuelPriceService';
import { useFuelStore } from '@/store/useFuelStore';

/**
 * UK Fuel Price Comparison Component
 * 
 * Displays current UK average fuel prices and compares them to user's average prices.
 * Features:
 * - Current UK averages for all fuel types
 * - User's average price comparison
 * - Visual indicators (green if below average, red if above)
 * - Data source attribution
 * - Last updated timestamp
 * - Retailer-specific price comparisons
 */

const formatPrice = (price: number) => {
  return `${price.toFixed(1)}p`;
};

export const UKFuelPriceComparison: React.FC = () => {
  const { topups } = useFuelStore();
  const [ukAverages, setUkAverages] = useState<UKAveragePrices | null>(null);
  const [retailers, setRetailers] = useState<RetailerPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const prices = await getUKAveragePrices();
        setUkAverages(prices);
        
        // Fetch retailer-specific prices
        const retailerPrices = await getRetailerPrices();
        setRetailers(retailerPrices);
      } catch (err) {
        console.error('Failed to fetch UK average prices:', err);
        setError('Failed to load UK average prices');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, []);

  // Calculate user's average prices
  const calculateUserAverages = () => {
    if (topups.length === 0) return null;

    const petrolTopups = topups.filter(t => t.fuelType === 'PETROL' && t.fuelGrade === 'UNLEADED');
    const dieselTopups = topups.filter(t => t.fuelType === 'DIESEL' && t.fuelGrade === 'STANDARD_DIESEL');
    const superUnleadedTopups = topups.filter(t => t.fuelType === 'PETROL' && t.fuelGrade === 'SUPER_UNLEADED');
    const premiumDieselTopups = topups.filter(t => t.fuelType === 'DIESEL' && t.fuelGrade === 'PREMIUM_DIESEL');

    const calculateAverage = (topupList: typeof topups) => {
      if (topupList.length === 0) return null;
      const total = topupList.reduce((sum: number, t: typeof topups[0]) => sum + t.costPerLitre, 0);
      return (total / topupList.length) * 100; // Convert to pence per litre
    };

    return {
      unleaded: calculateAverage(petrolTopups),
      diesel: calculateAverage(dieselTopups),
      superUnleaded: calculateAverage(superUnleadedTopups),
      premiumDiesel: calculateAverage(premiumDieselTopups),
    };
  };

  const userAverages = calculateUserAverages();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getSourceLabel = (source: UKAveragePrices['source']) => {
    switch (source) {
      case 'GOVERNMENT':
        return 'UK Government';
      case 'RAC':
        return 'RAC Fuel Watch';
      case 'MANUAL':
        return 'Manual Entry';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-transparent border-dotted">
        <CardHeader>
          <CardTitle className="text-lg font-normal uppercase">UK Price Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !ukAverages) {
    return (
      <Card className="bg-transparent border-dotted">
        <CardHeader>
          <CardTitle className="text-lg font-normal uppercase">UK Price Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error || 'Unable to load price data'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent border-dotted">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-normal uppercase">UK Price Comparison</CardTitle>
          <span className="text-xs text-muted-foreground">
            Updated: {formatDate(ukAverages.lastUpdated)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Source: {getSourceLabel(ukAverages.source)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Unleaded Petrol */}
        {userAverages?.unleaded && (
          <PriceComparisonRow
            label="Unleaded Petrol"
            userPrice={userAverages.unleaded}
            averagePrice={ukAverages.unleaded}
          />
        )}

        {/* Diesel */}
        {userAverages?.diesel && (
          <PriceComparisonRow
            label="Standard Diesel"
            userPrice={userAverages.diesel}
            averagePrice={ukAverages.diesel}
          />
        )}

        {/* Super Unleaded */}
        {userAverages?.superUnleaded && (
          <PriceComparisonRow
            label="Super Unleaded"
            userPrice={userAverages.superUnleaded}
            averagePrice={ukAverages.superUnleaded}
          />
        )}

        {/* Premium Diesel */}
        {userAverages?.premiumDiesel && (
          <PriceComparisonRow
            label="Premium Diesel"
            userPrice={userAverages.premiumDiesel}
            averagePrice={ukAverages.premiumDiesel}
          />
        )}

        {/* Show UK averages if no user data */}
        {!userAverages?.unleaded && !userAverages?.diesel && (
          <div className="space-y-3 pt-2">
            <div className="text-sm font-medium mb-3">Current UK Averages</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Unleaded:</span>
                <span className="ml-2 font-mono">{formatPrice(ukAverages.unleaded)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Diesel:</span>
                <span className="ml-2 font-mono">{formatPrice(ukAverages.diesel)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Super Unleaded:</span>
                <span className="ml-2 font-mono">{formatPrice(ukAverages.superUnleaded)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Premium Diesel:</span>
                <span className="ml-2 font-mono">{formatPrice(ukAverages.premiumDiesel)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Retailer Comparison */}
        {retailers.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-dotted border-border">
            <div className="text-sm font-medium mb-3">Retailer Prices</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {retailers.map((retailer, index) => (
                <RetailerComparisonRow
                  key={`${retailer.retailer}-${index}`}
                  retailer={retailer}
                  userAverages={userAverages}
                  ukAverages={ukAverages}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Data from UK Government Open Data Scheme
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface PriceComparisonRowProps {
  label: string;
  userPrice: number; // pence per litre
  averagePrice: number; // pence per litre
}

const PriceComparisonRow: React.FC<PriceComparisonRowProps> = ({
  label,
  userPrice,
  averagePrice
}) => {
  const comparison = getPriceComparison(userPrice, averagePrice);

  return (
    <div className="border-b border-dotted border-border pb-3 last:border-0 last:pb-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {comparison.isBelowAverage ? (
            <Icon name="trending-down" className="h-4 w-4 text-[var(--color-success)]" />
          ) : (
            <Icon name="trending-up" className="h-4 w-4 text-[var(--color-accent-red)]" />
          )}
          <span className={`text-sm font-mono ${comparison.isBelowAverage ? 'text-[var(--color-success)]' : 'text-[var(--color-accent-red)]'}`}>
            {comparison.isBelowAverage ? 'Below' : 'Above'} Average
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">Your Average:</span>
          <span className="ml-2 font-mono">{formatPrice(userPrice)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">UK Average:</span>
          <span className="ml-2 font-mono">{formatPrice(averagePrice)}</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {comparison.difference.toFixed(1)}p {comparison.isBelowAverage ? 'cheaper' : 'more expensive'} 
        {' '}({comparison.percentageDifference.toFixed(1)}%)
      </div>
    </div>
  );
};

interface UserAverages {
  unleaded: number | null;
  diesel: number | null;
  superUnleaded: number | null;
  premiumDiesel: number | null;
}

interface RetailerComparisonRowProps {
  retailer: RetailerPrice;
  userAverages: UserAverages | null;
  ukAverages: UKAveragePrices;
}

const formatPriceOptional = (price: number | undefined) => {
  if (price === undefined) return '-';
  return `${price.toFixed(1)}p`;
};

const RetailerComparisonRow: React.FC<RetailerComparisonRowProps> = ({
  retailer,
  userAverages
}) => {

  // Show prices for fuel types that the user has data for, or show all if no user data
  const showUnleaded = userAverages?.unleaded || (!userAverages?.unleaded && !userAverages?.diesel);
  const showDiesel = userAverages?.diesel || (!userAverages?.unleaded && !userAverages?.diesel);

  if (!retailer.unleaded && !retailer.diesel && !retailer.superUnleaded && !retailer.premiumDiesel) {
    return null;
  }

  return (
    <div className="border-b border-dotted border-border pb-2 last:border-0">
      <div className="text-xs font-medium mb-1">{retailer.retailer}</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {showUnleaded && retailer.unleaded !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Unleaded:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{formatPriceOptional(retailer.unleaded)}</span>
              {userAverages?.unleaded && (
                <>
                  {retailer.unleaded < userAverages.unleaded ? (
                    <Icon name="trending-down" className="h-3 w-3 text-[var(--color-success)]" />
                  ) : retailer.unleaded > userAverages.unleaded ? (
                    <Icon name="trending-up" className="h-3 w-3 text-[var(--color-accent-red)]" />
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
        {showDiesel && retailer.diesel !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Diesel:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{formatPriceOptional(retailer.diesel)}</span>
              {userAverages?.diesel && (
                <>
                  {retailer.diesel < userAverages.diesel ? (
                    <Icon name="trending-down" className="h-3 w-3 text-[var(--color-success)]" />
                  ) : retailer.diesel > userAverages.diesel ? (
                    <Icon name="trending-up" className="h-3 w-3 text-[var(--color-accent-red)]" />
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
        {retailer.superUnleaded !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Super:</span>
            <span className="font-mono">{formatPriceOptional(retailer.superUnleaded)}</span>
          </div>
        )}
        {retailer.premiumDiesel !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Premium:</span>
            <span className="font-mono">{formatPriceOptional(retailer.premiumDiesel)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

