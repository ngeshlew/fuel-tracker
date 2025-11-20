// This file is deprecated - EnergyStatement is not used in fuel tracking
// Keeping for backward compatibility but not actively used

// import { EnergyStatement } from '@/types';
import { TariffInfo } from '@/services/ukElectricityApi';
import { useTariffStore } from '@/store/useTariffStore';

/**
 * Convert an EnergyStatement to TariffInfo
 * @deprecated - Not used in fuel tracking
 */
export const convertStatementToTariff = (statement: any): TariffInfo => {
  return {
    id: `tariff-statement-${statement.id}`,
    provider: statement.supplier || 'Unknown',
    tariffName: `${statement.supplier || 'Unknown'} Statement Tariff`,
    productType: 'Variable',
    unitRate: statement.unitRate || 0,
    standingCharge: statement.standingCharge || 0,
    startDate: statement.periodStart?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    endDate: statement.periodEnd?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    paymentMethod: 'Direct Debit',
    earlyExitFee: 0,
    estimatedAnnualUsage: 1180.1,
    estimatedAnnualCost: 0,
  };
};

/**
 * Create tariff from statement and add to tariff store
 * @deprecated - Not used in fuel tracking
 */
export const createTariffFromStatement = (statement: any): void => {
  const tariffStore = useTariffStore.getState();
  const tariff = convertStatementToTariff(statement);

  // Check if this is current or historical
  const today = new Date();
  if (new Date(statement.periodEnd || today) >= today) {
    tariffStore.setCurrentTariff(tariff);
  } else {
    tariffStore.addHistoricalTariff(tariff);
  }
};

/**
 * Check if statement period overlaps with existing tariffs
 * @deprecated - Not used in fuel tracking
 */
export const checkStatementOverlap = (statement: any): boolean => {
  const tariffStore = useTariffStore.getState();
  const startDate = statement.periodStart?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
  const endDate = statement.periodEnd?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
  
  return tariffStore.checkDateOverlap(startDate, endDate);
};
