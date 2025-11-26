import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { apiService, EfficiencyMetrics } from '@/services/api';

export const EfficiencyMetricsCard: React.FC = () => {
  const [metrics, setMetrics] = useState<EfficiencyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await apiService.getEfficiencyMetrics();
        if (response.success && response.data) {
          setMetrics(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch efficiency metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <Card className="border-dotted">
        <CardHeader>
          <CardTitle className="text-lg font-normal uppercase tracking-wide">
            Fuel Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = metrics?.averageMpg !== null && metrics?.averageMpg !== undefined;

  return (
    <Card className="border-dotted">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Icon name="gauge" className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-normal uppercase tracking-wide">
            Fuel Efficiency
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Based on mileage-tracked topups
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icon name="gauge" className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-normal mb-2">No efficiency data yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Enable mileage tracking when adding fuel topups to see MPG and cost per mile
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Average MPG */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="fuel" className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Avg MPG</span>
              </div>
              <p className="text-3xl font-mono font-light">
                {metrics.averageMpg?.toFixed(1)}
                <span className="text-lg text-muted-foreground ml-1">mpg</span>
              </p>
            </div>

            {/* Cost per Mile */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="pound-sterling" className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Cost/Mile</span>
              </div>
              <p className="text-3xl font-mono font-light">
                {metrics.averageCostPerMile?.toFixed(2)}
                <span className="text-lg text-muted-foreground ml-1">p</span>
              </p>
            </div>

            {/* Total Miles */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="milestone" className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Miles Tracked</span>
              </div>
              <p className="text-2xl font-mono font-light">
                {metrics.totalMilesDriven?.toLocaleString()}
                <span className="text-sm text-muted-foreground ml-1">mi</span>
              </p>
            </div>

            {/* Total Litres */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="droplet" className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Fuel Used</span>
              </div>
              <p className="text-2xl font-mono font-light">
                {metrics.totalLitresUsed?.toLocaleString()}
                <span className="text-sm text-muted-foreground ml-1">L</span>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

