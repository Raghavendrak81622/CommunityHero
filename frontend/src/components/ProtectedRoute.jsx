import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Show warning toast if user tries to access a protected page while not logged in
    if (!loading && !user) {
      toast.error("Please sign in to report a community issue.", {
        id: "auth-protected-route-toast", // Deduplicates toasts if user hits multiple times
      });
    }
  }, [user, loading]);

  if (loading) {
    // Clean loading spinner to match our dark startup design
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="relative">
          <div className="w-10 h-10 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Redirect to Home page if not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Render children if logged in
  return children;
}
