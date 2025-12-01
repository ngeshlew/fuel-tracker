import React, { useMemo } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { LoadingCard } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import { useMileageStore } from '@/store/useMileageStore';
import { useFuelStore } from '@/store/useFuelStore';

interface MileageSummaryCardsProps {
  currentMonth: Date;
}

interface SummaryCardProps {
  title: string;
  value: string;
  changeValue: string;
  trendIcon: React.ReactNode;
  footerLabel: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  changeValue,
  trendIcon,
  footerLabel,
}) => {
  const isPositive = changeValue.startsWith('+');
  const isNegative = changeValue.startsWith('-');
  const changeColor = isPositive 
    ? 'text-[var(--color-accent-red)]' 
    : isNegative 
    ? 'text-[var(--color-success)]' 
    : 'text-muted-foreground';
  
  return (
    <Card 
      className="bg-transparent text-card-foreground flex flex-col border-dotted hover:border-[var(--color-border-strong)] transition-colors duration-200 w-full" 
      role="region" 
      aria-label={`${title} statistics`} 
      style={{ padding: 'var(--space-md)' }}
    >
      <CardHeader className="px-0 pt-0 pb-0 text-center">
        <div className="text-muted-foreground text-xs uppercase tracking-wider mb-6">
          {title}
        </div>
        
        <div 
          className="text-4xl font-normal tabular-nums mb-6" 
          style={{ fontSize: 'var(--text-3xl)', lineHeight: '1' }}
        >
          {value}
        </div>
        
        <div className={`flex items-center justify-center gap-1.5 text-base font-normal mb-4 ${changeColor}`}>
          <span aria-hidden="true">{trendIcon}</span>
          <span>{changeValue}</span>
        </div>
        
        <div 
          className="border-t border-dotted border-border mb-4" 
          style={{ marginTop: 'var(--space-xl)', marginBottom: 'var(--space-md)' }} 
          aria-hidden="true"
        />
        
        <div className="text-xs uppercase tracking-normal text-muted-foreground">
          {footerLabel}
        </div>
      </CardHeader>
    </Card>
  );
};

