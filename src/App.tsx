import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from "@/components/ui/toast-container";
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Dashboard } from './components/dashboard/Dashboard';
import { TwoColumnLoginPage } from './components/auth/TwoColumnLoginPage';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout } from './components/settings/SettingsLayout';
import { InsightsLayout } from './components/insights/InsightsLayout';
import { MileageDashboard } from './components/mileage/MileageDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useFuelStore } from './store/useFuelStore';
import './index.css';

function App() {
  const { loadFuelTopups, setupRealtimeUpdates, cleanupRealtimeUpdates } = useFuelStore();

  useEffect(() => {
    // Load initial data and set up real-time updates
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        await loadFuelTopups();
        console.log('Data loaded, setting up real-time updates...');
        
        // Try to set up real-time updates, but don't fail if it doesn't work
        try {
          setupRealtimeUpdates();
          console.log('Real-time updates set up successfully');
        } catch (socketError) {
          console.warn('Failed to set up real-time updates (this is OK):', socketError);
        }
        
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
              console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
              console.log('SW registration failed: ', registrationError);
            });
        }
        
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      try {
        cleanupRealtimeUpdates();
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, [loadFuelTopups, setupRealtimeUpdates, cleanupRealtimeUpdates]);

  // Wrapper component to provide required callbacks to login page
  const LoginRoute = () => {
    const navigate = useNavigate();
    return (
      <TwoColumnLoginPage
        onForgotPassword={() => navigate('/login')}
      />
    );
  };

  return (
    <ThemeProvider defaultTheme="mono" storageKey="fuel-tracker-theme">
      <ErrorBoundary>
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <div>
              <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/mileage" element={<ProtectedRoute><MileageDashboard /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><InsightsLayout /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>} />
              </Routes>
            </div>
          </div>
        </Router>
        <PWAInstallPrompt />
        <Toaster />
        <ToastContainer />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;