import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-grow flex items-center justify-center py-20 px-4">
      <div className="bg-slate-900/20 border border-slate-900 p-8 sm:p-12 rounded-3xl text-center space-y-6 max-w-md shadow-2xl relative overflow-hidden">
        {/* Glow behind icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 relative z-10 animate-bounce">
          <Compass className="h-8 w-8 text-indigo-400" />
        </div>

        <div className="space-y-2 relative z-10">
          <h1 className="text-6xl font-extrabold text-white tracking-tight">404</h1>
          <h2 className="text-xl font-bold text-slate-200 mt-2">Lost in Transit</h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            The page you are looking for doesn't exist or has been relocated to another address.
          </p>
        </div>

        <div className="pt-4 relative z-10">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-650/15 hover:shadow-indigo-650/25 transition-all active:scale-[0.98]"
          >
            <Home className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
