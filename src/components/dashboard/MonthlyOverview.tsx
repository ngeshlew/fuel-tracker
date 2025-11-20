import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from "@/components/ui/icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFuelStore } from '../../store/useFuelStore';
import { startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';
import { formatDateUK, getWeekStart, getWeekEnd, getWeekNumber } from '../../utils/dateFormatters';

interface WeeklyData {
  week: number;
  startDate: Date;
  endDate: Date;
  litres: number;
  cost: number;
  days: number;
}

interface MonthlyOverviewProps {
  currentMonth: Date;
}

export const MonthlyOverview: React.FC<MonthlyOverviewProps> = ({ currentMonth }) => {
  const { topups } = useFuelStore();

  const monthlyData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Filter topups for current month
    const monthTopups = topups.filter(topup => {
      const topupDate = new Date(topup.date);
      return topupDate >= monthStart && topupDate <= monthEnd && !topup.isFirstTopup;
    });

    if (monthTopups.length === 0) {
      return {
        totalLitres: 0,
        totalCost: 0,
        averageDaily: 0,
        weeklyBreakdown: [],
        trend: 'stable' as const
      };
    }

    // Calculate total consumption for the month (litres added)
    let totalLitres = 0;
    let totalCost = 0;
    
    monthTopups.forEach(topup => {
      totalLitres += topup.litres;
      totalCost += topup.totalCost;
    });

    // Calculate weekly breakdown using Monday as week start
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });
    const weeklyBreakdown: WeeklyData[] = weeks.map((weekStart) => {
      const actualWeekStart = getWeekStart(weekStart);
      const actualWeekEnd = getWeekEnd(weekStart);
      
      // Get all topups that fall within this week
      const weekTopups = monthTopups.filter(topup => {
        const topupDate = new Date(topup.date);
        return topupDate >= actualWeekStart && topupDate <= actualWeekEnd;
      });

      let weekLitres = 0;
      let weekCost = 0;
      
      weekTopups.forEach(topup => {
        weekLitres += topup.litres;
        weekCost += topup.totalCost;
      });

      const weekData = {
        week: getWeekNumber(actualWeekStart),
        startDate: actualWeekStart,
        endDate: actualWeekEnd,
        litres: Math.round(weekLitres * 100) / 100,
        cost: Math.round(weekCost * 100) / 100,
        days: Math.min(7, Math.ceil((actualWeekEnd.getTime() - actualWeekStart.getTime()) / (1000 * 60 * 60 * 24)))
      };

      return weekData;
    });

    // Calculate trend
    const firstHalf = weeklyBreakdown.slice(0, Math.floor(weeklyBreakdown.length / 2));
    const secondHalf = weeklyBreakdown.slice(Math.floor(weeklyBreakdown.length / 2));
    
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, week) => sum + week.litres, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, week) => sum + week.litres, 0) / secondHalf.length : 0;
    
    const difference = secondHalfAvg - firstHalfAvg;
    const threshold = firstHalfAvg * 0.05;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (difference > threshold) trend = 'increasing';
    else if (difference < -threshold) trend = 'decreasing';

    return {
      totalLitres: Math.round(totalLitres * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      averageDaily: Math.round((totalLitres / monthEnd.getDate()) * 100) / 100,
      weeklyBreakdown,
      trend
    };
  }, [topups, currentMonth]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <Icon name="trending-up" className="h-5 w-5" />;
      case 'decreasing':
        return <Icon name="trending-down" className="h-5 w-5" />;
      default:
        return <Icon name="activity-graph" className="h-5 w-5" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-electric-red';
      case 'decreasing':
        return 'text-electric-green';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <TooltipProvider>
      <Card className="bg-transparent w-full" style={{ padding: 'var(--space-md)' }}>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                Monthly Overview
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Icon name="help-question-mark" className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Monthly fuel consumption summary</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {monthlyData.weeklyBreakdown.length > 0 && (
              <div className="text-xs uppercase tracking-normal text-muted-foreground">
                {formatDateUK(monthlyData.weeklyBreakdown[0].startDate, 'chart')} - {formatDateUK(monthlyData.weeklyBreakdown[monthlyData.weeklyBreakdown.length - 1].endDate, 'chart')}
              </div>
            )}
          </div>
        </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Monthly Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 border border-dotted">
            <div className="text-xl  text-primary">
              {monthlyData.totalLitres}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Litres</div>
          </div>
          <div className="text-center p-3 border border-dotted">
            <div className="text-xl  text-primary">
              £{monthlyData.totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total Cost</div>
          </div>
          <div className="text-center p-3 border border-dotted">
            <div className="text-xl  text-primary">
              {monthlyData.averageDaily}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Daily Avg</div>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-center space-x-2">
          <div className={getTrendColor(monthlyData.trend)}>
            {getTrendIcon(monthlyData.trend)}
          </div>
          <span className={`text-xs  ${getTrendColor(monthlyData.trend)}`}>
            {monthlyData.trend.charAt(0).toUpperCase() + monthlyData.trend.slice(1)} trend
          </span>
        </div>

        {/* Weekly Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs  text-muted-foreground">Weekly Breakdown</h4>
          <div className="space-y-2">
            {monthlyData.weeklyBreakdown.map((week) => (
              <div
                key={week.week}
                className="flex items-center justify-between p-3 border border-dotted hover:opacity-70 transition-opacity"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 border border-dotted flex items-center justify-center text-xs">
                    {week.week}
                  </div>
                  <div>
                    <div className="text-xs ">
                      Week {week.week}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateUK(week.startDate, 'chart')} - {formatDateUK(week.endDate, 'chart')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs ">
                    {week.litres} L
                  </div>
                  <div className="text-xs text-muted-foreground">
                    £{week.cost.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};
