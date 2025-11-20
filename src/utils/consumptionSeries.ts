import type { FuelTopup } from '@/types';

export interface DailyConsumptionPoint {
  date: string;
  consumption: number; // Litres
  cost: number;
  mileage?: number;
  efficiency?: number; // Miles per litre
}

interface BuildSeriesOptions {
  fillMissingDays?: boolean;
}

/**
 * Build a daily consumption series directly from fuel topups.
 * For fuel tracking, consumption is the litres added in each topup.
 */
const getLocalDateKey = (date: Date): string => {
  const local = new Date(date);
  local.setHours(0, 0, 0, 0);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
};

export const buildDailyConsumptionSeries = (
  topups: FuelTopup[],
  options: BuildSeriesOptions = { fillMissingDays: true }
): DailyConsumptionPoint[] => {
  if (!topups || topups.length === 0) return [];

  const sorted = [...topups].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dailyBestTopup = new Map<string, FuelTopup>();
  sorted.forEach((topup) => {
    const dateKey = getLocalDateKey(new Date(topup.date));
    const existing = dailyBestTopup.get(dateKey);
    if (!existing) {
      dailyBestTopup.set(dateKey, topup);
      return;
    }
    if (topup.type === 'MANUAL' && existing.type !== 'MANUAL') {
      dailyBestTopup.set(dateKey, topup);
      return;
    }
    if (new Date(topup.date).getTime() > new Date(existing.date).getTime()) {
      dailyBestTopup.set(dateKey, topup);
    }
  });

  const normalizedTopups = Array.from(dailyBestTopup.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dailyMap = new Map<string, DailyConsumptionPoint>();

  for (let i = 0; i < normalizedTopups.length; i++) {
    const current = normalizedTopups[i];

    if (!current) continue;
    if (current.isFirstTopup && i === 0) {
      // First topup - show 0 consumption
      const isoDate = getLocalDateKey(new Date(current.date));
      dailyMap.set(isoDate, {
        date: isoDate,
        consumption: 0,
        cost: 0,
        mileage: current.mileage,
      });
      continue;
    }

    const currentDate = new Date(current.date);
    const isoDate = getLocalDateKey(currentDate);

    // Calculate efficiency if mileage is tracked
    let efficiency: number | undefined = undefined;
    const prevTopup = i > 0 ? normalizedTopups[i - 1] : undefined;
    if (prevTopup && current.mileage && prevTopup.mileage) {
      const milesDriven = current.mileage - prevTopup.mileage;
      if (milesDriven > 0 && current.litres > 0) {
        efficiency = milesDriven / current.litres; // Miles per litre
      }
    }

    // For fuel, consumption is the litres added in this topup
    const consumption = current.litres;
    const cost = current.totalCost;

    if (dailyMap.has(isoDate)) {
      const existing = dailyMap.get(isoDate)!;
      dailyMap.set(isoDate, {
        date: isoDate,
        consumption: existing.consumption + consumption,
        cost: existing.cost + cost,
        mileage: current.mileage || existing.mileage,
        efficiency: efficiency || existing.efficiency,
      });
    } else {
      dailyMap.set(isoDate, {
        date: isoDate,
        consumption,
        cost,
        mileage: current.mileage,
        efficiency,
      });
    }

    // Fill missing days if option is enabled
    if (options.fillMissingDays && i > 0) {
      const previous = normalizedTopups[i - 1];
      const previousDate = new Date(previous.date);
      const gapDate = new Date(previousDate);
      gapDate.setDate(gapDate.getDate() + 1);
      while (gapDate < currentDate) {
        const gapIso = gapDate.toISOString().split('T')[0];
        if (!dailyMap.has(gapIso)) {
          dailyMap.set(gapIso, {
            date: gapIso,
            consumption: 0,
            cost: 0,
          });
        }
        gapDate.setDate(gapDate.getDate() + 1);
      }
    }
  }

  if (dailyMap.size === 0) return [];

  return Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};


