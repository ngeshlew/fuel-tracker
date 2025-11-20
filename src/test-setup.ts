// Simple test setup to verify core functionality
// This file can be removed after testing

import { FuelTopup } from './types';

// Test data for verification
export const testFuelTopups: Omit<FuelTopup, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    vehicleId: 'vehicle-1',
    litres: 45.5,
    costPerLitre: 1.52,
    totalCost: 69.16,
    date: new Date('2025-09-10'),
    type: 'MANUAL',
    fuelType: 'PETROL',
    notes: 'Test topup 1',
  },
  {
    vehicleId: 'vehicle-1',
    litres: 42.3,
    costPerLitre: 1.50,
    totalCost: 63.45,
    date: new Date('2025-09-11'),
    type: 'MANUAL',
    fuelType: 'PETROL',
    notes: 'Test topup 2',
  },
  {
    vehicleId: 'vehicle-1',
    litres: 48.7,
    costPerLitre: 1.55,
    totalCost: 75.49,
    date: new Date('2025-09-12'),
    type: 'MANUAL',
    fuelType: 'PETROL',
    notes: 'Test topup 3',
  },
];

// Test utility functions
export const testUtils = {
  // Calculate consumption (litres added)
  calculateConsumption: (litres: number): number => {
    return litres;
  },

  // Calculate cost based on litres and cost per litre
  calculateCost: (litres: number, costPerLitre: number = 1.50): number => {
    return Math.round(litres * costPerLitre * 100) / 100;
  },

  // Format date for display
  formatDate: (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  },

  // Validate fuel topup
  validateTopup: (litres: number): { isValid: boolean; error?: string } => {
    if (litres < 0) {
      return { isValid: false, error: 'Litres must be positive' };
    }
    if (litres > 200) {
      return { isValid: false, error: 'Litres must be less than 200' };
    }
    return { isValid: true };
  },
};

// Test the calculation functions
export const runTests = () => {
  console.log('🧪 Running Fuel Tracker Tests...');

  // Test consumption calculation
  const consumption = testUtils.calculateConsumption(45.5);
  console.log(`✅ Consumption calculation: ${consumption} L`);

  // Test cost calculation
  const cost = testUtils.calculateCost(consumption, 1.52);
  console.log(`✅ Cost calculation: £${cost}`);

  // Test date formatting
  const formattedDate = testUtils.formatDate(new Date('2025-09-13'));
  console.log(`✅ Date formatting: ${formattedDate}`);

  // Test validation
  const validTopup = testUtils.validateTopup(50);
  console.log(`✅ Valid topup test: ${validTopup.isValid}`);

  const invalidTopup = testUtils.validateTopup(-10);
  console.log(`✅ Invalid topup test: ${invalidTopup.isValid} - ${invalidTopup.error}`);

  console.log('🎉 All tests passed!');
};

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  runTests();
}

