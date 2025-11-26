import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { useMileageStore } from '@/store/useMileageStore';
import { UKSeason } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// UK Season month ranges
const SPRING_MONTHS = [2, 3, 4]; // March, April, May
const SUMMER_MONTHS = [5, 6, 7]; // June, July, August
const AUTUMN_MONTHS = [8, 9, 10]; // September, October, November

const seasonConfig: Record<UKSeason, { name: string; icon: string; color: string; months: string }> = {
  SPRING: {
    name: 'Spring',
    icon: 'sun',
    color: 'var(--color-success)',
    months: 'Mar - May',
  },
  SUMMER: {
    name: 'Summer',
    icon: 'sun',
    color: 'var(--color-warning)',
    months: 'Jun - Aug',
  },
  AUTUMN: {
    name: 'Autumn',
    icon: 'cloud',
    color: 'var(--color-accent-red)',
    months: 'Sep - Nov',
  },
  WINTER: {
    name: 'Winter',
    icon: 'snowflake',
    color: 'var(--color-info)',
    months: 'Dec - Feb',
  },
};

export const MileageSeasonalTracker: React.FC = () => {
  const { getAllSeasonalData, entries } = useMileageStore();

  // Re-calculate when entries change
  const seasonalData = useMemo(() => {
    return getAllSeasonalData();
  }, [getAllSeasonalData, entries]);

  // Get current season
  const currentSeason = useMemo((): UKSeason => {
    const now = new Date();
    const month = now.getMonth();
    
    if (SPRING_MONTHS.includes(month)) return 'SPRING';
    if (SUMMER_MONTHS.includes(month)) return 'SUMMER';
    if (AUTUMN_MONTHS.includes(month)) return 'AUTUMN';
    return 'WINTER';
  }, []);

  const currentYear = new Date().getFullYear();

  // Prepare comparison data for the chart
  const comparisonData = useMemo(() => {
    const seasons: UKSeason[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];
    const years = [...new Set(seasonalData.map(d => d.year))].sort().slice(-2);
    
    if (years.length === 0) return [];

    return seasons.map(season => {
      const result: any = {
        season: seasonConfig[season].name,
      };
      
      years.forEach(year => {
        const data = seasonalData.find(d => d.season === season && d.year === year);
        result[`year${year}`] = data?.totalMiles || 0;
        result[`label${year}`] = year.toString();
      });
      
      return result;
    });
  }, [seasonalData]);

  const years = [...new Set(seasonalData.map(d => d.year))].sort().slice(-2);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              <span style={{ color: entry.color }}>{entry.name}: </span>
              <span className="font-mono">
                {Math.round(entry.value).toLocaleString()}
              </span>{' '}
              miles
            </p>
          ))}
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
              Seasonal Mileage
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Compare mileage across UK seasons
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Icon name={seasonConfig[currentSeason].icon as any} className="h-3 w-3" />
            {seasonConfig[currentSeason].name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {seasonalData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <Icon name="calendar-date-appointment" className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-normal mb-2">No seasonal data yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Track your mileage over time to see seasonal patterns and year-over-year comparisons
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Season Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'] as UKSeason[]).map((season) => {
                const config = seasonConfig[season];
                const data = seasonalData.find(d => d.season === season && d.year === currentYear);
                const prevYearData = seasonalData.find(d => d.season === season && d.year === currentYear - 1);
                const isCurrent = season === currentSeason;
                
                let change: number | null = null;
                if (data && prevYearData && prevYearData.totalMiles > 0) {
                  change = ((data.totalMiles - prevYearData.totalMiles) / prevYearData.totalMiles) * 100;
                }

                return (
                  <div
                    key={season}
                    className={`p-4 rounded-lg border ${
                      isCurrent ? 'border-primary bg-primary/5' : 'border-dotted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="text-sm font-medium">{config.name}</span>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs ml-auto">
                          Now
                        </Badge>
                      )}
                    </div>
                    <div className="text-2xl font-mono mb-1">
                      {data ? Math.round(data.totalMiles).toLocaleString() : '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {config.months}
                    </div>
                    {change !== null && (
                      <div className={`text-xs mt-2 ${change >= 0 ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-success)]'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs last year
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Year-over-Year Comparison Chart */}
            {years.length >= 2 && comparisonData.some(d => d[`year${years[0]}`] > 0 || d[`year${years[1]}`] > 0) && (
              <div>
                <h4 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">
                  Year-over-Year Comparison
                </h4>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis
                        dataKey="season"
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
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.1 }} />
                      <Legend />
                      <Bar
                        dataKey={`year${years[0]}`}
                        name={years[0].toString()}
                        fill="var(--color-muted-foreground)"
                        radius={[4, 4, 0, 0]}
                        opacity={0.6}
                      />
                      <Bar
                        dataKey={`year${years[1]}`}
                        name={years[1].toString()}
                        fill="var(--color-primary)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Seasonal Summary Table */}
            {seasonalData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">
                  Seasonal History
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-normal text-muted-foreground">Season</th>
                        <th className="text-left py-2 font-normal text-muted-foreground">Year</th>
                        <th className="text-right py-2 font-normal text-muted-foreground">Total Miles</th>
                        <th className="text-right py-2 font-normal text-muted-foreground">Avg Daily</th>
                        <th className="text-right py-2 font-normal text-muted-foreground">Entries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonalData.slice(0, 8).map((data, index) => {
                        const config = seasonConfig[data.season as UKSeason];
                        return (
                        <tr key={index} className="border-b border-dotted">
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: config.color }}
                              />
                              {config.name}
                            </div>
                          </td>
                          <td className="py-2 font-mono">{data.year}</td>
                          <td className="py-2 text-right font-mono">
                            {Math.round(data.totalMiles).toLocaleString()}
                          </td>
                          <td className="py-2 text-right font-mono">
                            {data.averageDailyMiles.toFixed(1)}
                          </td>
                          <td className="py-2 text-right font-mono">
                            {data.entryCount}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

