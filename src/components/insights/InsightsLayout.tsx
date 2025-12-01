import React from 'react';
import { Header } from '../dashboard/Header';
import { AppSidebar } from '../dashboard/AppSidebar';
import { InsightsPage } from './InsightsPage';
import { MobileNavigation } from '../mobile/MobileNavigation';

export const InsightsLayout: React.FC = () => {
  return (
    <>
      {/* Mobile Navigation */}
      <MobileNavigation />
      
      {/* Responsive Layout */}
      <div className="lg:flex w-screen">
        {/* Sidebar - Desktop only */}
        <div className="hidden lg:block">
          <AppSidebar />
        </div>
        
        <main className="flex-1 lg:ml-0">
          <Header />
          <div className="px-4 sm:px-6 pt-14 lg:pt-6 pb-20 lg:pb-6">
            <InsightsPage />
          </div>
        </main>
      </div>
    </>
  );
};
