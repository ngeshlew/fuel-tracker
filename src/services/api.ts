// API service for communicating with the backend
// Smart API URL resolution:
// 1. Use VITE_SERVER_URL if explicitly set (allows override for testing/staging)
// 2. In development mode, automatically use localhost:3001
// 3. Otherwise, fall back to production Railway URL
const getApiBaseUrl = (): string => {
  // Explicit environment variable takes precedence
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  
  // Auto-detect local development
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  
  // Production fallback
  return 'https://fuel-tracker.up.railway.app';
};

const API_BASE_URL = getApiBaseUrl();

// Export getApiBaseUrl for use in other services
export { getApiBaseUrl };

// Log API URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔧 API Base URL:', API_BASE_URL);
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface FuelTopup {
  id: string;
  vehicleId: string;
  litres: number;
  costPerLitre: number;
  totalCost: number;
  mileage?: number;
  date: string;
  type: 'MANUAL' | 'IMPORTED' | 'ESTIMATED';
  fuelType?: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID';
  notes?: string;
  isFirstTopup?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumptionData {
  date: string;
  litres: number;
  cost: number;
  topupId: string;
  mileage?: number;
  efficiency?: number; // Miles per litre
}

export interface AnalyticsSummary {
  totalConsumption: number; // Total litres
  totalCost: number;
  dailyAverage: number; // Average litres per day
  trend: 'increasing' | 'decreasing' | 'stable';
  topupCount: number;
  averageEfficiency?: number; // Average miles per litre
  period: {
    start: string | null;
    end: string | null;
  };
}

export interface TrendData {
  period: string;
  totalLitres: number;
  totalCost: number;
  averageDaily: number; // Average litres per day
  dataCount: number;
  averageEfficiency?: number; // Average miles per litre
}

export interface MileageEntry {
  id: string;
  vehicleId: string;
  date: string;
  odometerReading: number;
  tripDistance?: number | null;
  tripPurpose?: string | null;
  notes?: string | null;
  linkedFuelTopupId?: string | null;
  type: 'MANUAL' | 'FUEL_LINKED';
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      // Handle network errors and CORS issues
      if (!response.ok) {
        let errorMessage: string;
        
        // Try to parse error response
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Provide helpful error messages for common issues
        if (response.status === 404) {
          errorMessage = `API endpoint not found. Please check if the server is running at ${this.baseURL}`;
        } else if (response.status === 0 || response.type === 'opaque') {
          errorMessage = `Unable to connect to API server. This may be a CORS issue or the server is not running. Check ${this.baseURL}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse successful response
      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`Invalid JSON response from server: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }

      return data;
    } catch (error) {
      // Enhanced error logging for debugging
      const errorDetails = {
        url,
        endpoint,
        method: options.method || 'GET',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
      
      console.error('API request failed:', errorDetails);
      
      // Provide user-friendly error messages
      let userMessage: string;
      if (error instanceof TypeError && error.message.includes('fetch')) {
        userMessage = `Network error: Unable to connect to API server at ${this.baseURL}. Please ensure the server is running.`;
      } else if (error instanceof Error) {
        userMessage = error.message;
      } else {
        userMessage = 'An unexpected error occurred while communicating with the server.';
      }
      
      return {
        success: false,
        error: {
          message: userMessage,
        },
      };
    }
  }

  // Fuel Topup endpoints
  async getFuelTopups(): Promise<ApiResponse<FuelTopup[]>> {
    return this.request<FuelTopup[]>('/api/fuel-topups');
  }

  async getFuelTopup(id: string): Promise<ApiResponse<FuelTopup>> {
    return this.request<FuelTopup>(`/api/fuel-topups/${id}`);
  }

  async createFuelTopup(topup: Omit<FuelTopup, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<FuelTopup>> {
    return this.request<FuelTopup>('/api/fuel-topups', {
      method: 'POST',
      body: JSON.stringify(topup),
    });
  }

  async updateFuelTopup(id: string, topup: Partial<FuelTopup>): Promise<ApiResponse<FuelTopup>> {
    return this.request<FuelTopup>(`/api/fuel-topups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(topup),
    });
  }

  async deleteFuelTopup(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/fuel-topups/${id}`, {
      method: 'DELETE',
    });
  }

  async getConsumptionAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    period?: string;
  }): Promise<ApiResponse<ConsumptionData[]>> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.period) searchParams.append('period', params.period);

    const queryString = searchParams.toString();
    const endpoint = `/api/fuel-topups/analytics/consumption${queryString ? `?${queryString}` : ''}`;
    
    return this.request<ConsumptionData[]>(endpoint);
  }

  // Analytics endpoints
  async getAnalyticsSummary(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<AnalyticsSummary>> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const queryString = searchParams.toString();
    const endpoint = `/api/analytics/summary${queryString ? `?${queryString}` : ''}`;
    
    return this.request<AnalyticsSummary>(endpoint);
  }

  async getTrendAnalytics(period: string = 'monthly'): Promise<ApiResponse<TrendData[]>> {
    return this.request<TrendData[]>(`/api/analytics/trends?period=${period}`);
  }

  async exportAnalytics(format: 'json' | 'csv' = 'json', params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<ConsumptionData[]> | Blob> {
    const searchParams = new URLSearchParams();
    searchParams.append('format', format);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const queryString = searchParams.toString();
    const endpoint = `/api/analytics/export?${queryString}`;
    
    if (format === 'csv') {
      // For CSV, return the blob directly
      const response = await fetch(`${this.baseURL}${endpoint}`);
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      return response.blob();
    }
    
    return this.request<ConsumptionData[]>(endpoint);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{
    status: string;
    timestamp: string;
    uptime: number;
  }>> {
    return this.request('/health');
  }

  // Mileage endpoints
  async getMileageEntries(): Promise<ApiResponse<MileageEntry[]>> {
    return this.request<MileageEntry[]>('/api/mileage');
  }

  async getMileageEntry(id: string): Promise<ApiResponse<MileageEntry>> {
    return this.request<MileageEntry>(`/api/mileage/${id}`);
  }

  async createMileageEntry(entry: Omit<MileageEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MileageEntry>> {
    return this.request<MileageEntry>('/api/mileage', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async updateMileageEntry(id: string, entry: Partial<MileageEntry>): Promise<ApiResponse<MileageEntry>> {
    return this.request<MileageEntry>(`/api/mileage/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  }

  async deleteMileageEntry(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/mileage/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateMileageEntries(entries: Omit<MileageEntry, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<ApiResponse<{ count: number; message: string }>> {
    return this.request<{ count: number; message: string }>('/api/mileage/bulk', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });
  }

}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
