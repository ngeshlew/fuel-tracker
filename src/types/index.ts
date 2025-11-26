// Core data types for the Fuel Tracker application

export interface FuelTopup {
  id: string;
  vehicleId: string; // Vehicle identifier (replaces meterId)
  litres: number; // Litres of fuel added
  costPerLitre: number; // Cost per litre in currency
  totalCost: number; // Total cost for this topup (litres * costPerLitre, includes VAT)
  mileage?: number; // Optional mileage at time of topup
  date: Date;
  type: 'MANUAL' | 'IMPORTED' | 'ESTIMATED';
  fuelType?: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID'; // Type of fuel
  retailer?: string; // Fuel retailer (e.g., "Sainsbury's", "BP", "Shell", "Tesco", "Asda", "Morrisons", "Esso", "Texaco", "TotalEnergies", "Costco")
  fuelGrade?: 'UNLEADED' | 'SUPER_UNLEADED' | 'PREMIUM_DIESEL' | 'STANDARD_DIESEL'; // Fuel grade
  vatRate?: number; // VAT rate percentage (e.g., 20.00)
  netPrice?: number; // Net price before VAT
  vatAmount?: number; // VAT amount
  locationName?: string; // Location name from Google Maps (e.g., "Sainsbury's Chertsey")
  address?: string; // Full address from Google Maps
  latitude?: number; // Latitude coordinate
  longitude?: number; // Longitude coordinate
  placeId?: string; // Google Maps Place ID
  notes?: string;
  // Derived fields for analytics; may be absent depending on source
  consumption?: number; // Litres consumed since last topup (if mileage tracked)
  efficiency?: number; // Miles per litre (if mileage tracked)
  isFirstTopup?: boolean; // Flag to mark the initial topup
  createdAt: Date;
  updatedAt: Date;
}

// Mileage tracking types
export interface MileageEntry {
  id: string;
  vehicleId: string;
  date: Date;
  odometerReading: number;      // Current odometer reading in miles
  tripDistance?: number;        // Optional: specific trip distance
  tripPurpose?: 'COMMUTE' | 'BUSINESS' | 'LEISURE' | 'HOLIDAY' | 'OTHER'; // Trip purpose category
  notes?: string;
  linkedFuelTopupId?: string;   // If mileage came from a fuel topup
  type: 'MANUAL' | 'FUEL_LINKED';
  createdAt: Date;
  updatedAt: Date;
}

// Mileage chart data types
export interface MileageChartDataPoint {
  date: string;
  miles: number;
  odometerReading?: number;
  tripDistance?: number;
  tripPurpose?: string;
  label?: string;
}

// UK Seasons for seasonal tracking
export type UKSeason = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

export interface SeasonalMileageData {
  season: UKSeason;
  year: number;
  totalMiles: number;
  averageDailyMiles: number;
  entryCount: number;
  startDate: Date;
  endDate: Date;
}

// Mileage form type
export interface MileageEntryForm {
  date: Date;
  odometerReading: number;
  tripDistance?: number;
  tripPurpose?: 'COMMUTE' | 'BUSINESS' | 'LEISURE' | 'HOLIDAY' | 'OTHER';
  notes?: string;
}

// Trip purpose constants
export const TRIP_PURPOSES = {
  COMMUTE: 'COMMUTE',
  BUSINESS: 'BUSINESS',
  LEISURE: 'LEISURE',
  HOLIDAY: 'HOLIDAY',
  OTHER: 'OTHER',
} as const;

// UK Seasons constants with month ranges
export const UK_SEASONS = {
  SPRING: { name: 'Spring', months: [2, 3, 4] },      // March, April, May (0-indexed: 2, 3, 4)
  SUMMER: { name: 'Summer', months: [5, 6, 7] },      // June, July, August
  AUTUMN: { name: 'Autumn', months: [8, 9, 10] },     // September, October, November
  WINTER: { name: 'Winter', months: [11, 0, 1] },     // December, January, February
} as const;

