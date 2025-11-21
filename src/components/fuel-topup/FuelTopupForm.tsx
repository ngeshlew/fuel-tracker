import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Icon } from "@/components/ui/icon";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFuelStore } from '../../store/useFuelStore';
import { cn } from '@/lib/utils';
import { getRetailerList } from '@/services/fuelPriceService';

/**
 * FuelTopupForm Component
 * 
 * A form component for adding new fuel topups to the fuel tracker.
 * Features:
 * - Form validation using Zod schema
 * - Litres, cost per litre, total cost calculation
 * - Optional mileage tracking
 * - Fuel type selection
 * - First topup checkbox (one-time only)
 * - Success/error feedback
 * - Responsive design with Lewis-Linear styling
 */

// Zod validation schema for fuel topup form data
const fuelTopupSchema = z.object({
  litres: z
    .number({ message: 'Litres is required' })
    .positive('Litres must be greater than 0')
    .max(200, 'Litres must be less than 200'),
  costPerLitre: z
    .number({ message: 'Cost per litre is required' })
    .nonnegative('Cost per litre must be positive')
    .max(10, 'Cost per litre must be less than £10'),
  mileage: z
    .number({ message: 'Mileage must be a number' })
    .nonnegative('Mileage must be positive')
    .optional(),
  date: z
    .date({ message: 'Date is required' })
    .refine((date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      today.setMinutes(0);
      today.setSeconds(0);
      today.setMilliseconds(0);
      
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      selectedDate.setMinutes(0);
      selectedDate.setSeconds(0);
      selectedDate.setMilliseconds(0);
      
      return selectedDate.getTime() <= today.getTime();
    }, {
      message: 'Date cannot be in the future'
    }),
  fuelType: z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional(),
  retailer: z.string().optional(),
  fuelGrade: z.enum(['UNLEADED', 'SUPER_UNLEADED', 'PREMIUM_DIESEL', 'STANDARD_DIESEL']).optional(),
  vatRate: z
    .number({ message: 'VAT rate must be a number' })
    .min(0, 'VAT rate must be 0 or greater')
    .max(100, 'VAT rate must be 100 or less')
    .optional(),
  netPrice: z
    .number({ message: 'Net price must be a number' })
    .nonnegative('Net price must be positive')
    .optional(),
  vatAmount: z
    .number({ message: 'VAT amount must be a number' })
    .nonnegative('VAT amount must be positive')
    .optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  placeId: z.string().optional(),
  notes: z.string().optional(),
});

type FuelTopupFormData = z.infer<typeof fuelTopupSchema>;

interface FuelTopupFormProps {
  onSuccess: () => void;
}

