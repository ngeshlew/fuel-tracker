import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ChartSkeleton } from '@/components/ui/skeleton';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useFuelStore } from '@/store/useFuelStore';
import { format, subMonths } from 'date-fns';

type TimeRange = '3M' | '6M' | '1Y' | 'ALL';

export const ConsumptionChart: React.FC = () => {
  const { topups, isLoading } = useFuelStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');

  // Calculate monthly totals for the chart
  const monthlyData = useMemo(() => {
    if (topups.length === 0) return [];

    const sortedTopups = [...topups].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group topups by month and calculate monthly litres and cost
    const monthlyMap = new Map<string, { month: string; litres: number; cost: number; entries: number }>();

    for (const topup of sortedTopups) {
      const monthKey = format(new Date(topup.date), 'yyyy-MM');
      const monthLabel = format(new Date(topup.date), 'MMM yyyy');
      
      const existing = monthlyMap.get(monthKey) || { month: monthLabel, litres: 0, cost: 0, entries: 0 };
      monthlyMap.set(monthKey, {
        month: monthLabel,
        litres: existing.litres + topup.litres,
        cost: existing.cost + topup.totalCost,
        entries: existing.entries + 1,
      });
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
  }, [topups, timeRange]);

  // Show skeleton loading state
  if (isLoading && topups.length === 0) {
    return (
      <Card className="border-dotted">
        <CardHeader>
          <CardTitle className="text-lg font-normal uppercase tracking-wide">Fuel Consumption Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-mono">
              {payload[0].value.toFixed(1)}
            </span>{' '}
            litres
          </p>
          {payload[0].payload.cost > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">
                £{payload[0].payload.cost.toFixed(2)}
              </span>{' '}
              spent
            </p>
          )}
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
            Fuel Consumption Trend
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Monthly fuel usage over time
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
            <h3 className="text-lg font-normal mb-2">No fuel data yet</h3>
            <p className="text-sm text-muted-foreground">
              Add fuel topups to see your consumption trend
            </p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(value) => `${value.toFixed(0)}L`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="litres"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#consumptionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
