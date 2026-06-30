import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProblems } from '../hooks/useProblems';
import { CATEGORIES } from '../utils/categories';
import { toSearchableText } from '../utils/formatters';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Search,
  Download,
  Trash2,
  X,
  Layers,
  FileText,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// Authorized administrator email list
const ADMIN_EMAILS = [
  'admin@communityhero.com',
  'ragha@gmail.com',
  'user@example.com',
  'raghav@gmail.com',
  'raghav.communityhero@gmail.com'
];

export default function AdminDashboard() {
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth();
  const { problems: fetchedProblems, loading: problemsLoading } = useProblems();
  
  // Local synchronized state to allow responsive updates
  const [problemsList, setProblemsList] = useState([]);
  
  // Table filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest

  // Modal / Detail Sidebar states
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync database problems into local state
  useEffect(() => {
    if (fetchedProblems) {
      setProblemsList(fetchedProblems);
    }
  }, [fetchedProblems]);

  // Sync edits when report is selected
  useEffect(() => {
    if (selectedReport) {
      setAdminNotes(selectedReport.adminNotes || '');
      setEditStatus(selectedReport.status || 'Reported');
      setEditPriority(selectedReport.severity || selectedReport.priority || 'Medium');
    }
  }, [selectedReport]);

  // Access check
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  // Stats Calculations
  const stats = useMemo(() => {
    if (!problemsList.length) {
      return { total: 0, pending: 0, inProgress: 0, resolved: 0, critical: 0, activeUsers: 0 };
    }
    
    const total = problemsList.length;
    const pending = problemsList.filter(p => p.status === 'Reported' || p.status === 'Investigating').length;
    const inProgress = problemsList.filter(p => p.status === 'In Progress').length;
    const resolved = problemsList.filter(p => p.status === 'Resolved').length;
    const critical = problemsList.filter(p => {
      const prio = p.severity || p.priority || 'Medium';
      return toSearchableText(prio) === 'critical';
    }).length;
    const activeUsers = new Set(problemsList.map(p => p.userId)).size;

    return { total, pending, inProgress, resolved, critical, activeUsers };
  }, [problemsList]);

  // Analytics Helpers
  const categoryChartData = useMemo(() => {
    const counts = {};
    problemsList.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key.length > 15 ? key.substring(0, 15) + '...' : key,
      Count: counts[key]
    })).sort((a, b) => b.Count - a.Count);
  }, [problemsList]);

  const priorityChartData = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    problemsList.forEach(p => {
      const prio = String(p.severity || p.priority || 'Medium');
      const norm = prio.charAt(0).toUpperCase() + prio.slice(1).toLowerCase();
      if (counts[norm] !== undefined) counts[norm] += 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [problemsList]);

  const statusChartData = useMemo(() => {
    const counts = { Reported: 0, Investigating: 0, 'In Progress': 0, Resolved: 0 };
    problemsList.forEach(p => {
      const stat = String(p.status || 'Reported');
      let norm = stat.charAt(0).toUpperCase() + stat.slice(1).toLowerCase();
      if (norm === 'In progress') norm = 'In Progress';
      if (counts[norm] !== undefined) counts[norm] += 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [problemsList]);

  const timelineChartData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    // Initialize 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      data.push({
        date: dateStr,
        Reports: 0
      });
    }

    problemsList.forEach(p => {
      if (!p.date) return;
      const match = data.find(item => item.date === p.date);
      if (match) match.Reports += 1;
    });

    return data.map(item => {
      const [year, month, day] = item.date.split('-');
      const dateObj = new Date(year, month - 1, day);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        name: label,
        Reports: item.Reports
      };
    });
  }, [problemsList]);

  // Filter & Sort table reports
  const filteredProblems = useMemo(() => {
    let result = [...problemsList];

    // Search query matches title, description, locality, pincode
    if (searchQuery.trim()) {
      const q = toSearchableText(searchQuery);
      result = result.filter(p => 
        toSearchableText(p.title).includes(q) ||
        toSearchableText(p.description).includes(q) ||
        toSearchableText(p.locality || p.location).includes(q) ||
        toSearchableText(p.pincode).includes(q)
      );
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter) {
      result = result.filter(p => {
        const prio = p.severity || p.priority || 'Medium';
        return toSearchableText(prio) === toSearchableText(priorityFilter);
      });
    }

    // Sort order
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.date || '') - new Date(a.date || ''));
    } else {
      result.sort((a, b) => new Date(a.date || '') - new Date(b.date || ''));
    }

    return result;
  }, [problemsList, searchQuery, categoryFilter, statusFilter, priorityFilter, sortBy]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredProblems.length === 0) {
      toast.error("No reports matching current filters to export.");
      return;
    }

    const headers = ["ID", "Title", "Category", "Priority", "Status", "Locality", "Pincode", "Reporter", "Date", "Admin Notes"];
    const rows = filteredProblems.map(p => [
      p.id,
      p.title,
      p.category,
      p.severity || p.priority || 'Medium',
      p.status,
      p.locality || p.location || '',
      p.pincode || '',
      p.reporter || '',
      p.date || '',
      p.adminNotes || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `community_hero_triage_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully!");
  };

  // Save report edits
  const handleSaveReportEdits = async () => {
    if (!selectedReport) return;
    setIsUpdating(true);
    try {
      const updates = {
        status: editStatus,
        priority: editPriority, // Update priority field
        severity: editPriority, // Update severity field for compatibility
        adminNotes: adminNotes.trim()
      };

      // Directly update Firestore to bypass owner-validation checks in problemsService
      const docRef = doc(db, 'problems', selectedReport.id);
      await updateDoc(docRef, updates);
      
      // Update local state list
      setProblemsList(prev => prev.map(p => p.id === selectedReport.id ? { ...p, ...updates } : p));
      setSelectedReport(null);
      toast.success("Report updated successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update report changes.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete report
  const handleDeleteReport = async () => {
    if (!selectedReport) return;
    if (window.confirm("Are you sure you want to permanently delete this report? This cannot be undone.")) {
      setIsUpdating(true);
      try {
        // Directly delete Firestore doc to bypass owner-validation checks in problemsService
        const docRef = doc(db, 'problems', selectedReport.id);
        await deleteDoc(docRef);
        
        // Update local state list
        setProblemsList(prev => prev.filter(p => p.id !== selectedReport.id));
        setSelectedReport(null);
        toast.success("Report deleted successfully.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete report.");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Color Palette Definitions
  const COLORS = {
    pie: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'],
    priorityColors: {
      Critical: '#ef4444',
      High: '#f97316',
      Medium: '#eab308',
      Low: '#10b981'
    },
    statusColors: {
      Reported: '#64748b',
      Investigating: '#f59e0b',
      'In Progress': '#6366f1',
      Resolved: '#10b981'
    }
  };

  // Loader state
  if (authLoading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Access Denied template
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex-grow flex items-center justify-center">
        <div className="bg-slate-900/40 border border-slate-800 p-8 sm:p-12 rounded-3xl text-center space-y-6 max-w-lg shadow-2xl relative backdrop-blur-xl">
          {/* Glowing element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="mx-auto w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 relative z-10">
            <ShieldAlert className="h-10 w-10 text-rose-455" />
          </div>
          
          <div className="space-y-3 relative z-10">
            <h2 className="text-3xl font-extrabold text-white">Access Denied</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The Admin Panel is reserved strictly for authorized municipal operators. Your account email address is not in the approved database.
            </p>
          </div>

          {user && (
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 text-xs text-slate-500 space-y-1 text-left">
              <span className="font-semibold text-slate-400">Authenticated Account:</span>
              <p className="text-slate-350 truncate">{user.email}</p>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {!user ? (
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center justify-center px-6 py-3 bg-indigo-650 hover:bg-indigo-555 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                Sign in with Google
              </button>
            ) : (
              <button
                onClick={logout}
                className="inline-flex items-center justify-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-colors cursor-pointer border border-slate-700"
              >
                Switch Account
              </button>
            )}
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 hover:bg-slate-850 text-slate-300 text-sm font-bold rounded-xl transition-colors border border-slate-800"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow space-y-12">
      
      {/* 1. Header with Title & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-900">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center space-x-2">
            <span className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 shrink-0">
              <Layers className="h-6 w-6" />
            </span>
            <span>Triage Command Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-450 mt-1">Municipal operator administration and civic analytics panel</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Skeletons / Statistics Cards Grid */}
      {problemsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          {Array(6).fill(0).map((_, idx) => (
            <div key={idx} className="p-5 bg-slate-900/10 border border-slate-900 rounded-2xl space-y-3 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-2/3" />
              <div className="h-8 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          {/* Card: Total */}
          <div className="p-5 bg-slate-900/25 border border-slate-900 rounded-2xl space-y-1 hover:border-slate-800 transition-colors">
            <p className="text-xs font-semibold tracking-wider text-slate-455 uppercase">Total Reports</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{stats.total}</p>
          </div>
          {/* Card: Pending */}
          <div className="p-5 bg-slate-900/25 border border-slate-900 rounded-2xl space-y-1 hover:border-slate-800 transition-colors">
            <p className="text-xs font-semibold tracking-wider text-amber-455 uppercase flex items-center">
              <Clock className="h-3 w-3 mr-1 text-amber-500" />
              <span>Pending</span>
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{stats.pending}</p>
          </div>
          {/* Card: In Progress */}
          <div className="p-5 bg-slate-900/25 border border-slate-900 rounded-2xl space-y-1 hover:border-slate-800 transition-colors">
            <p className="text-xs font-semibold tracking-wider text-indigo-400 uppercase flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-indigo-400" />
              <span>In Progress</span>
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{stats.inProgress}</p>
          </div>
          {/* Card: Resolved */}
          <div className="p-5 bg-slate-900/25 border border-slate-900 rounded-2xl space-y-1 hover:border-slate-800 transition-colors">
            <p className="text-xs font-semibold tracking-wider text-emerald-455 uppercase flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
              <span>Resolved</span>
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{stats.resolved}</p>
          </div>
          {/* Card: Critical */}
          <div className="p-5 bg-slate-900/25 border border-slate-900 rounded-2xl space-y-1 hover:border-slate-800 transition-colors">
            <p className="text-xs font-semibold tracking-wider text-rose-455 uppercase flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1 text-rose-500 animate-pulse" />
              <span>Critical</span>
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{stats.critical}</p>
          </div>
          {/* Card: Active Users */}
          <div className="p-5 bg-slate-900/25 border border-slate-900 rounded-2xl space-y-1 hover:border-slate-800 transition-colors">
            <p className="text-xs font-semibold tracking-wider text-slate-455 uppercase flex items-center">
              <Users className="h-3 w-3 mr-1 text-slate-400" />
              <span>Active Users</span>
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{stats.activeUsers}</p>
          </div>
        </div>
      )}

      {/* 3. Analytics Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Timeline activity chart */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <span>Submissions Timeline (Last 30 Days)</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Community engagement and reports filed per day</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineChartData}>
                <defs>
                  <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="Reports" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorReports)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reports by Category BarChart */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>Reports by Category</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Top reporting categories submitted by residents</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData.slice(0, 8)}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                />
                <Bar dataKey="Count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Charts Grid */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 sm:p-6 space-y-4 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Priority PieChart */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reports by Priority</h3>
              <p className="text-[10px] text-slate-550 mt-0.5">Triage priority distributions</p>
            </div>
            
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {priorityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.priorityColors[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status PieChart */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reports by Status</h3>
              <p className="text-[10px] text-slate-550 mt-0.5">Current workflow status values</p>
            </div>
            
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.statusColors[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Report Management Search, Filters, & Table */}
      <div className="bg-slate-900/15 border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6">
        
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span className="bg-indigo-500/10 p-1.5 rounded-lg text-indigo-400">
              <FileText className="h-5 w-5" />
            </span>
            <span>Reports Management Database</span>
          </h2>
          <p className="text-xs text-slate-455">Search reports, filter attributes, and select rows to edit details or add admin logs.</p>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-550 text-xs focus:outline-none transition-colors"
            />
          </div>

          {/* Category Select */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Investigating">Investigating</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Priority Select */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sort Select */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs focus:outline-none appearance-none cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>
        </div>

        {/* Reports Table container */}
        <div className="overflow-x-auto rounded-xl border border-slate-900">
          <table className="min-w-full divide-y divide-slate-900 text-xs text-left">
            <thead className="bg-slate-950/60 text-slate-450 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Title / ID</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-900 bg-slate-950/20 text-slate-350">
              {problemsLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-900 rounded w-3/4" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-900 rounded w-2/3" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-900 rounded w-1/2" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-900 rounded w-1/2" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-900 rounded w-2/3" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-900 rounded w-1/3" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-900 rounded w-10 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-550">
                    No matching reports found in the operator database.
                  </td>
                </tr>
              ) : (
                filteredProblems.map((prob) => {
                  const prio = prob.severity || prob.priority || 'Medium';
                  const status = prob.status || 'Reported';
                  return (
                    <tr 
                      key={prob.id}
                      className="hover:bg-slate-900/20 transition-colors cursor-pointer group"
                      onClick={() => setSelectedReport(prob)}
                    >
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{prob.title}</p>
                        <p className="text-[10px] text-slate-550 truncate mt-0.5">ID: {prob.id}</p>
                      </td>
                      <td className="px-6 py-4 truncate">{prob.category}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          toSearchableText(prio) === 'critical'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : toSearchableText(prio) === 'high'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : toSearchableText(prio) === 'medium'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {prio}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                          status === 'Resolved'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : status === 'In Progress'
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            : status === 'Investigating'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 truncate max-w-[150px]">
                        {prob.locality || prob.location || 'N/A'} {prob.pincode ? `(${prob.pincode})` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-455">{prob.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-indigo-455 group-hover:text-indigo-400 transition-colors inline-flex items-center">
                          <span>Manage</span>
                          <ChevronRight className="h-4 w-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 5. Admin Actions Modal (Side drawer overlay style) */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="w-full max-w-lg h-screen bg-slate-950 border-l border-slate-900 p-6 sm:p-8 space-y-6 overflow-y-auto flex flex-col justify-between animate-slide-in-right">
            
            {/* Modal Body */}
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">REPORT LOG ID: {selectedReport.id}</span>
                  <h3 className="text-base font-bold text-white mt-0.5 truncate max-w-[320px]">
                    {selectedReport.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-850"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* General details */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900">
                    <p className="font-semibold text-slate-500">Reported Category</p>
                    <p className="text-slate-300 mt-1 font-medium">{selectedReport.category}</p>
                  </div>
                  <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900">
                    <p className="font-semibold text-slate-500">Report Date</p>
                    <p className="text-slate-300 mt-1 font-medium">{selectedReport.date}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900 space-y-1">
                  <p className="font-semibold text-slate-500">Location Details</p>
                  <p className="text-slate-300">{selectedReport.locality || selectedReport.location || 'N/A'}</p>
                  {selectedReport.pincode && <p className="text-slate-455">Pincode: {selectedReport.pincode}</p>}
                </div>

                <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900 space-y-1">
                  <p className="font-semibold text-slate-500">Resident Description</p>
                  <p className="text-slate-400 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
                    {selectedReport.description}
                  </p>
                </div>
              </div>

              {/* Form inputs for edits */}
              <div className="space-y-4 pt-4 border-t border-slate-900">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Administrative Overrides</p>
                
                {/* Select Status */}
                <div className="space-y-2">
                  <label htmlFor="modal-status" className="block text-xs text-slate-400">
                    Update Report Status
                  </label>
                  <select
                    id="modal-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="Reported">Reported</option>
                    <option value="Investigating">Investigating</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                {/* Select Priority */}
                <div className="space-y-2">
                  <label htmlFor="modal-priority" className="block text-xs text-slate-400">
                    Update Priority Level
                  </label>
                  <select
                    id="modal-priority"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {/* Internal notes */}
                <div className="space-y-2">
                  <label htmlFor="modal-notes" className="block text-xs text-slate-400">
                    Internal Admin Notes / Dispatch Logs
                  </label>
                  <textarea
                    id="modal-notes"
                    rows="4"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Log dispatch actions, contractor schedules, or notes on inspection findings..."
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-550 text-xs focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="pt-6 border-t border-slate-900 space-y-3">
              <div className="flex gap-4">
                <button
                  onClick={handleSaveReportEdits}
                  disabled={isUpdating}
                  className="flex-1 inline-flex items-center justify-center py-2.5 px-4 bg-indigo-650 hover:bg-indigo-555 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  disabled={isUpdating}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <button
                onClick={handleDeleteReport}
                disabled={isUpdating}
                className="w-full inline-flex items-center justify-center space-x-1 py-2 px-4 bg-rose-500/5 hover:bg-rose-500/15 text-rose-455 border border-rose-555/20 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                <span>Delete Report permanently</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
