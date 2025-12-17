import React from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Gauge, Settings, Zap } from 'lucide-react';
import {
  SidebarBody,
  SidebarLink,
} from '@/components/ui/animated-sidebar';

const navigationItems = [
  { 
    name: 'Mileage', 
    url: '/mileage', 
    iconName: 'Gauge' as const
  },
  { 
    name: 'Fuel', 
    url: '/', 
    iconName: 'LayoutDashboard' as const
  },
  { 
    name: 'Settings', 
    url: '/settings', 
    iconName: 'Settings' as const
  },
];

const iconComponents = {
  LayoutDashboard,
  Gauge,
  Settings,
};

export const Logo = () => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm text-black dark:text-white py-1 relative z-20">
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0 flex items-center justify-center">
        <Zap className="h-3 w-3 text-white dark:text-black" />
      </div>
      <span className="font-medium text-black dark:text-white whitespace-pre uppercase tracking-wide">
        Tracker
      </span>
    </div>
  );
};

export const LogoIcon = () => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm text-black dark:text-white py-1 relative z-20">
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0 flex items-center justify-center">
        <Zap className="h-3 w-3 text-white dark:text-black" />
      </div>
    </div>
  );
};

export const AppSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <SidebarBody className="justify-between gap-10">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Logo />
        <div className="mt-8 flex flex-col gap-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.url || 
              (item.url === '/' && location.pathname === '/dashboard');
            const IconComponent = iconComponents[item.iconName];
            return (
              <SidebarLink 
                key={item.name} 
                link={{
                  label: item.name,
                  href: item.url,
                  icon: <IconComponent className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
                }}
                isActive={isActive}
              />
            );
          })}
        </div>
      </div>
      <div>
        <div className="p-4">
          <p className="text-xs uppercase tracking-tight text-neutral-600 dark:text-neutral-400 truncate">
            user@example.com
          </p>
        </div>
      </div>
    </SidebarBody>
  );
};
