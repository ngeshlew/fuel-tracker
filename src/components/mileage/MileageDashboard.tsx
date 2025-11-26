import { FC, useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Header } from '../dashboard/Header';
import { AppSidebar } from '../dashboard/AppSidebar';
import { MileageSummaryCards } from './MileageSummaryCards';
import { MileageChart } from './MileageChart';
import { MileageMonthlyOverview } from './MileageMonthlyOverview';
import { MileageBreakdown } from './MileageBreakdown';
import { MileageSeasonalTracker } from './MileageSeasonalTracker';
import { MonthSelector } from '../dashboard/MonthSelector';
import { MileageEntryPanel } from './MileageEntryPanel';
import { MileageLog } from './MileageLog';
import { MobileNavigation } from '../mobile/MobileNavigation';
import { useMileageStore } from '@/store/useMileageStore';
import { useFuelStore } from '@/store/useFuelStore';
import { MileageEntry } from '../../types';

export const MileageDashboard: FC = () => {
  const { isEntryPanelOpen, toggleEntryPanel, loadEntries, syncFromFuelTopups } = useMileageStore();
  const { topups } = useFuelStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entryToEdit, setEntryToEdit] = useState<MileageEntry | undefined>(undefined);

  // Load mileage entries and sync from fuel topups when component mounts
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Sync mileage from fuel topups
  useEffect(() => {
    if (topups.length > 0) {
      syncFromFuelTopups(topups);
    }
  }, [topups, syncFromFuelTopups]);

  return (
    <>
      {/* Mobile Navigation */}
      <MobileNavigation />
      
      {/* Responsive Layout */}
      <SidebarProvider defaultOpen={false}>
        <div className="lg:flex w-screen">
          {/* Sidebar - Desktop only */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>
          
          <main className="flex-1 lg:ml-0">
            {/* Header - show on all sizes so top nav actions are visible */}
            <Header />
            
            {/* Dashboard Content - Responsive */}
            <div className="px-4 sm:px-6 pt-14 lg:pt-6 pb-20 lg:pb-6">
              <div className="mx-auto max-w-7xl w-full">
                {/* Page Header */}
                <div className="mb-8" style={{ marginBottom: 'var(--space-xl)' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-normal tracking-tight uppercase">Mileage</h1>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Track your mileage, efficiency, and travel patterns
                      </p>
                    </div>
                    <MonthSelector
                      currentMonth={currentMonth}
                      onMonthChange={setCurrentMonth}
                    />
                  </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="mb-8" style={{ marginBottom: 'var(--space-xl)' }}>
                  <MileageSummaryCards currentMonth={currentMonth} />
                </div>

                {/* Main Content */}
                <div className="space-y-8 w-full" style={{ gap: 'var(--space-xl)' }}>
                  {/* Mileage Breakdown - Full width row */}
                  <MileageBreakdown currentMonth={currentMonth} />
                  
                  {/* Monthly Overview - Full width row */}
                  <MileageMonthlyOverview currentMonth={currentMonth} />
                  
                  <div className="border-t border-dotted pt-6 space-y-2" style={{ borderColor: 'var(--color-accent-red)' }}>
                    <h2 className="text-2xl font-normal tracking-tight uppercase">Performance</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Monitor long-term mileage trends and seasonal patterns
                    </p>
                  </div>
                  
                  {/* Mileage Chart */}
                  <MileageChart />
                  
                  {/* Seasonal Tracker */}
                  <MileageSeasonalTracker />
                </div>

                {/* Mileage History */}
                <div className="mt-8" style={{ marginTop: 'var(--space-xl)' }}>
                  <MileageLog 
                    onEdit={(entry) => {
                      setEntryToEdit(entry);
                      toggleEntryPanel(true);
                    }}
                  />
                </div>
              </div>
            </div>

            <MileageEntryPanel
              isOpen={isEntryPanelOpen}
              onClose={() => {
                toggleEntryPanel(false);
                setEntryToEdit(undefined);
              }}
              entryToEdit={entryToEdit}
            />
            
          </main>
        </div>
      </SidebarProvider>
    </>
  );
};