export interface ConsumptionData {
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  litres: number; // Changed from kwh to litres
  cost: number;
  averageDailyUsage: number; // Average litres per day
  trend: 'increasing' | 'decreasing' | 'stable';
  mileage?: number; // Optional mileage if tracked
  efficiency?: number; // Optional miles per litre if mileage tracked
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'dark' | 'light';
  currency: 'GBP' | 'USD' | 'EUR';
  defaultFuelType?: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
  trackMileage: boolean; // Whether to track mileage
  notifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  entityType: 'fuel_topup' | 'user_preferences';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, unknown>;
  userId: string;
  timestamp: Date;
}

// Chart data types
export interface ChartDataPoint {
  date: string;
  litres: number; // Changed from kwh to litres
  cost: number;
  mileage?: number; // Optional mileage
  efficiency?: number; // Optional miles per litre
  label?: string;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface TimeSeriesData {
  period: string;
  data: ChartDataPoint[];
  totalLitres: number; // Changed from totalKwh to totalLitres
  totalCost: number;
  averageDaily: number; // Average litres per day
  trend: 'increasing' | 'decreasing' | 'stable';
  averageEfficiency?: number; // Optional average miles per litre
}

// Form types
export interface FuelTopupForm {
  litres: number;
  costPerLitre: number;
  mileage?: number; // Optional
  date: Date;
  fuelType?: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
  retailer?: string;
  fuelGrade?: 'UNLEADED' | 'SUPER_UNLEADED' | 'PREMIUM_DIESEL' | 'STANDARD_DIESEL';
  vatRate?: number;
  netPrice?: number;
  vatAmount?: number;
  locationName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  notes?: string;
}

// EnergyStatementForm removed - not needed for fuel tracking

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// UI state types
export interface UIState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

export interface DashboardState {
  currentMonth: TimeSeriesData;
  previousMonth: TimeSeriesData;
  totalLitres: number; // Changed from totalKwh
  totalCost: number;
  averageDaily: number; // Average litres per day
  trend: 'increasing' | 'decreasing' | 'stable';
  averageEfficiency?: number; // Optional average miles per litre
}

export interface FuelTopupState {
  topups: FuelTopup[];
  isLoading: boolean;
  error: string | null;
  selectedTopup: FuelTopup | null;
  isPanelOpen: boolean;
}

export interface AnalyticsState {
  timeSeriesData: TimeSeriesData[];
  pieChartData: PieChartData[];
  selectedPeriod: 'daily' | 'weekly' | 'monthly';
  selectedDateRange: {
    start: Date;
    end: Date;
  };
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ChartProps extends BaseComponentProps {
  data: ChartDataPoint[];
  height?: number;
  width?: number;
  showTooltip?: boolean;
  showLegend?: boolean;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'number' | 'email' | 'password' | 'date';
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event types
export interface FuelTopupEvent {
  type: 'topup_added' | 'topup_updated' | 'topup_deleted';
  topup: FuelTopup;
  timestamp: Date;
}

export interface AnalyticsEvent {
  type: 'period_changed' | 'chart_interacted' | 'data_exported';
  data: unknown;
  timestamp: Date;
}

// Configuration types
export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    realTimeUpdates: boolean;
    dataExport: boolean;
    analytics: boolean;
    notifications: boolean;
  };
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// Constants
export const FUEL_TOPUP_TYPES = {
  MANUAL: 'MANUAL',
  IMPORTED: 'IMPORTED',
  ESTIMATED: 'ESTIMATED',
} as const;

export const FUEL_TYPES = {
  PETROL: 'PETROL',
  DIESEL: 'DIESEL',
  ELECTRIC: 'ELECTRIC',
  HYBRID: 'HYBRID',
} as const;

export const CONSUMPTION_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export const TREND_TYPES = {
  INCREASING: 'increasing',
  DECREASING: 'decreasing',
  STABLE: 'stable',
} as const;

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
} as const;

export const CURRENCIES = {
  GBP: 'GBP',
  USD: 'USD',
  EUR: 'EUR',
} as const;