export const FuelTopupForm: React.FC<FuelTopupFormProps> = ({ onSuccess }) => {
  const { addTopup, isLoading, topups } = useFuelStore();
  
  // State for first topup checkbox - only show if no first topup exists
  const [showFirstTopupCheckbox, setShowFirstTopupCheckbox] = useState(false);
  const [isFirstTopup, setIsFirstTopup] = useState(false);
  const [trackMileage, setTrackMileage] = useState(false);
  
  // Get retailer list for dropdown
  const retailerList = getRetailerList();
  
  // Google Maps Places Autocomplete state
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [locationInput, setLocationInput] = useState('');
  
  // Get last topup for mileage reference
  const getLastTopup = React.useCallback(() => {
    if (topups.length === 0) return null;
    
    const sortedTopups = [...topups]
      .filter(t => !t.isFirstTopup && t.type !== 'ESTIMATED')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return sortedTopups[0] || null;
  }, [topups]);

  // React Hook Form setup with validation
  const lastTopup = getLastTopup();
  const form = useForm<FuelTopupFormData>({
    resolver: zodResolver(fuelTopupSchema),
    defaultValues: {
      litres: 50,
      costPerLitre: 1.50,
      mileage: lastTopup?.mileage || undefined,
      date: (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
      })(),
      fuelType: 'PETROL',
      vatRate: 20.00, // UK standard VAT rate
      notes: '',
    },
  });

  // Watch form values for calculations
  const litres = form.watch('litres');
  const costPerLitre = form.watch('costPerLitre');
  const vatRate = form.watch('vatRate') || 20.00;
  const netPrice = form.watch('netPrice');
  const vatAmount = form.watch('vatAmount');
  
  // Calculate total cost and VAT
  // If netPrice is provided, calculate VAT and total
  // Otherwise, if totalCost is provided, calculate netPrice and VAT
  // Otherwise, calculate from litres * costPerLitre
  const calculatedTotalCost = useMemo(() => {
    if (netPrice !== undefined && netPrice !== null) {
      const vat = netPrice * (vatRate / 100);
      return netPrice + vat;
    }
    if (litres && costPerLitre) {
      return litres * costPerLitre;
    }
    return 0;
  }, [litres, costPerLitre, netPrice, vatRate]);

  const calculatedNetPrice = useMemo(() => {
    if (netPrice !== undefined && netPrice !== null) {
      return netPrice;
    }
    if (calculatedTotalCost > 0) {
      return calculatedTotalCost / (1 + vatRate / 100);
    }
    return 0;
  }, [calculatedTotalCost, netPrice, vatRate]);

  const calculatedVatAmount = useMemo(() => {
    if (vatAmount !== undefined && vatAmount !== null) {
      return vatAmount;
    }
    return calculatedTotalCost - calculatedNetPrice;
  }, [calculatedTotalCost, calculatedNetPrice, vatAmount]);

  const totalCost = calculatedTotalCost.toFixed(2);

  // Check if there's already a first topup in the system
  useEffect(() => {
    const hasFirstTopup = topups.some(topup => topup.isFirstTopup);
    setShowFirstTopupCheckbox(!hasFirstTopup);
  }, [topups]);

  // Update mileage when last topup changes
  useEffect(() => {
    if (lastTopup?.mileage && trackMileage) {
      form.setValue('mileage', lastTopup.mileage);
    }
  }, [lastTopup, trackMileage, form]);

  // Load Google Maps API script
  useEffect(() => {
    const loadGoogleMapsScript = () => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not found. Set VITE_GOOGLE_MAPS_API_KEY environment variable.');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps API loaded');
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
      };
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  // Cleanup Google Maps Autocomplete on unmount
  useEffect(() => {
    return () => {
      if (autocomplete && window.google) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [autocomplete]);

  // Form submission handler
  const onSubmit = async (data: FuelTopupFormData) => {
    try {
      await addTopup({
        vehicleId: 'vehicle-1',
        litres: data.litres,
        costPerLitre: data.costPerLitre,
        totalCost: calculatedTotalCost,
        mileage: trackMileage && data.mileage ? data.mileage : undefined,
        date: data.date,
        type: 'MANUAL',
        fuelType: data.fuelType,
        retailer: data.retailer,
        locationName: data.locationName,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        placeId: data.placeId,
        fuelGrade: data.fuelGrade,
        vatRate: data.vatRate,
        netPrice: calculatedNetPrice > 0 ? calculatedNetPrice : undefined,
        vatAmount: calculatedVatAmount > 0 ? calculatedVatAmount : undefined,
        notes: data.notes || '',
        isFirstTopup: isFirstTopup,
      });
      
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Failed to add fuel topup:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="litres"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Litres Added</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="50.00"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    field.onChange(isNaN(value) ? 0 : value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="costPerLitre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost Per Litre (£)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1.50"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    field.onChange(isNaN(value) ? 0 : value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Total Cost Display */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Cost</span>
            <span className="text-lg font-semibold">£{totalCost}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {litres && costPerLitre ? `${litres}L × £${costPerLitre.toFixed(2)} = £${totalCost}` : 'Enter litres and cost per litre'}
          </p>
        </div>

        <FormField
          control={form.control}
          name="fuelType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fuel Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PETROL">Petrol</SelectItem>
                  <SelectItem value="DIESEL">Diesel</SelectItem>
                  <SelectItem value="ELECTRIC">Electric</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Retailer */}
        <FormField
          control={form.control}
          name="retailer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retailer (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select retailer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {retailerList.map((retailer) => (
                    <SelectItem key={retailer} value={retailer}>
                      {retailer}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fuel Grade - depends on fuelType */}
        {form.watch('fuelType') === 'PETROL' && (
          <FormField
            control={form.control}
            name="fuelGrade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuel Grade (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel grade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="UNLEADED">Unleaded</SelectItem>
                    <SelectItem value="SUPER_UNLEADED">Super Unleaded</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {form.watch('fuelType') === 'DIESEL' && (
          <FormField
            control={form.control}
            name="fuelGrade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuel Grade (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel grade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="STANDARD_DIESEL">Standard Diesel</SelectItem>
                    <SelectItem value="PREMIUM_DIESEL">Premium Diesel</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* VAT Section */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium">VAT & Pricing</h3>
          
          <FormField
            control={form.control}
            name="vatRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VAT Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="20.00"
                    {...field}
                    value={field.value || 20.00}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      field.onChange(isNaN(value || 0) ? 20.00 : value);
                    }}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  UK standard VAT rate is 20%
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="netPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Net Price (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Auto-calculated"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      field.onChange(isNaN(value || 0) ? undefined : value);
                    }}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Price before VAT. Leave empty to calculate from total cost.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Display calculated values */}
          <div className="space-y-2 p-3 bg-muted/50 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Price:</span>
              <span className="font-medium">£{calculatedNetPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT Amount:</span>
              <span className="font-medium">£{calculatedVatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t pt-2">
              <span>Total Cost:</span>
              <span>£{totalCost}</span>
            </div>
          </div>
        </div>

        {/* Location - Google Maps Places Autocomplete */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium">Location (Optional)</h3>
          
          <FormField
            control={form.control}
            name="locationName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="location-autocomplete"
                      type="text"
                      placeholder="Search for location (e.g., Sainsbury Chertsey)"
                      value={locationInput}
                      onChange={(e) => {
                        setLocationInput(e.target.value);
                        field.onChange(e.target.value);
                      }}
                      onFocus={() => {
                        // Initialize Google Maps Autocomplete if not already done
                        if (window.google && window.google.maps && window.google.maps.places && !autocomplete) {
                          const input = document.getElementById('location-autocomplete') as HTMLInputElement;
                          if (input) {
                            const autocompleteInstance = new window.google.maps.places.Autocomplete(input, {
                              types: ['establishment', 'geocode'],
                              fields: ['name', 'formatted_address', 'geometry', 'place_id'],
                            });
                            
                            autocompleteInstance.addListener('place_changed', () => {
                              const place = autocompleteInstance.getPlace();
                              if (place.geometry && place.geometry.location) {
                                const locationName = place.name || '';
                                const address = place.formatted_address || '';
                                const lat = place.geometry.location.lat();
                                const lng = place.geometry.location.lng();
                                const placeId = place.place_id || '';
                                
                                setLocationInput(locationName);
                                form.setValue('locationName', locationName);
                                form.setValue('address', address);
                                form.setValue('latitude', lat);
                                form.setValue('longitude', lng);
                                form.setValue('placeId', placeId);
                              }
                            });
                            
                            setAutocomplete(autocompleteInstance);
                          }
                        }
                      }}
                    />
                    {form.watch('address') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {form.watch('address')}
                      </p>
                    )}
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Start typing to search for locations using Google Maps
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Mileage Tracking Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="trackMileage"
            checked={trackMileage}
            onCheckedChange={(checked) => {
              setTrackMileage(checked as boolean);
              if (!checked) {
                form.setValue('mileage', undefined);
              } else if (lastTopup?.mileage) {
                form.setValue('mileage', lastTopup.mileage);
              }
            }}
          />
          <Label htmlFor="trackMileage">
            Track mileage (optional)
          </Label>
        </div>

        {trackMileage && (
          <FormField
            control={form.control}
            name="mileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mileage</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    placeholder={lastTopup?.mileage ? `Last: ${lastTopup.mileage}` : "Enter current mileage"}
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      field.onChange(isNaN(value || 0) ? undefined : value);
                    }}
                  />
                </FormControl>
                {lastTopup?.mileage && (
                  <p className="text-xs text-muted-foreground">
                    Last recorded mileage: {lastTopup.mileage}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <Icon name="calendar-date-appointment" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      if (date) {
                        const normalizedDate = new Date(date);
                        normalizedDate.setHours(0, 0, 0, 0);
                        field.onChange(normalizedDate);
                      } else {
                        field.onChange(date);
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      return date > today || date < new Date("1900-01-01");
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any notes about this topup"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* First Topup Checkbox - Only shown if no first topup exists */}
        {showFirstTopupCheckbox && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isFirstTopup"
              checked={isFirstTopup}
              onCheckedChange={(checked) => setIsFirstTopup(checked as boolean)}
            />
            <Label htmlFor="isFirstTopup">
              This is my first fuel topup
            </Label>
          </div>
        )}

        {/* Form Action Buttons */}
        <div className="flex space-x-4 pt-6 pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            className="flex-1 h-11"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || isLoading}
            className="flex-1 h-11"
          >
            {form.formState.isSubmitting || isLoading ? 'Adding...' : 'Add Topup'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

