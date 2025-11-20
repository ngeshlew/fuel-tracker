import { FuelTopup } from '../types';

/**
 * Export fuel topups to CSV format
 */
export const exportToCSV = (topups: FuelTopup[], filename: string = 'fuel-topups.csv') => {
  // CSV header
  const headers = ['Date', 'Time', 'Litres', 'Cost Per Litre', 'Total Cost', 'Mileage', 'Fuel Type', 'Type', 'Notes', 'Created At', 'Updated At'];
  
  // Convert topups to CSV rows
  const rows = topups.map(topup => {
    const date = new Date(topup.date);
    const createdAt = new Date(topup.createdAt);
    const updatedAt = new Date(topup.updatedAt);
    
    return [
      date.toLocaleDateString('en-GB'),
      date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      topup.litres.toString(),
      topup.costPerLitre.toString(),
      topup.totalCost.toString(),
      topup.mileage?.toString() || '',
      topup.fuelType || '',
      topup.type,
      topup.notes || '',
      createdAt.toLocaleString('en-GB'),
      updatedAt.toLocaleString('en-GB'),
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });
  
  // Combine headers and rows
  const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export fuel topups to JSON format
 */
export const exportToJSON = (topups: FuelTopup[], filename: string = 'fuel-topups.json') => {
  const jsonContent = JSON.stringify(topups, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Filter topups by date range
 */
export const filterTopupsByDateRange = (
  topups: FuelTopup[],
  startDate: Date,
  endDate: Date
): FuelTopup[] => {
  return topups.filter(topup => {
    const topupDate = new Date(topup.date);
    return topupDate >= startDate && topupDate <= endDate;
  });
};

