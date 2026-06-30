import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Outlet } from 'react-router-dom';
import { useProblemNotificationListener } from '../hooks/useProblemNotificationListener';

export default function Layout({ children }) {
  // Initialize background notifications change-detection listener
  useProblemNotificationListener();

  // Monitor network connection status
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white relative overflow-hidden">

      <Navbar />

      {/* Floating Offline Warning Banner */}
      {isOffline && (
        <div className="bg-zinc-900/95 text-white text-xs font-bold text-center py-2.5 px-4 sticky top-16 z-50 flex items-center justify-center space-x-2 backdrop-blur-sm border-b border-zinc-800 animate-fade-in">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shrink-0" />
          <span>Offline Mode: Showing cached report data. Map features and image uploads are limited.</span>
        </div>
      )}
      
      {/* Content wrapper */}
      <main className="flex-grow z-10 flex flex-col">
        {children || <Outlet />}
      </main>
      
      <Footer />
    </div>
  );
}
