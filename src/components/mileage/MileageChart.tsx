import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useMileageStore } from '@/store/useMileageStore';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format, subMonths } from 'date-fns';

type TimeRange = '3M' | '6M' | '1Y' | 'ALL';

export const MileageChart: React.FC = () => {
  const { entries } = useMileageStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');

  // Calculate monthly totals for the chart
  const monthlyData = useMemo(() => {
    if (entries.length < 2) return [];

    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group entries by month and calculate monthly miles
    const monthlyMap = new Map<string, { month: string; miles: number; entries: number }>();

    for (let i = 1; i < sortedEntries.length; i++) {
      const current = sortedEntries[i];
      const previous = sortedEntries[i - 1];
      const miles = current.odometerReading - previous.odometerReading;
      
      if (miles >= 0) {
        const monthKey = format(new Date(current.date), 'yyyy-MM');
        const monthLabel = format(new Date(current.date), 'MMM yyyy');
        
        const existing = monthlyMap.get(monthKey) || { month: monthLabel, miles: 0, entries: 0 };
        monthlyMap.set(monthKey, {
          month: monthLabel,
          miles: existing.miles + miles,
          entries: existing.entries + 1,
        });
      }
    }

    // Filter by time range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '3M':
        startDate = subMonths(now, 3);
        break;
      case '6M':
        startDate = subMonths(now, 6);
        break;
      case '1Y':
        startDate = subMonths(now, 12);
        break;
      case 'ALL':
      default:
        startDate = new Date(0);
        break;
    }

    return Array.from(monthlyMap.entries())
      .filter(([key]) => new Date(key + '-01') >= startDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [entries, timeRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-mono">
              {Math.round(payload[0].value).toLocaleString()}
            </span>{' '}
            miles
          </p>
        </div>
      );
    }
    return null;
  };

  const timeRangeButtons: { value: TimeRange; label: string }[] = [
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: '1Y' },
    { value: 'ALL', label: 'All' },
  ];

  return (
    <Card className="border-dotted">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-normal uppercase tracking-wide">
            Mileage Trend
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Monthly mileage over time
          </p>
        </div>
        <div className="flex items-center gap-1">
          {timeRangeButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={timeRange === btn.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange(btn.value)}
              className="h-8 px-3"
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {monthlyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <Icon name="bar-chart" className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-normal mb-2">No mileage data yet</h3>
            <p className="text-sm text-muted-foreground">
              Add at least two mileage entries to see your trend
            </p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mileageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="miles"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#mileageGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

