# Build Fixes Needed

## Summary
The build is failing due to TypeScript errors from the electricity-tracker to fuel-tracker migration. Many components still reference old field names and stores.

## Critical Fixes Applied
✅ Updated `SummaryCards.tsx` - Changed `kwh` to `litres`, `totalKwh` to `totalLitres`
✅ Updated `ConsumptionChart.tsx` - Changed to use `useFuelStore` and `topups`
✅ Updated `Header.tsx` - Changed to use `useFuelStore` and `litres`
✅ Updated `Dashboard.tsx` - Changed to use fuel components
✅ Updated `App.tsx` - Changed to use `useFuelStore`

## Remaining Fixes Needed

### Pattern 1: Replace `.kwh` with `.litres` in ChartDataPoint
Files that need this fix:
- `src/components/ai/AIInsights.tsx` (line 35)
- `src/components/analytics/AnalyticsPage.tsx` (lines 24, 40, 42)
- `src/components/analytics/ExportOptions.tsx` (line 81)
- `src/components/dashboard/AnnualProgressCards.tsx` (line 41)
- `src/components/dashboard/UKAverageComparison.tsx` (line 29)
- `src/components/statements/StatementsPage.tsx` (line 50)
- `src/hooks/useAnalytics.tsx` (line 62)
- `src/store/useElectricityStore.ts` (lines 707, 739, 787, 838, 956, 957)

### Pattern 2: Replace `totalKwh` with `totalLitres` in TimeSeriesData
Files that need this fix:
- `src/components/analytics/ExportOptions.tsx` (line 91)
- `src/store/useElectricityStore.ts` (line 837)

### Pattern 3: Replace `useElectricityStore` with `useFuelStore`
Files that need this fix:
- `src/components/dashboard/MonthlyOverview.tsx`
- `src/components/dashboard/ConsumptionBreakdown.tsx`
- `src/components/dashboard/DailyBreakdown.tsx`
- `src/components/dashboard/WeeklyPieChart.tsx`
- `src/components/dashboard/SeasonalTracker.tsx`
- `src/components/dashboard/AnnualProgressCards.tsx`
- `src/components/dashboard/UKAverageComparison.tsx`
- `src/components/analytics/AnalyticsPage.tsx`
- `src/components/analytics/ExportOptions.tsx`
- `src/components/ai/AIInsights.tsx`
- `src/components/insights/AIInsights.tsx`
- `src/components/statements/StatementsPage.tsx`
- `src/store/useElectricityStore.ts` (should be removed or updated)

### Pattern 4: Replace `unitRate` and `standingCharge` with fuel equivalents
Files that need this fix:
- `src/components/dashboard/ConsumptionBreakdown.tsx` (lines 73, 90, 112, 154, 162)
- `src/components/dashboard/DailyBreakdown.tsx` (lines 58, 82)
- `src/components/dashboard/MonthlyOverview.tsx` (lines 54, 92, 124, 151, 191)
- `src/components/dashboard/WeeklyPieChart.tsx` (lines 64, 85)
- `src/store/useElectricityStore.ts` (lines 904, 907, 938, 939)

Note: For fuel tracking, we don't use `unitRate` or `standingCharge` in the same way. These should be removed or replaced with fuel-specific calculations.

### Pattern 5: Replace `MeterReading` with `FuelTopup`
Files that need this fix:
- `src/components/meter-reading/MeterReadingsLog.tsx` (line 31)
- `src/hooks/useMeterReading.tsx` (line 2)
- `src/hooks/useMeterReadingContext.tsx` (line 2)
- `src/test-setup.ts` (line 4)
- `src/utils/consumptionSeries.test.ts`
- `src/utils/consumptionSeries 2.ts`
- `src/utils/consumptionSeries 3.ts`
- `src/utils/statementToTariff.ts` and variants

### Pattern 6: Replace API method names
Files that need this fix:
- `src/store/useElectricityStore.ts`:
  - `createMeterReading` → `createFuelTopup`
  - `updateMeterReading` → `updateFuelTopup`
  - `deleteMeterReading` → `deleteFuelTopup`
  - `getMeterReadings` → `getFuelTopups`

### Pattern 7: Replace Socket method names
Files that need this fix:
- `src/store/useElectricityStore.ts`:
  - `onMeterReadingAdded` → `onFuelTopupAdded`
  - `onMeterReadingUpdated` → `onFuelTopupUpdated`
  - `onMeterReadingDeleted` → `onFuelTopupDeleted`
  - `offMeterReadingAdded` → `offFuelTopupAdded`
  - `offMeterReadingUpdated` → `offFuelTopupUpdated`
  - `offMeterReadingDeleted` → `offFuelTopupDeleted`

### Pattern 8: Replace `EnergyStatement` with `FuelStatement`
Files that need this fix:
- `src/utils/statementToTariff.ts` and all variants

## Quick Fix Script

You can use find/replace in your editor to fix these patterns:

1. **Find**: `\.kwh` → **Replace**: `.litres`
2. **Find**: `totalKwh` → **Replace**: `totalLitres`
3. **Find**: `useElectricityStore` → **Replace**: `useFuelStore`
4. **Find**: `MeterReading` → **Replace**: `FuelTopup`
5. **Find**: `EnergyStatement` → **Replace**: `FuelStatement`
6. **Find**: `readings` → **Replace**: `topups` (in store context)
7. **Find**: `unitRate` → **Replace**: Remove or use fuel-specific calculation
8. **Find**: `standingCharge` → **Replace**: Remove or use fuel-specific calculation

## Files to Delete or Update

These files are duplicates or old versions and should be cleaned up:
- `src/components/meter-reading/` - Should be replaced with `fuel-topup/`
- `src/store/useElectricityStore.ts` - Should be removed (use `useFuelStore` instead)
- `src/hooks/useMeterReading.tsx` - Should be removed or updated
- `src/hooks/useMeterReadingContext.tsx` - Should be removed or updated
- All `* 2.ts`, `* 3.ts`, `* 4.ts`, `* 5.tsx` duplicate files

## Priority Order

1. **Critical for build**: Fix all `.kwh` → `.litres` references
2. **Critical for build**: Fix all `useElectricityStore` → `useFuelStore` references
3. **Critical for build**: Fix all `totalKwh` → `totalLitres` references
4. **Important**: Fix API and Socket method names
5. **Important**: Remove or update `unitRate`/`standingCharge` references
6. **Cleanup**: Remove duplicate files and old meter-reading components

