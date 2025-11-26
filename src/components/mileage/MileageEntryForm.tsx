import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useMileageStore } from '@/store/useMileageStore';
import { MileageEntry, TRIP_PURPOSES } from '../../types';

const mileageEntrySchema = z.object({
  date: z.date({ message: 'Date is required' }),
  odometerReading: z.number({ message: 'Odometer reading is required' }).min(0, 'Odometer reading must be positive'),
  tripDistance: z.number().min(0, 'Trip distance must be positive').optional(),
  tripPurpose: z.enum(['COMMUTE', 'BUSINESS', 'LEISURE', 'HOLIDAY', 'OTHER']).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

type MileageEntryFormData = z.infer<typeof mileageEntrySchema>;

interface MileageEntryFormProps {
  onSuccess: () => void;
  initialData?: MileageEntry;
}

const tripPurposeLabels: Record<string, string> = {
  COMMUTE: 'Commute',
  BUSINESS: 'Business',
  LEISURE: 'Leisure',
  HOLIDAY: 'Holiday',
  OTHER: 'Other',
};

export const MileageEntryForm: React.FC<MileageEntryFormProps> = ({ onSuccess, initialData }) => {
  const { addEntry, updateEntry, entries } = useMileageStore();
  
  const form = useForm<MileageEntryFormData>({
    resolver: zodResolver(mileageEntrySchema),
    defaultValues: initialData ? {
      date: new Date(initialData.date),
      odometerReading: initialData.odometerReading,
      tripDistance: initialData.tripDistance,
      tripPurpose: initialData.tripPurpose,
      notes: initialData.notes || undefined,
    } : {
      date: new Date(),
      odometerReading: undefined,
      tripDistance: undefined,
      tripPurpose: undefined,
      notes: undefined,
    },
  });

  // Get the latest odometer reading for reference
  const latestReading = React.useMemo(() => {
    if (entries.length === 0) return null;
    const sorted = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0].odometerReading;
  }, [entries]);

  const onSubmit = async (data: MileageEntryFormData) => {
    try {
      if (initialData) {
        await updateEntry(initialData.id, {
          date: data.date,
          odometerReading: data.odometerReading,
          tripDistance: data.tripDistance,
          tripPurpose: data.tripPurpose,
          notes: data.notes,
        });
      } else {
        await addEntry({
          vehicleId: 'default-vehicle',
          date: data.date,
          odometerReading: data.odometerReading,
          tripDistance: data.tripDistance,
          tripPurpose: data.tripPurpose,
          notes: data.notes,
          type: 'MANUAL',
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save mileage entry:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        {/* Date Field */}
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
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
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
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date('2020-01-01')
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Odometer Reading */}
        <FormField
          control={form.control}
          name="odometerReading"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Odometer Reading (miles)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 45000"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  value={field.value ?? ''}
                />
              </FormControl>
              {latestReading && !initialData && (
                <FormDescription>
                  Last reading: {latestReading.toLocaleString()} miles
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Trip Distance (Optional) */}
        <FormField
          control={form.control}
          name="tripDistance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trip Distance (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 150"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Specific trip distance in miles (if tracking a particular journey)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Trip Purpose (Optional) */}
        <FormField
          control={form.control}
          name="tripPurpose"
          render={({ field }) => {
            const safeValue = field.value && field.value.trim() !== '' ? field.value : undefined;
            return (
              <FormItem>
                <FormLabel>Trip Purpose (optional)</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value && value.trim() !== '' ? value : undefined);
                  }} 
                  value={safeValue}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TRIP_PURPOSES).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {tripPurposeLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Notes (Optional) */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional details about this entry..."
                  className="resize-none"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            <Icon name="check-good" className="h-4 w-4 mr-2" />
            {initialData ? 'Update' : 'Save'} Mileage
          </Button>
        </div>
      </form>
    </Form>
  );
};

