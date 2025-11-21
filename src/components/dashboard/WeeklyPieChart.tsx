import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFuelStore } from '@/store/useFuelStore';
import { startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek } from 'date-fns';

interface WeeklyData {
  week: number;
  name: string;
  litres: number;
  cost: number;
  percentage: number;
  color: string;
}

const COLORS = [
  'hsl(var(--electric-purple))',
  'hsl(var(--electric-pink))',
  'hsl(var(--electric-blue))',
  'hsl(var(--electric-green))',
  'hsl(var(--electric-orange))',
  'hsl(var(--electric-red))',
];

interface WeeklyPieChartProps {
  currentMonth: Date;
  viewMode: 'kwh' | 'cost';
}

export const WeeklyPieChart: React.FC<WeeklyPieChartProps> = ({ currentMonth, viewMode }) => {
  const { topups } = useFuelStore();

  const weeklyData = useMemo(() => {
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

    // Calculate weekly breakdown
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });
    const weeklyBreakdown: WeeklyData[] = weeks.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart);
      const weekTopups = monthTopups.filter(topup => {
        const topupDate = new Date(topup.date);
        return topupDate >= weekStart && topupDate <= weekEnd;
      });

      let weekLitres = 0;
      let weekCost = 0;
      
      weekTopups.forEach(topup => {
        weekLitres += topup.litres;
        weekCost += topup.totalCost;
      });

      return {
        week: index + 1,
        name: `Week ${index + 1}`,
        litres: Math.round(weekLitres * 100) / 100,
        cost: Math.round(weekCost * 100) / 100,
        percentage: 0, // Will be calculated below
        color: COLORS[index % COLORS.length]
      };
    });

    // Calculate percentages
    const total = weeklyBreakdown.reduce((sum, week) => sum + (viewMode === 'kwh' ? week.litres : week.cost), 0);
    weeklyBreakdown.forEach(week => {
      week.percentage = total > 0 ? Math.round((viewMode === 'kwh' ? week.litres : week.cost) / total * 100) : 0;
    });

    return weeklyBreakdown.filter(week => week.percentage > 0);
  }, [topups, currentMonth, viewMode]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border p-3 shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-xs text-muted-foreground">
            {viewMode === 'kwh' 
              ? `${data.litres?.toFixed(2) || 0} L (${data.percentage}%)`
              : `£${data.cost?.toFixed(2) || 0} (${data.percentage}%)`
            }
          </p>
        </div>
      );
    }
    return null;
  };

  if (weeklyData.length === 0) {
    return (
      <Card className="bg-transparent w-full" style={{ padding: 'var(--space-md)' }}>
        <CardHeader>
          <CardTitle className="text-base uppercase tracking-wide">Weekly Distribution</CardTitle>
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
        <CardTitle className="text-base uppercase tracking-wide">Weekly Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={weeklyData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: { index?: number }) => {
                // Use index to safely access data from weeklyData array
                if (props.index !== undefined && weeklyData[props.index]) {
                  const entry = weeklyData[props.index];
                  return `${entry.name}: ${entry.percentage}%`;
                }
                return '';
              }}
              outerRadius={80}
              fill="#8884d8"
              dataKey={viewMode === 'kwh' ? 'litres' : 'cost'}
            >
              {weeklyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
