import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from "@/components/ui/icon";
import { useFuelStore } from '../../store/useFuelStore';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

interface DailyData {
  date: string;
  litres: number;
  cost: number;
}

interface DailyBreakdownProps {
  currentMonth: Date;
  viewMode: 'kwh' | 'cost';
}

export const DailyBreakdown: React.FC<DailyBreakdownProps> = ({ currentMonth, viewMode }) => {
  const { topups } = useFuelStore();

  const dailyData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Filter topups for current month
    const monthTopups = topups.filter(topup => {
      const topupDate = new Date(topup.date);
      return topupDate >= monthStart && topupDate <= monthEnd && !topup.isFirstTopup;
    });

    if (monthTopups.length === 0) {
      return [];
    }

    // Create daily data points
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dailyBreakdown: DailyData[] = [];

    // Group topups by day
    monthTopups.forEach(topup => {
      const topupDate = new Date(topup.date);
      const dayKey = format(topupDate, 'MMM d');
      
      const existingDay = dailyBreakdown.find(d => d.date === dayKey);
      if (existingDay) {
        existingDay.litres += topup.litres;
        existingDay.cost += topup.totalCost;
      } else {
        dailyBreakdown.push({
          date: dayKey,
          litres: topup.litres,
          cost: topup.totalCost
        });
      }
    });

    // Filter out future dates and fill in missing days with zero values
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return days
      .filter(day => day <= today)
      .map((day) => {
        const dayKey = format(day, 'MMM d');
        const existing = dailyBreakdown.find(d => d.date === dayKey);
        return existing || {
          date: dayKey,
          litres: 0,
          cost: 0
        };
      });
  }, [topups, currentMonth]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border  p-3 shadow-lg">
          <p className="">{label}</p>
          <p className="text-xs text-muted-foreground">
            {viewMode === 'kwh' 
              ? `${data.litres?.toFixed(2) || 0} L`
              : `£${data.cost?.toFixed(2) || 0}`
            }
          </p>
        </div>
      );
    }
    return null;
  };

  if (dailyData.length === 0) {
    return (
      <Card className="bg-transparent w-full" style={{ padding: 'var(--space-md)' }}>
        <CardHeader>
          <CardTitle className="text-base uppercase tracking-wide">Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-muted-foreground">
            No data for this month
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent w-full" style={{ padding: 'var(--space-md)' }}>
      <CardHeader>
        <CardTitle className="text-base uppercase tracking-wide">Daily Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="4 4" stroke="oklch(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              stroke="oklch(var(--muted-foreground))"
              tick={{ fill: 'oklch(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis 
              stroke="oklch(var(--muted-foreground))"
              tick={{ fill: 'oklch(var(--muted-foreground))', fontSize: 11 }}
              label={{ 
                value: viewMode === 'kwh' ? 'Litres' : 'Cost (£)', 
                angle: -90, 
                position: 'insideLeft',
                fill: 'oklch(var(--muted-foreground))',
                style: { fontSize: 11 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey={viewMode === 'kwh' ? 'litres' : 'cost'}
              stroke="oklch(var(--foreground))" 
              strokeWidth={2}
              dot={{ fill: "oklch(var(--foreground))", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
