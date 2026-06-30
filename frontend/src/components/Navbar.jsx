import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Menu, 
  X, 
  PlusCircle, 
  LogIn, 
  LogOut, 
  Bell, 
  Clock, 
  CheckCircle2, 
  Zap, 
  FileText,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { notificationsService } from '../services/notificationsService';
import { toDate } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { user, signInWithGoogle, logout } = useAuth();
  
  // Real-time notifications state
  const [notifications, setNotifications] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  // Subscribe to real-time notification updates when user is authenticated
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const unsubscribe = notificationsService.getUserNotifications(user.uid, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead(notifications);
      toast.success("All notifications marked as read.");
    } catch (err) {
      console.error(err);
    }
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/report", label: "Report Problem" },
    { to: "/about", label: "About Us" },
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-zinc-200/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="bg-zinc-950 p-2 rounded-xl group-hover:bg-zinc-800 transition-all shadow-sm">
              <Shield className="h-4.5 w-4.5 text-white fill-white" />
            </div>
            <span className="text-lg font-black text-zinc-950 tracking-tight font-display">
              Community Hero
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors duration-200 relative py-1 ${
                    isActive
                      ? "text-zinc-950"
                      : "text-zinc-550 hover:text-zinc-950"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full animate-fade-in" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
            
            {/* Quick Action CTA */}
            <Link
              to="/report"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white transition-all duration-200 shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Report Issue</span>
            </Link>

            {/* Notification Center Trigger */}
            {user && (
              <div className="relative mr-2">
                <button
                  onClick={() => setPanelOpen(true)}
                  className="p-2 hover:bg-zinc-100 rounded-full text-zinc-550 hover:text-zinc-900 transition-colors relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-zinc-950 text-white rounded-full flex items-center justify-center text-[8px] font-black">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}
            
            {/* Authentication Portal */}
            <div className="border-l border-zinc-200 pl-6 flex items-center">
              {user ? (
                <div className="flex items-center space-x-3 bg-zinc-50 pl-3 pr-2 py-1 rounded-full border border-zinc-200">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User Avatar"}
                      className="h-6 w-6 rounded-full object-cover border border-zinc-250"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px] font-bold uppercase">
                      {user.displayName ? user.displayName.charAt(0) : 'U'}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-zinc-800 max-w-[100px] truncate">
                    {user.displayName || "User"}
                  </span>
                  <button
                    onClick={logout}
                    className="p-1 hover:bg-zinc-200 rounded-full text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-800 transition-all duration-200 cursor-pointer"
                >
                  <LogIn className="h-4 w-4 text-zinc-900" />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu Button & Notification Trigger */}
          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <div className="relative">
                <button
                  onClick={() => setPanelOpen(true)}
                  className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-900 transition-colors relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-zinc-950 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            <button
              onClick={toggleMenu}
              className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 focus:outline-none transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="md:hidden border-b border-zinc-200 bg-white/95 backdrop-blur-lg animate-slide-down">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-semibold transition-colors ${
                    isActive
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-550/10 hover:text-zinc-900"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            
            <div className="pt-4 pb-1 border-t border-zinc-200 mt-2 px-3">
              <Link
                to="/report"
                onClick={() => setIsOpen(false)}
                className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-full text-base font-semibold bg-zinc-950 hover:bg-zinc-800 text-white transition-colors cursor-pointer"
              >
                <PlusCircle className="h-5 w-5" />
                <span>Report Issue</span>
              </Link>
            </div>

            {/* Mobile Auth Button panel */}
            <div className="pt-2 px-3">
              {user ? (
                <div className="pt-3 border-t border-zinc-200 mt-3 space-y-3">
                  <div className="flex items-center space-x-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="h-8 w-8 rounded-full object-cover border border-zinc-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold uppercase text-xs">
                        {user.displayName ? user.displayName.charAt(0) : 'U'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{user.displayName || "User"}</p>
                      <p className="text-xs text-zinc-400">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-full border border-zinc-200 text-zinc-700 font-semibold text-sm hover:bg-zinc-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signInWithGoogle();
                  }}
                  className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-full border border-zinc-200 text-zinc-800 font-semibold text-sm hover:bg-zinc-50 cursor-pointer"
                >
                  <LogIn className="h-4 w-4 text-zinc-900" />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Notification Drawer Panel */}
      {panelOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="w-full max-w-sm h-screen bg-white border-l border-zinc-200 p-6 flex flex-col justify-start animate-slide-in-right overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4 shrink-0">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-zinc-900" />
                <h3 className="text-base font-bold text-zinc-950 font-display">Notifications</h3>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer border border-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions & Mark All read */}
            {unreadCount > 0 && (
              <div className="pt-2 shrink-0">
                <button
                  onClick={handleMarkAllRead}
                  className="text-left text-xs font-bold text-zinc-900 hover:text-zinc-700 transition-colors cursor-pointer block w-full"
                >
                  Mark all as read
                </button>
              </div>
            )}

            {/* Notifications list */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 mt-4 space-y-4">
              {notifications.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 flex flex-col items-center justify-center space-y-2">
                  <Bell className="h-8 w-8 text-zinc-300 animate-pulse mb-1" />
                  <p className="font-semibold text-zinc-500">All caught up!</p>
                  <p className="text-[10px] text-zinc-400">No alerts matching your reports.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const getNotifIcon = (type) => {
                    switch (type) {
                      case 'comment':
                        return <MessageSquare className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />;
                      case 'Report Resolved':
                        return <CheckCircle2 className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />;
                      case 'Admin Note Added':
                        return <FileText className="h-4 w-4 text-zinc-800 shrink-0 mt-0.5" />;
                      case 'Status Changed':
                      default:
                        return <Clock className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />;
                    }
                  };

                  const notificationDate = toDate(n.timestamp);
                  const dateLabel = notificationDate
                    ? notificationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Just now';

                  return (
                    <div
                      key={n.id}
                      onClick={async () => {
                        await notificationsService.markAsRead(n.id);
                        setPanelOpen(false);
                        navigate(`/problem/${n.reportId}`);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden flex space-x-3 items-start ${
                        n.read
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300'
                          : 'bg-white border-zinc-950 text-zinc-900 hover:border-zinc-950 font-semibold shadow-sm'
                      }`}
                    >
                      {/* Unread Indicator Bar */}
                      {!n.read && (
                        <span className="absolute top-0 bottom-0 left-0 w-0.5 bg-zinc-950" />
                      )}
                      
                      {getNotifIcon(n.type)}
                      
                      <div className="space-y-1 min-w-0 flex-grow">
                        <p className="text-xs leading-relaxed text-zinc-900 break-words">{n.message}</p>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-zinc-400">
                          <span>{dateLabel}</span>
                          {!n.read && <span className="h-1.5 w-1.5 bg-zinc-950 rounded-full animate-ping" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}
