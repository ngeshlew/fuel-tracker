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
  PieChart,
  Pie,
} from 'recharts';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  endOfWeek, 
  eachWeekOfInterval,
  isWithinInterval 
} from 'date-fns';

interface MileageBreakdownProps {
  currentMonth: Date;
}

// Neutral greyscale palette for weekly bars
const COLORS = [
  'hsl(0 0% 15%)',
  'hsl(0 0% 30%)',
  'hsl(0 0% 45%)',
  'hsl(0 0% 60%)',
  'hsl(0 0% 75%)',
];

export const MileageBreakdown: React.FC<MileageBreakdownProps> = ({ currentMonth }) => {
  const { entries } = useMileageStore();

  const weeklyData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Get all weeks that overlap with this month
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 } // Monday start
    );

    // Sort all entries by date
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return weeks.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      // Find entries within this week that contribute to mileage
      let weekMiles = 0;
      
      for (let i = 1; i < sortedEntries.length; i++) {
        const current = sortedEntries[i];
        const previous = sortedEntries[i - 1];
        const currentDate = new Date(current.date);
        
        // Check if this entry is within the week
        if (isWithinInterval(currentDate, { start: weekStart, end: weekEnd })) {
          const miles = current.odometerReading - previous.odometerReading;
          if (miles >= 0) {
            weekMiles += miles;
          }
        }
      }

      return {
        week: `Week ${index + 1}`,
        weekLabel: `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM')}`,
        miles: weekMiles,
        color: COLORS[index % COLORS.length],
      };
    });
  }, [currentMonth, entries]);

  const tripPurposeData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Sort entries by date
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const purposeMap = new Map<string, number>();

    for (let i = 1; i < sortedEntries.length; i++) {
      const current = sortedEntries[i];
      const previous = sortedEntries[i - 1];
      const currentDate = new Date(current.date);

      if (currentDate >= monthStart && currentDate <= monthEnd) {
        const miles = current.odometerReading - previous.odometerReading;
        if (miles >= 0) {
          const purpose = current.tripPurpose || 'UNSPECIFIED';
          purposeMap.set(purpose, (purposeMap.get(purpose) || 0) + miles);
        }
      }
    }

    const purposeLabels: Record<string, string> = {
      COMMUTE: 'Commute',
      BUSINESS: 'Business',
      LEISURE: 'Leisure',
      HOLIDAY: 'Holiday',
      OTHER: 'Other',
      UNSPECIFIED: 'Unspecified',
    };

    const purposeColors: Record<string, string> = {
      COMMUTE: 'var(--color-primary)',
      BUSINESS: 'var(--color-accent-red)',
      LEISURE: 'var(--color-success)',
      HOLIDAY: 'var(--color-warning)',
      OTHER: 'var(--color-info)',
      UNSPECIFIED: 'var(--color-muted-foreground)',
    };

    const total = Array.from(purposeMap.values()).reduce((sum, v) => sum + v, 0);

    return Array.from(purposeMap.entries())
      .map(([purpose, miles]) => ({
        name: purposeLabels[purpose] || purpose,
        value: miles,
        color: purposeColors[purpose] || 'var(--color-muted)',
        percentage: total > 0 ? (miles / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonth, entries]);

  const totalMonthMiles = weeklyData.reduce((sum, w) => sum + w.miles, 0);

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{data.weekLabel}</p>
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

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-mono">
              {Math.round(data.value).toLocaleString()}
            </span>{' '}
            miles ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Breakdown */}
      <Card className="border-dotted">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-normal uppercase tracking-wide">
                Weekly Breakdown
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Mileage by week in {format(currentMonth, 'MMMM')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs uppercase">Total</p>
              <p className="font-mono text-xl">{Math.round(totalMonthMiles).toLocaleString()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalMonthMiles === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <Icon name="bar-chart" className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-normal mb-2">No weekly data</h3>
              <p className="text-sm text-muted-foreground">
                Add mileage entries to see weekly breakdown
              </p>
            </div>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.1 }} />
                  <Bar dataKey="miles" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Purpose Breakdown */}
      <Card className="border-dotted">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-lg font-normal uppercase tracking-wide">
              By Purpose
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Mileage breakdown by trip purpose
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {tripPurposeData.length === 0 || tripPurposeData.every(d => d.value === 0) ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <Icon name="pie-chart" className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-normal mb-2">No purpose data</h3>
              <p className="text-sm text-muted-foreground">
                Add trip purposes to your mileage entries
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tripPurposeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {tripPurposeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {tripPurposeData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-mono">
                      {Math.round(item.value).toLocaleString()} mi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