export const MileageSummaryCards: React.FC<MileageSummaryCardsProps> = ({ currentMonth }) => {
  const { entries, getTotalMiles, getAverageDailyMiles, calculateEfficiency, calculateCostPerMile } = useMileageStore();
  const { topups, isLoading } = useFuelStore();

  const metrics = useMemo(() => {
    // Current month bounds
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Previous month bounds
    const prevMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const prevMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);

    // Total mileage since first entry (car purchase)
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const totalDrivenSincePurchase = sortedEntries.length >= 2
      ? sortedEntries[sortedEntries.length - 1].odometerReading - sortedEntries[0].odometerReading
      : 0;
    
    // Calculate days since purchase for average
    const daysSincePurchase = sortedEntries.length >= 2
      ? Math.max(1, Math.ceil((new Date(sortedEntries[sortedEntries.length - 1].date).getTime() - new Date(sortedEntries[0].date).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    const overallAvgDaily = totalDrivenSincePurchase / daysSincePurchase;

    // Current month mileage
    const currentTotalMiles = getTotalMiles(currentMonthStart, currentMonthEnd);
    const currentAvgDaily = getAverageDailyMiles(currentMonthStart, currentMonthEnd);

    // Previous month mileage
    const prevTotalMiles = getTotalMiles(prevMonthStart, prevMonthEnd);
    const prevAvgDaily = getAverageDailyMiles(prevMonthStart, prevMonthEnd);

    // Calculate fuel consumption and cost for the period (from fuel topups)
    const currentMonthTopups = topups.filter((t) => {
      const topupDate = new Date(t.date);
      return topupDate >= currentMonthStart && topupDate <= currentMonthEnd;
    });

    const prevMonthTopups = topups.filter((t) => {
      const topupDate = new Date(t.date);
      return topupDate >= prevMonthStart && topupDate <= prevMonthEnd;
    });

    // Calculate totals for efficiency
    const currentTotalLitres = currentMonthTopups.reduce((sum, t) => sum + t.litres, 0);
    const currentTotalCost = currentMonthTopups.reduce((sum, t) => sum + t.totalCost, 0);

    const prevTotalLitres = prevMonthTopups.reduce((sum, t) => sum + t.litres, 0);
    const prevTotalCost = prevMonthTopups.reduce((sum, t) => sum + t.totalCost, 0);

    // Calculate efficiency (miles per litre)
    const currentEfficiency = calculateEfficiency(currentTotalMiles, currentTotalLitres);
    const prevEfficiency = calculateEfficiency(prevTotalMiles, prevTotalLitres);

    // Calculate cost per mile
    const currentCostPerMile = calculateCostPerMile(currentTotalCost, currentTotalMiles);
    const prevCostPerMile = calculateCostPerMile(prevTotalCost, prevTotalMiles);

    // Calculate percentage changes
    const calcPercentChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const milesChange = calcPercentChange(currentTotalMiles, prevTotalMiles);
    const avgDailyChange = calcPercentChange(currentAvgDaily, prevAvgDaily);
    const efficiencyChange = calcPercentChange(currentEfficiency, prevEfficiency);
    const costPerMileChange = calcPercentChange(currentCostPerMile, prevCostPerMile);

    return {
      totalMiles: currentTotalMiles,
      avgDailyMiles: currentAvgDaily,
      efficiency: currentEfficiency,
      costPerMile: currentCostPerMile,
      milesChange,
      avgDailyChange,
      efficiencyChange,
      costPerMileChange,
      totalDrivenSincePurchase,
      overallAvgDaily,
    };
  }, [currentMonth, entries, topups, getTotalMiles, getAverageDailyMiles, calculateEfficiency, calculateCostPerMile]);

  const formatChange = (change: number): string => {
    if (change === 0) return '0%';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <Icon name="trending-up" className="h-4 w-4" />;
    if (change < 0) return <Icon name="trending-down" className="h-4 w-4" />;
    return <Icon name="minus" className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    );
  }

  const summaryCards = [
    {
      title: 'Total Driven',
      value: metrics.totalDrivenSincePurchase > 0 ? `${Math.round(metrics.totalDrivenSincePurchase).toLocaleString()}` : '—',
      changeValue: metrics.totalDrivenSincePurchase > 0 ? `${metrics.overallAvgDaily.toFixed(1)} mi/day avg` : 'No data',
      trendIcon: metrics.totalDrivenSincePurchase > 0 ? <Icon name="car" className="h-4 w-4" /> : null,
      footerLabel: 'OVERALL AVERAGE',
    },
    {
      title: 'This Month',
      value: metrics.totalMiles > 0 ? `${Math.round(metrics.totalMiles).toLocaleString()}` : '—',
      changeValue: metrics.totalMiles > 0 ? formatChange(metrics.milesChange) : 'No data',
      trendIcon: metrics.totalMiles > 0 ? getTrendIcon(metrics.milesChange) : null,
      footerLabel: 'VS LAST MONTH',
    },
    {
      title: 'Avg Daily',
      value: metrics.avgDailyMiles > 0 ? `${metrics.avgDailyMiles.toFixed(1)} mi` : '—',
      changeValue: metrics.avgDailyMiles > 0 ? formatChange(metrics.avgDailyChange) : 'No data',
      trendIcon: metrics.avgDailyMiles > 0 ? getTrendIcon(metrics.avgDailyChange) : null,
      footerLabel: 'VS LAST MONTH',
    },
    {
      title: 'Efficiency',
      value: metrics.efficiency > 0 ? `${metrics.efficiency.toFixed(1)} mi/L` : '—',
      changeValue: metrics.efficiency > 0 ? formatChange(metrics.efficiencyChange) : 'No data',
      trendIcon: metrics.efficiency > 0 ? getTrendIcon(metrics.efficiencyChange) : null,
      footerLabel: 'VS LAST MONTH',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryCards.map((card, index) => (
        <SummaryCard
          key={index}
          title={card.title}
          value={card.value}
          changeValue={card.changeValue}
          trendIcon={card.trendIcon}
          footerLabel={card.footerLabel}
        />
      ))}
    </div>
  );
};

