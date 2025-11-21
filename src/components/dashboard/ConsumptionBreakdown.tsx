import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFuelStore } from '@/store/useFuelStore';
import { startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek, format } from 'date-fns';

interface WeeklyData {
  week: number;
  name: string;
  litres: number;
  cost: number;
  percentage: number;
}

interface DailyData {
  date: string;
  litres: number;
  cost: number;
}

interface ConsumptionBreakdownProps {
  currentMonth: Date;
  viewMode: 'kwh' | 'cost';
}

export const ConsumptionBreakdown: React.FC<ConsumptionBreakdownProps> = ({ currentMonth, viewMode }) => {
  const { topups } = useFuelStore();
  const [activeTab, setActiveTab] = useState<'weekly' | 'daily'>('weekly');

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
      
      // Find topups that fall within this week
      const weekTopups = monthTopups.filter(topup => {
        const topupDate = new Date(topup.date);
        return topupDate >= weekStart && topupDate <= weekEnd;
      });

      let weekLitres = 0;
      let weekCost = 0;
      
      // Calculate consumption for this week (litres added)
      weekTopups.forEach(topup => {
        weekLitres += topup.litres;
        weekCost += topup.totalCost;
      });

      return {
        week: index + 1,
        name: `Week ${index + 1}`,
        litres: Math.round(weekLitres * 100) / 100,
        cost: Math.round(weekCost * 100) / 100,
        percentage: 0 // Will be calculated below
      };
    });

    // Calculate percentages
    const total = weeklyBreakdown.reduce((sum, week) => sum + (viewMode === 'kwh' ? week.litres : week.cost), 0);
    weeklyBreakdown.forEach(week => {
      week.percentage = total > 0 ? Math.round((viewMode === 'kwh' ? week.litres : week.cost) / total * 100) : 0;
    });

    return weeklyBreakdown;
  }, [topups, currentMonth, viewMode]);

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
    const dailyBreakdown: DailyData[] = [];

    // Group topups by day
    monthTopups.forEach(topup => {
      const topupDate = new Date(topup.date);
      const dayKey = format(topupDate, 'MMM dd');
      
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

    return dailyBreakdown.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [topups, currentMonth]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border p-3 shadow-lg">
          <p className="">{data.name || data.date}</p>
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

  return (
    <Card className="bg-transparent w-full" style={{ padding: 'var(--space-md)' }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base uppercase tracking-wide">Consumption Breakdown</CardTitle>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'weekly' | 'daily')}>
            <TabsList>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'weekly' | 'daily')}>
          <TabsContent value="weekly" className="mt-4">
            {weeklyData.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No data for this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="oklch(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
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
                  <Area 
                    type="monotone" 
                    dataKey={viewMode === 'kwh' ? 'litres' : 'cost'}
                    stroke="oklch(var(--foreground))" 
                    fill="oklch(var(--foreground))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
          <TabsContent value="daily" className="mt-4">
            {dailyData.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No data for this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyData}>
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
                  <Area 
                    type="monotone" 
                    dataKey={viewMode === 'kwh' ? 'litres' : 'cost'}
                    stroke="oklch(var(--foreground))" 
                    fill="oklch(var(--foreground))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
