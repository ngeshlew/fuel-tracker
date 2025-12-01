import React from 'react';
import { Header } from '../dashboard/Header';
import { AppSidebar } from '../dashboard/AppSidebar';
import { Settings } from './Settings';
import { UserProfile } from '../auth/UserProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileNavigation } from '../mobile/MobileNavigation';

export const SettingsLayout: React.FC = () => {
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
            <div className="mx-auto max-w-4xl">
              <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile">
                  <UserProfile />
                </TabsContent>
                
                <TabsContent value="settings">
                  <Settings />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
