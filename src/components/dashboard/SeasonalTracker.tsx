import React, { useMemo } from 'react';
import { SeasonalComparison } from '@/components/shared/SeasonalComparison';
import { useFuelStore } from '@/store/useFuelStore';

/**
 * Seasonal fuel use by season-year, with a year stepper and an optional
 * comparison against the previous year. The shared SeasonalComparison does
 * the work; this adapter only maps top-ups to season points.
 */
export const SeasonalTracker: React.FC = () => {
  const { chartData, isLoading } = useFuelStore();

  const points = useMemo(
    () => (chartData ?? []).map(point => ({ date: point.date, value: point.litres, cost: point.cost })),
    [chartData],
  );

  return (
    <SeasonalComparison
      points={points}
      isLoading={isLoading}
      title="Seasonal fuel use"
      description="Compare the fuel you buy season by season"
      unit="L"
      perDayUnit="L/day"
    />
  );
};
