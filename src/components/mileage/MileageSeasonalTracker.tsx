import React, { useMemo } from 'react';
import { SeasonalComparison } from '@/components/shared/SeasonalComparison';
import type { SeasonPoint } from '@/utils/seasons';
import { useMileageStore } from '@/store/useMileageStore';

/**
 * Seasonal mileage by season-year, with a year stepper and an optional
 * comparison against the previous year. Miles come from the difference
 * between consecutive odometer readings and land on the later reading's date,
 * matching the mileage store's chart data.
 */
export const MileageSeasonalTracker: React.FC = () => {
  const { entries, isLoading } = useMileageStore();

  const points = useMemo<SeasonPoint[]>(() => {
    const sorted = [...(entries ?? [])].sort((a, b) => {
      const byDate = new Date(a.date).toISOString().slice(0, 10).localeCompare(new Date(b.date).toISOString().slice(0, 10));
      return byDate !== 0 ? byDate : a.odometerReading - b.odometerReading;
    });
    const out: SeasonPoint[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const miles = sorted[i].odometerReading - sorted[i - 1].odometerReading;
      if (miles >= 0) out.push({ date: new Date(sorted[i].date).toISOString().slice(0, 10), value: miles });
    }
    return out;
  }, [entries]);

  return (
    <SeasonalComparison
      points={points}
      isLoading={isLoading}
      title="Seasonal mileage"
      description="Compare the miles you drive season by season"
      unit="mi"
      perDayUnit="mi/day"
      decimals={0}
      showCost={false}
      emptyMessage="Add odometer readings to see how your mileage changes through the year."
    />
  );
};
