import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { useMileageStore } from '@/store/useMileageStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface MileageMonthlyOverviewProps {
  currentMonth: Date;
}

export const MileageMonthlyOverview: React.FC<MileageMonthlyOverviewProps> = ({ currentMonth }) => {
  const { entries } = useMileageStore();

  const dailyData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculate daily miles driven
    const dailyMiles = new Map<string, number>();

    // Get all entries for this month plus the last entry before this month
    const allSortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Find entries for this month and calculate differences
    for (let i = 1; i < allSortedEntries.length; i++) {
      const current = allSortedEntries[i];
      const previous = allSortedEntries[i - 1];
      const currentDate = new Date(current.date);

      if (currentDate >= monthStart && currentDate <= monthEnd) {
        const miles = current.odometerReading - previous.odometerReading;
        if (miles >= 0) {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          dailyMiles.set(dateKey, (dailyMiles.get(dateKey) || 0) + miles);
        }
      }
    }

    // Create daily data array
    return daysInMonth.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const miles = dailyMiles.get(dateKey) || 0;

      return {
        date: dateKey,
        day: format(day, 'd'),
        dayOfWeek: format(day, 'EEE'),
        miles,
        hasData: miles > 0,
      };
    });
  }, [currentMonth, entries]);

  const monthStats = useMemo(() => {
    const totalMiles = dailyData.reduce((sum, d) => sum + d.miles, 0);
    const daysWithData = dailyData.filter((d) => d.hasData).length;
    const avgDaily = daysWithData > 0 ? totalMiles / daysWithData : 0;
    const maxMiles = Math.max(...dailyData.map((d) => d.miles), 0);
    const maxDay = dailyData.find((d) => d.miles === maxMiles);

    return {
      totalMiles,
      daysWithData,
      avgDaily,
      maxMiles,
      maxDay: maxDay ? format(new Date(maxDay.date), 'dd MMM') : null,
    };
  }, [dailyData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">
            {data.dayOfWeek}, {format(new Date(data.date), 'dd MMM')}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-mono">
              {Math.round(data.miles).toLocaleString()}
            </span>{' '}
            miles
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-dotted">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-normal uppercase tracking-wide">
              Monthly Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Daily mileage for {format(currentMonth, 'MMMM yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground text-xs uppercase">Total</p>
              <p className="font-mono text-lg">{Math.round(monthStats.totalMiles).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs uppercase">Avg/Day</p>
              <p className="font-mono text-lg">{monthStats.avgDaily.toFixed(1)}</p>
            </div>
            {monthStats.maxDay && (
              <div className="text-center">
                <p className="text-muted-foreground text-xs uppercase">Peak</p>
                <p className="font-mono text-lg">{monthStats.maxMiles.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {monthStats.totalMiles === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Icon name="calendar-date-appointment" className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-normal mb-2">No mileage data for this month</h3>
            <p className="text-sm text-muted-foreground">
              Add mileage entries to see your daily breakdown
            </p>
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.1 }} />
                <Bar dataKey="miles" radius={[2, 2, 0, 0]}>
                  {dailyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hasData ? 'var(--color-primary)' : 'var(--color-muted)'}
                      opacity={entry.hasData ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

