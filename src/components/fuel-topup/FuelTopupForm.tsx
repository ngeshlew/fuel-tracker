import React, { useState, useEffect } from 'react';
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
      notes: '',
    },
  });

  // Watch litres and costPerLitre to calculate total cost
  const litres = form.watch('litres');
  const costPerLitre = form.watch('costPerLitre');
  const totalCost = litres && costPerLitre ? (litres * costPerLitre).toFixed(2) : '0.00';

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

  // Form submission handler
  const onSubmit = async (data: FuelTopupFormData) => {
    try {
      await addTopup({
        vehicleId: 'vehicle-1',
        litres: data.litres,
        costPerLitre: data.costPerLitre,
        totalCost: data.litres * data.costPerLitre,
        mileage: trackMileage && data.mileage ? data.mileage : undefined,
        date: data.date,
        type: 'MANUAL',
        fuelType: data.fuelType,
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

