import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProblems } from '../hooks/useProblems';
import { CATEGORIES, getCategoryConfig } from '../utils/categories';
import { getDistance } from '../utils/distance';
import { toSearchableText } from '../utils/formatters';
import { geminiService } from '../services/geminiService';
import { problemsService } from '../services/problemsService';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { 
  ArrowRight, 
  MapPin, 
  ThumbsUp,
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Camera, 
  TrendingUp, 
  Users, 
  Zap,
  CheckSquare,
  Navigation,
  Search,
  Filter,
  X,
  Sparkles,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const navigate = useNavigate();
  const { problems: fetchedProblems, loading, error } = useProblems();
  const [localProblems, setLocalProblems] = useState([]);
  const [upvotedIds, setUpvotedIds] = useState([]);

  // Calculated database statistics for real values
  const latestReports = useMemo(() => {
    return [...localProblems]
      .sort((a, b) => new Date(b.date || '') - new Date(a.date || ''))
      .slice(0, 2);
  }, [localProblems]);

  const totalReportsCount = localProblems.length;
  const resolvedCount = localProblems.filter(p => p.status === 'Resolved' || p.status === 'Fixed').length;
  const resolvedPercent = totalReportsCount > 0 ? ((resolvedCount / totalReportsCount) * 100).toFixed(1) : '0.0';
  const uniqueAuthors = new Set(localProblems.map(p => p.createdBy).filter(Boolean)).size;
  const activeUsersReal = Math.max(1, uniqueAuthors);
  const satisfactionRate = totalReportsCount > 0 
    ? ((localProblems.filter(p => p.status === 'Resolved' || p.status === 'In Progress' || p.status === 'Fixed').length / totalReportsCount) * 100).toFixed(1)
    : '100.0';

  // Geolocation states
  const [userLocation, setUserLocation] = useState(null);

  // Search & Filter states
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSmartAnalyzing, setIsSmartAnalyzing] = useState(false);

  const [filters, setFilters] = useState({
    category: '',
    status: '',
    priority: '',
    startDate: '',
    endDate: '',
    maxDistance: '' // '', '1', '5', '10', '25'
  });

  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, priority, upvotes

  // Search Analytics state
  const [analytics, setAnalytics] = useState({ count: 0, duration: '0.0' });

  // Map references
  const homeMapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const clustererRef = useRef(null);
  const searchContainerRef = useRef(null);
  const refreshMarkersRef = useRef(null);
  const shouldShowMap = !loading && !error && localProblems.length > 0;

  // Sync state with fetched database data
  useEffect(() => {
    if (fetchedProblems) {
      setLocalProblems(fetchedProblems);
    }
  }, [fetchedProblems]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter(item => typeof item === 'string'));
      }
    } catch (storageErr) {
      console.warn("Ignoring invalid recent search cache:", storageErr);
    }

    try {
      const savedUpvotes = localStorage.getItem('upvotedProblems');
      if (savedUpvotes) {
        setUpvotedIds(JSON.parse(savedUpvotes));
      }
    } catch (err) {
      console.error("Failed to load upvoted problems from localStorage:", err);
    }

    // Locate user if permission is already granted
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(result => {
          if (result.state === 'granted') {
            navigator.geolocation.getCurrentPosition((position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            });
          }
        })
        .catch(() => {
          // Permission probing is optional; the explicit location button still works.
        });
    }

    // Click outside handler for search suggestions dropdown
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Save upvoted IDs to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('upvotedProblems', JSON.stringify(upvotedIds));
    } catch (err) {
      console.error("Failed to save upvoted problems to localStorage:", err);
    }
  }, [upvotedIds]);

  // Save query to localStorage recent list
  const saveRecentSearch = (queryText) => {
    if (!queryText.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(q => toSearchableText(q) !== toSearchableText(queryText));
      const updated = [queryText, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      } catch (storageErr) {
        console.warn("Unable to save recent searches:", storageErr);
      }
      return updated;
    });
  };

  // Autocomplete Suggestions logic
  useEffect(() => {
    if (searchInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const q = toSearchableText(searchInput);
    
    // Suggest matching Categories
    const categoryMatches = CATEGORIES.filter(cat => toSearchableText(cat).includes(q))
      .map(cat => ({ type: 'category', text: cat }));

    // Suggest matching Report titles
    const titleMatches = localProblems.filter(p => toSearchableText(p.title).includes(q))
      .slice(0, 4)
      .map(p => ({ type: 'report', text: p.title, id: p.id }));

    setSuggestions([...categoryMatches, ...titleMatches]);
  }, [searchInput, localProblems]);

  // Calculate matching problems & search duration in milliseconds
  const filteredProblems = useMemo(() => {
    const startTime = performance.now();
    let result = [...localProblems];

    // 1. Text Search matching Title, Description, Category, Locality, Pincode
    if (searchInput.trim()) {
      const q = toSearchableText(searchInput);
      result = result.filter(p => {
        const titleMatch = toSearchableText(p.title).includes(q);
        const descMatch = toSearchableText(p.description).includes(q);
        const categoryMatch = toSearchableText(p.category).includes(q);
        const localityMatch = toSearchableText(p.locality || p.location).includes(q);
        const pincodeMatch = toSearchableText(p.pincode).includes(q);

        return titleMatch || descMatch || categoryMatch || localityMatch || pincodeMatch;
      });
    }

    // 2. Category Filter
    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }

    // 3. Status Filter
    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }

    // 4. Priority Filter
    if (filters.priority) {
      result = result.filter(p => {
        const prio = p.severity || p.priority || 'Medium';
        return toSearchableText(prio) === toSearchableText(filters.priority);
      });
    }

    // 5. Date Range Filter
    if (filters.startDate) {
      result = result.filter(p => p.date >= filters.startDate);
    }
    if (filters.endDate) {
      result = result.filter(p => p.date <= filters.endDate);
    }

    // 6. Distance Filter (requires userLocation)
    if (filters.maxDistance && userLocation) {
      const maxDistNum = Number(filters.maxDistance);
      result = result.filter(p => {
        if (!p.latitude || !p.longitude) return false;
        const dist = getDistance(
          userLocation.lat,
          userLocation.lng,
          Number(p.latitude),
          Number(p.longitude)
        );
        return dist <= maxDistNum;
      });
    }

    // 8. Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.date || '') - new Date(a.date || ''));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.date || '') - new Date(b.date || ''));
    } else if (sortBy === 'priority') {
      const weights = { critical: 4, high: 3, medium: 2, low: 1 };
      result.sort((a, b) => {
        const weightA = weights[toSearchableText(a.severity || a.priority || 'Medium')] || 0;
        const weightB = weights[toSearchableText(b.severity || b.priority || 'Medium')] || 0;
        return weightB - weightA;
      });
    } else if (sortBy === 'upvotes') {
      result.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(1);
    
    return { items: result, duration };
  }, [localProblems, searchInput, filters, sortBy, userLocation]);

  // Synchronize analytics count and duration in secondary state to avoid render loops
  useEffect(() => {
    setAnalytics({
      count: filteredProblems.items.length,
      duration: filteredProblems.duration
    });
  }, [filteredProblems]);

  // Refresh Markers on Data Change
  const refreshMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers/layers from map
    if (clustererRef.current) {
      map.removeLayer(clustererRef.current);
      clustererRef.current = null;
    }
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Create marker cluster group
    const clusterGroup = typeof L.markerClusterGroup === 'function'
      ? L.markerClusterGroup()
      : L.layerGroup();
    clustererRef.current = clusterGroup;

    // Render User Location Pin if available
    if (userLocation) {
      const getUserLocationIcon = () => {
        return L.divIcon({
          html: `<div class="relative flex items-center justify-center w-8 h-8">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-30"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white shadow"></span>
          </div>`,
          className: 'user-leaflet-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
      };

      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: getUserLocationIcon(),
        title: "Your Location"
      }).addTo(map);
      markersRef.current.push(userMarker);
    }

    filteredProblems.items.forEach(prob => {
      if (!prob.latitude || !prob.longitude) return;

      const lat = Number(prob.latitude);
      const lng = Number(prob.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const getLeafletMarkerIcon = (priority) => {
        let color = 'bg-emerald-500';
        switch (toSearchableText(priority || 'Medium')) {
          case 'critical':
            color = 'bg-rose-500';
            break;
          case 'high':
            color = 'bg-orange-500';
            break;
          case 'medium':
            color = 'bg-amber-500';
            break;
          case 'low':
            color = 'bg-emerald-500';
            break;
        }
        
        return L.divIcon({
          html: `<div class="relative flex items-center justify-center w-6 h-6">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-40"></span>
            <span class="relative inline-flex rounded-full h-3.5 w-3.5 ${color} border-2 border-slate-900 shadow"></span>
          </div>`,
          className: 'custom-leaflet-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
      };

      const marker = L.marker([lat, lng], {
        icon: getLeafletMarkerIcon(prob.severity || prob.priority),
        title: String(prob.title || '')
      });

      marker.on('click', () => {
        navigate(`/problem/${prob.id}`);
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
  }, [filteredProblems.items, navigate, userLocation]);

  useEffect(() => {
    refreshMarkersRef.current = refreshMarkers;
  }, [refreshMarkers]);

  // Initialize Map when the map panel has actually been rendered
  useEffect(() => {
    if (!shouldShowMap || !homeMapRef.current || mapInstanceRef.current) return;

    const defaultCenter = userLocation 
      ? [userLocation.lat, userLocation.lng] 
      : [20.5937, 78.9629];
    
    // Create Map Instance
    const map = L.map(homeMapRef.current, {
      center: defaultCenter,
      zoom: userLocation ? 13 : 5,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;
    
    window.setTimeout(() => {
      map.invalidateSize();
      refreshMarkersRef.current?.();
    }, 0);

    return () => {
      if (clustererRef.current) {
        map.removeLayer(clustererRef.current);
        clustererRef.current = null;
      }
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [shouldShowMap, userLocation]);

  useEffect(() => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation]);

  // Re-run marker drawings when displayed list changes
  useEffect(() => {
    refreshMarkers();
  }, [refreshMarkers]);

  // Geolocation trigger
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(pos);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([pos.lat, pos.lng], 13);
        }
        toast.success("Your location has been updated.");
      },
      () => {
        toast.error("Failed to retrieve your location. Please check browser permissions.");
      }
    );
  };

  // Trigger Gemini smart query parsing
  const handleSmartSearch = async () => {
    if (!searchInput.trim()) {
      toast.error("Please enter a natural language search query.");
      return;
    }

    setIsSmartAnalyzing(true);
    const toastId = toast.loading("Gemini is interpreting your query...");
    try {
      const parsedFilters = await geminiService.parseNaturalLanguageSearch(searchInput);
      saveRecentSearch(searchInput);
      
      // Merge values into state
      setFilters(prev => ({
        ...prev,
        category: parsedFilters.category || '',
        priority: parsedFilters.priority || '',
        status: parsedFilters.status || ''
      }));

      if (parsedFilters.textQuery) {
        setSearchInput(parsedFilters.textQuery);
      }

      if (parsedFilters.nearMe) {
        if (!userLocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
              setUserLocation(pos);
              setFilters(prev => ({ ...prev, maxDistance: '5' })); // Default to 5km
              toast.success("Located your coordinates. Distance filter: 5km applied.");
            },
            () => {
              toast.error("Could not obtain location. Skipping distance filter.");
            }
          );
        } else {
          setFilters(prev => ({ ...prev, maxDistance: '5' }));
        }
      }

      if (parsedFilters.timeRange) {
        const today = new Date();
        let start = new Date();
        if (parsedFilters.timeRange === 'today') {
          start.setDate(today.getDate());
        } else if (parsedFilters.timeRange === 'week') {
          start.setDate(today.getDate() - 7);
        } else if (parsedFilters.timeRange === 'month') {
          start.setDate(today.getDate() - 30);
        } else if (parsedFilters.timeRange === 'year') {
          start.setDate(today.getDate() - 365);
        }
        setFilters(prev => ({
          ...prev,
          startDate: start.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        }));
      }

      toast.success("Gemini search filters applied!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse query with Gemini. Running text search.", { id: toastId });
      saveRecentSearch(searchInput);
    } finally {
      setIsSmartAnalyzing(false);
    }
  };

  const handleNormalSearchSubmit = (e) => {
    e.preventDefault();
    saveRecentSearch(searchInput);
    setShowSuggestions(false);
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      status: '',
      priority: '',
      startDate: '',
      endDate: '',
      maxDistance: ''
    });
    setSearchInput('');
    setSortBy('newest');
    toast.success("All search parameters reset.");
  };

  const removeFilterKey = (key) => {
    setFilters(prev => ({
      ...prev,
      [key]: ''
    }));
  };

  // Check if any filter is active
  const hasActiveFilters = Object.keys(filters).some(key => filters[key] !== '') || searchInput !== '';

  const handleUpvote = async (id, e) => {
    e.preventDefault();
    const isRemove = upvotedIds.includes(id);
    const change = isRemove ? -1 : 1;

    // Optimistically update local UI state
    setLocalProblems(prev => 
      prev.map(p => p.id === id ? { ...p, upvotes: Math.max(0, (p.upvotes || 0) + change) } : p)
    );
    if (isRemove) {
      setUpvotedIds(prev => prev.filter(item => item !== id));
    } else {
      setUpvotedIds(prev => [...prev, id]);
    }

    try {
      await problemsService.upvoteProblem(id, change);
    } catch (err) {
      console.error("Failed to sync upvote with Firestore:", err);
      // Revert UI changes on failure
      setLocalProblems(prev => 
        prev.map(p => p.id === id ? { ...p, upvotes: Math.max(0, (p.upvotes || 0) - change) } : p)
      );
      if (isRemove) {
        setUpvotedIds(prev => [...prev, id]);
      } else {
        setUpvotedIds(prev => prev.filter(item => item !== id));
      }
      toast.error("Failed to save upvote. Please try again.");
    }
  };

  const getSeverityStyles = (severity) => {
    switch (toSearchableText(severity || 'Medium')) {
      case 'high':
      case 'critical':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border border-zinc-205';
    }
  };

  const getStatusStyles = (status) => {
    switch (toSearchableText(status || 'Reported')) {
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'in progress':
        return 'bg-zinc-100 text-zinc-900 border border-zinc-300';
      default:
        return 'bg-zinc-50 text-zinc-650 border border-zinc-200';
    }
  };

  return (
    <div className="flex-grow">
      
      {/* 1. Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headline and CTAs */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 w-fit">
              <Zap className="h-3.5 w-3.5 animate-pulse text-zinc-900" />
              <span>Version 1.0 Active in Your City</span>
            </span>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-950 leading-tight font-display">
              Empower Your Block.<br />
              <span className="bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 bg-clip-text text-transparent">
                Report & Resolve
              </span> Local Issues.
            </h1>
            
            <p className="text-base sm:text-lg text-zinc-550 leading-relaxed max-w-xl">
              Don't wait for municipal audits. Pin broken streetlights, track road repairs in real-time, and collaborate with neighbors to fix community hazards instantly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/report"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-bold bg-zinc-950 hover:bg-zinc-800 text-white transition-all duration-200 shadow-sm"
              >
                <span>Report an Issue</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-bold bg-zinc-50 border border-zinc-200 text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                Explore Features
              </Link>
            </div>
          </div>

          {/* Right Column: Premium Interactive Mockup */}
          <div className="lg:col-span-5 relative w-full flex justify-center">
            
            <div className="w-full max-w-sm bg-zinc-50 border border-zinc-200 rounded-3xl p-6 shadow-xl relative backdrop-blur-xl animate-fade-in-up">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span className="text-xs font-semibold text-zinc-800">Live Action Stream</span>
                </div>
                <span className="text-[10px] bg-zinc-200 text-zinc-700 py-0.5 px-2 rounded-full border border-zinc-200">Near You</span>
              </div>

              {/* Simulated Card Stack */}
              <div className="space-y-4">
                {latestReports.length > 0 ? (
                  latestReports.map((prob) => {
                    const isResolved = prob.status === 'Resolved' || prob.status === 'Fixed';
                    const severity = prob.severity || prob.priority || 'Medium';
                    
                    // Simple relative time calculation
                    let relativeTime = 'Just now';
                    const createdDate = prob.createdAt 
                      ? (typeof prob.createdAt.toDate === 'function' ? prob.createdAt.toDate() : new Date(prob.createdAt.seconds * 1000))
                      : (prob.date ? new Date(prob.date) : null);
                    
                    if (createdDate) {
                      try {
                        const diffMs = new Date() - createdDate;
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        if (diffMins >= 1) {
                          if (diffMins < 60) {
                            relativeTime = `${diffMins} min ago`;
                          } else {
                            const diffHours = Math.floor(diffMins / 60);
                            if (diffHours < 24) {
                              relativeTime = `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
                            } else {
                              const diffDays = Math.floor(diffHours / 24);
                              relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                            }
                          }
                        }
                      } catch (e) {
                        relativeTime = prob.date || 'Just now';
                      }
                    }

                    return (
                      <Link
                        key={prob.id}
                        to={`/problem/${prob.id}`}
                        className="block p-4 bg-white rounded-2xl border border-zinc-200 space-y-2.5 hover:-translate-y-0.5 transition-all shadow-sm text-left group hover:border-zinc-350 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isResolved
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                              : severity === 'Critical' || severity === 'High'
                              ? 'bg-rose-50 border border-rose-200 text-rose-700'
                              : 'bg-amber-50 border border-amber-200 text-amber-800'
                          }`}>
                            {isResolved ? 'Resolved' : severity}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium">{relativeTime}</span>
                        </div>
                        <h4 className="text-xs font-black text-zinc-950 font-display group-hover:text-zinc-800 transition-colors truncate">
                          {prob.title}
                        </h4>
                        <p className="text-[10px] text-zinc-550 line-clamp-1">{prob.description}</p>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500">
                          <span className="flex items-center truncate max-w-[70%]">
                            <MapPin className="h-3 w-3 mr-0.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{prob.location || 'Local Area'}</span>
                          </span>
                          <span className={`font-semibold ${isResolved ? 'text-emerald-700' : 'text-zinc-700'}`}>
                            {prob.status || 'Reported'}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <>
                    <div className="p-4 bg-white rounded-2xl border border-zinc-200 space-y-2.5 hover:-translate-y-0.5 transition-transform shadow-sm text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-550/15 text-rose-700">High Priority</span>
                        <span className="text-[10px] text-zinc-500 font-medium">2 min ago</span>
                      </div>
                      <h4 className="text-xs font-black text-zinc-955 font-display">Blocked Fire Hydrant on 8th St</h4>
                      <p className="text-[10px] text-zinc-550 line-clamp-1">Safety hazard near apartment block.</p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500">
                        <span className="flex items-center"><MapPin className="h-3 w-3 mr-0.5 text-zinc-400" />8th St & Maple</span>
                        <span className="text-zinc-900 font-bold">Reported</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-zinc-200 space-y-2.5 opacity-80 hover:-translate-y-0.5 transition-transform shadow-sm text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-555/15 text-emerald-700">Resolved</span>
                        <span className="text-[10px] text-zinc-500 font-medium">2 hrs ago</span>
                      </div>
                      <h4 className="text-xs font-black text-zinc-955 font-display">Major Water Main Leak Checked</h4>
                      <p className="text-[10px] text-zinc-550 line-clamp-1">DPW patched line and cleared sidewalk.</p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500">
                        <span className="flex items-center"><MapPin className="h-3 w-3 mr-0.5 text-zinc-400" />Oak Ave</span>
                        <span className="text-emerald-700 font-bold">Fixed</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Statistics Section */}
      <section className="py-12 bg-zinc-50/50 border-y border-zinc-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-1 hover:border-zinc-300 transition-colors shadow-sm text-left">
              <p className="text-xs font-bold tracking-wider text-zinc-550 uppercase font-display">Total Reports</p>
              <p className="text-3xl sm:text-4xl font-black text-zinc-950 font-display">{totalReportsCount}</p>
              <p className="text-xs text-zinc-450 mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 text-emerald-600 mr-1" />
                <span>Live civic warnings</span>
              </p>
            </div>
            <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-1 hover:border-zinc-300 transition-colors shadow-sm text-left">
              <p className="text-xs font-bold tracking-wider text-zinc-900 uppercase font-display">Resolved</p>
              <p className="text-3xl sm:text-4xl font-black text-zinc-950 font-display">{resolvedPercent}%</p>
              <p className="text-xs text-zinc-450 mt-1">{resolvedCount} issues addressed</p>
            </div>
            <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-1 hover:border-zinc-300 transition-colors shadow-sm text-left">
              <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase font-display">Active Users</p>
              <p className="text-3xl sm:text-4xl font-black text-zinc-950 font-display">{activeUsersReal}</p>
              <p className="text-xs text-zinc-450 mt-1 flex items-center">
                <Users className="h-3 w-3 text-zinc-800 mr-1" />
                <span>Verified neighborhood contributors</span>
              </p>
            </div>
            <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-1 hover:border-zinc-300 transition-colors shadow-sm text-left">
              <p className="text-xs font-bold tracking-wider text-zinc-900 uppercase font-display">Satisfaction Rate</p>
              <p className="text-3xl sm:text-4xl font-black text-zinc-950 font-display">{satisfactionRate}%</p>
              <p className="text-xs text-zinc-450 mt-1">Based on resident verify logs</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="py-24 bg-slate-955/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 font-display">How Community Hero Works</h2>
            <p className="text-sm text-zinc-500">
              Three simple steps that turn local complaints into verified public solutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 bg-zinc-50 border border-zinc-200 rounded-3xl relative hover:-translate-y-1 transition-all duration-300 shadow-sm">
              <span className="absolute -top-5 left-6 w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center text-sm font-bold text-white border border-zinc-200 shadow-sm">
                1
              </span>
              <div className="bg-zinc-100 p-4 rounded-2xl text-zinc-900 mb-6 mt-2 border border-zinc-200">
                <Camera className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-zinc-950 mb-2 font-display">Snap & Report</h3>
              <p className="text-xs text-zinc-550 leading-relaxed max-w-xs">
                Take a quick photo of the issue. Specify the category, add a description, pin the location, and hit submit.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 bg-zinc-50 border border-zinc-200 rounded-3xl relative hover:-translate-y-1 transition-all duration-300 shadow-sm">
              <span className="absolute -top-5 left-6 w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center text-sm font-bold text-white border border-zinc-200 shadow-sm">
                2
              </span>
              <div className="bg-zinc-100 p-4 rounded-2xl text-zinc-900 mb-6 mt-2 border border-zinc-200">
                <ThumbsUp className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-zinc-950 mb-2 font-display">Upvote & Boost</h3>
              <p className="text-xs text-zinc-550 leading-relaxed max-w-xs">
                Browse recent reports from neighbors. Upvote critical warnings so municipal teams know which issues are highly requested.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 bg-zinc-50 border border-zinc-200 rounded-3xl relative hover:-translate-y-1 transition-all duration-300 shadow-sm">
              <span className="absolute -top-5 left-6 w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center text-sm font-bold text-white border border-zinc-200 shadow-sm">
                3
              </span>
              <div className="bg-zinc-100 p-4 rounded-2xl text-zinc-900 mb-6 mt-2 border border-zinc-200">
                <CheckSquare className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-zinc-950 mb-2 font-display">Resolve & Verify</h3>
              <p className="text-xs text-zinc-550 leading-relaxed max-w-xs">
                Track status updates dynamically as public teams dispatch crews. Confirm and verify the fix once it is complete.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Recent Reports Section */}
      <section className="py-24 border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="space-y-3 text-left">
              <h2 className="text-3xl font-black text-zinc-950 font-display">Community Issues Database</h2>
              <p className="text-sm text-zinc-550 max-w-xl">
                Explore reports filed by community members. Use our AI-assisted search tools to drill down into priorities.
              </p>
            </div>
            <Link
              to="/report"
              className="inline-flex items-center space-x-1 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer"
            >
              <span>Add a New Report</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Global Search Panel (Intelligent Triage Bar) */}
          <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 backdrop-blur-md relative" ref={searchContainerRef}>
            <form onSubmit={handleNormalSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              {/* Text Input wrapper */}
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder='Search keywords or describe: "severe potholes near me reported this week"...'
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm focus:border-zinc-400 focus:outline-none transition-colors"
                />

                {/* Suggestions Autocomplete Overlay */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg z-40 overflow-hidden divide-y divide-zinc-100">
                    {suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSearchInput(sug.text);
                          saveRecentSearch(sug.text);
                          setShowSuggestions(false);
                          if (sug.type === 'report' && sug.id) {
                            navigate(`/problem/${sug.id}`);
                          }
                        }}
                        className="w-full px-4 py-3 text-xs text-left text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 flex items-center justify-between cursor-pointer border-none bg-white"
                      >
                        <span className="truncate pr-4">{sug.text}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 uppercase tracking-wider shrink-0">
                          {sug.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons panel */}
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSmartSearch}
                  disabled={isSmartAnalyzing || !searchInput.trim()}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-full text-xs sm:text-sm font-bold bg-zinc-950 hover:bg-zinc-800 text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Translate natural query to structured parameters"
                >
                  <Sparkles className={`h-4 w-4 mr-1.5 ${isSmartAnalyzing ? 'animate-spin' : ''}`} />
                  <span>AI Smart Search</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  className={`hidden sm:inline-flex items-center justify-center px-4 py-3 rounded-full text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                    showFiltersPanel || hasActiveFilters
                      ? 'bg-zinc-950 border-zinc-950 text-white'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Filter className="h-4 w-4 mr-1.5" />
                  <span>Filters</span>
                </button>

                {/* Mobile Filter Drawer trigger */}
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="sm:hidden inline-flex items-center justify-center px-4 py-3 rounded-full text-xs font-bold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Recent Searches Tags row */}
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-zinc-500 text-left">
                <span className="font-semibold uppercase tracking-wider">Recent:</span>
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSearchInput(term);
                      saveRecentSearch(term);
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}

            {/* Desktop Filters expandable section */}
            {showFiltersPanel && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-zinc-200 text-xs animate-fade-in text-left">
                {/* Category select */}
                <div className="space-y-1.5">
                  <label className="text-zinc-550 font-medium">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 focus:border-zinc-500 text-zinc-900 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Status select */}
                <div className="space-y-1.5">
                  <label className="text-zinc-550 font-medium">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 focus:border-zinc-500 text-zinc-900 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="Reported">Reported</option>
                    <option value="Investigating">Investigating</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                {/* Priority select */}
                <div className="space-y-1.5">
                  <label className="text-zinc-550 font-medium">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 focus:border-zinc-500 text-zinc-900 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {/* Distance range */}
                <div className="space-y-1.5">
                  <label className="text-zinc-550 font-medium flex items-center justify-between">
                    <span>Radius Distance</span>
                    {!userLocation && (
                      <button 
                        type="button" 
                        onClick={requestLocation} 
                        className="text-[9px] text-zinc-900 font-bold hover:underline"
                      >
                        (Locate Me)
                      </button>
                    )}
                  </label>
                  <select
                    value={filters.maxDistance}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 focus:border-zinc-500 text-zinc-900 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Any distance</option>
                    <option value="1">Within 1 km</option>
                    <option value="5">Within 5 km</option>
                    <option value="10">Within 10 km</option>
                    <option value="25">Within 25 km</option>
                  </select>
                </div>

                {/* Start Date picker */}
                <div className="space-y-1.5">
                  <label className="text-zinc-550 font-medium flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                    <span>Start Date</span>
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 focus:border-zinc-500 text-zinc-900 focus:outline-none text-xs"
                  />
                </div>

                {/* End Date picker */}
                <div className="space-y-1.5">
                  <label className="text-zinc-550 font-medium flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                    <span>End Date</span>
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 focus:border-zinc-500 text-zinc-900 focus:outline-none text-xs"
                  />
                </div>

                {/* Placeholder empty block for alignment */}
                <div className="hidden sm:block sm:col-span-2"></div>
              </div>
            )}
          </div>

          {/* Table Search Analytics Panel & Dismissible Filters Row */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-left shadow-sm">
              <div className="flex items-center space-x-1 text-zinc-500">
                <Clock className="h-3.5 w-3.5 text-zinc-450" />
                <span>Found <strong className="text-zinc-950 font-bold">{analytics.count}</strong> reports in <strong className="text-zinc-950 font-bold">{analytics.duration} ms</strong>.</span>
              </div>

              {/* Dismissible tags list */}
              <div className="flex flex-wrap items-center gap-2">
                {filters.category && (
                  <span className="bg-white border border-zinc-205 px-2.5 py-0.5 rounded-full inline-flex items-center text-[10px] text-zinc-700">
                    <span>Category: {filters.category}</span>
                    <button onClick={() => removeFilterKey('category')} className="ml-1 text-zinc-500 hover:text-zinc-950 cursor-pointer"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {filters.status && (
                  <span className="bg-white border border-zinc-205 px-2.5 py-0.5 rounded-full inline-flex items-center text-[10px] text-zinc-700">
                    <span>Status: {filters.status}</span>
                    <button onClick={() => removeFilterKey('status')} className="ml-1 text-zinc-500 hover:text-zinc-950 cursor-pointer"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {filters.priority && (
                  <span className="bg-slate-950 border border-slate-850 px-2.5 py-0.5 rounded-full inline-flex items-center text-[10px] text-slate-400">
                    <span>Priority: {filters.priority}</span>
                    <button onClick={() => removeFilterKey('priority')} className="ml-1 text-slate-550 hover:text-white cursor-pointer"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {(filters.startDate || filters.endDate) && (
                  <span className="bg-white border border-zinc-205 px-2.5 py-0.5 rounded-full inline-flex items-center text-[10px] text-zinc-700">
                    <span>Dates: {filters.startDate || '*'} to {filters.endDate || '*'}</span>
                    <button 
                      onClick={() => {
                        removeFilterKey('startDate');
                        removeFilterKey('endDate');
                      }} 
                      className="ml-1 text-zinc-500 hover:text-zinc-950 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.maxDistance && (
                  <span className="bg-white border border-zinc-205 px-2.5 py-0.5 rounded-full inline-flex items-center text-[10px] text-zinc-700">
                    <span>Radius: {filters.maxDistance} km</span>
                    <button onClick={() => removeFilterKey('maxDistance')} className="ml-1 text-zinc-500 hover:text-zinc-950 cursor-pointer"><X className="h-3 w-3" /></button>
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-zinc-950 hover:text-zinc-800 transition-colors cursor-pointer pl-2"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* Map Header with Sorting Toggles */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-50 border border-zinc-200 p-4 rounded-2xl text-left shadow-sm">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-zinc-500 font-semibold uppercase tracking-wider flex items-center">
                <Navigation className="h-3.5 w-3.5 mr-1 text-zinc-700" />
                <span>Operator Map View</span>
              </span>
            </div>
            
            {/* Sorting controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-500 font-medium">Sort by:</span>
              {[
                { key: 'newest', label: 'Newest' },
                { key: 'oldest', label: 'Oldest' },
                { key: 'priority', label: 'Priority' },
                { key: 'upvotes', label: 'Upvotes' }
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-1 rounded-full border text-[10px] font-bold transition-all cursor-pointer ${
                    sortBy === opt.key
                      ? 'bg-zinc-950 border-zinc-950 text-white'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Google Map Panel */}
          {shouldShowMap && (
            <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 p-2 shadow-inner">
              <div ref={homeMapRef} className="w-full h-80 rounded-xl" />
            </div>
          )}

          {/* Cards Grid / Database Loading States */}
          {loading ? (
            <div className="py-16 flex justify-center items-center w-full">
              <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-950 rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl w-full text-left">
              <AlertTriangle className="h-5 w-5 text-rose-600 inline mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredProblems.items.length === 0 ? (
            <div className="p-12 text-center bg-zinc-50 border border-zinc-200 text-zinc-500 text-sm rounded-2xl w-full">
              {hasActiveFilters 
                ? "No issues matched the current search filters. Try clearing some query tags." 
                : "No reports registered yet in the database. Be the first to report an issue!"
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {filteredProblems.items.slice(0, 3).map((prob) => {
                const isUpvoted = upvotedIds.includes(prob.id);
                const catConfig = getCategoryConfig(prob.category);
                const CatIcon = catConfig.icon;
                return (
                  <div
                    key={prob.id}
                    className="flex flex-col bg-white border border-zinc-200 hover:border-zinc-350 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md group text-left"
                  >
                    {/* Badges Container */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1 ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>
                        <CatIcon className="h-3.5 w-3.5 mr-0.5 shrink-0" />
                        <span>{prob.category}</span>
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSeverityStyles(prob.severity)}`}>
                        {prob.severity || 'Medium'} Severity
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusStyles(prob.status)}`}>
                        {prob.status}
                      </span>
                    </div>

                    {/* Title & Desc */}
                    <h3 className="text-base font-bold text-zinc-950 mb-2 line-clamp-1 group-hover:text-zinc-700 transition-colors font-display">
                      {prob.title}
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-3 mb-6 flex-grow leading-relaxed">
                      {prob.description}
                    </p>

                    {/* Map and Clock Meta */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-4 border-t border-slate-850 mb-6 gap-2">
                      <span className="flex items-center max-w-[70%]">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400 shrink-0" />
                        <span className="truncate">{prob.locality || prob.location}</span>
                      </span>
                      <span className="flex items-center shrink-0">
                        <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                        <span>{prob.date}</span>
                      </span>
                    </div>

                    {/* Interactive Button Panel */}
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={(e) => handleUpvote(prob.id, e)}
                        className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          isUpvoted
                            ? 'bg-zinc-950 border-zinc-950 text-white shadow-sm'
                            : 'bg-white border-zinc-250 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                        }`}
                      >
                        <ThumbsUp className={`h-3.5 w-3.5 ${isUpvoted ? 'fill-white text-white' : 'text-zinc-500'}`} />
                        <span>{prob.upvotes || 0}</span>
                      </button>
                      
                      <Link
                        to={`/problem/${prob.id}`}
                        className="inline-flex items-center text-xs font-bold text-zinc-955 hover:text-zinc-750 transition-colors"
                      >
                        <span>View Details</span>
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* Mobile Filter Drawer Overlay */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-end animate-fade-in sm:hidden">
          <div className="w-full bg-white border-t border-zinc-200 rounded-t-3xl p-6 space-y-6 max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
              <h3 className="text-base font-black text-zinc-955 flex items-center font-display">
                <Filter className="h-4.5 w-4.5 text-zinc-900 mr-2" />
                <span>Search Filters</span>
              </h3>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-950 cursor-pointer border border-zinc-200"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Mobile filters list */}
            <div className="space-y-4 text-xs text-left">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-zinc-550 font-medium">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-zinc-400"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-zinc-550 font-medium">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-zinc-400"
                >
                  <option value="">All Statuses</option>
                  <option value="Reported">Reported</option>
                  <option value="Investigating">Investigating</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-zinc-550 font-medium">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-zinc-400"
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Distance */}
              <div className="space-y-1.5">
                <label className="text-zinc-550 font-medium">Radius Distance</label>
                <select
                  value={filters.maxDistance}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-zinc-400"
                >
                  <option value="">Any distance</option>
                  <option value="1">Within 1 km</option>
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="25">Within 25 km</option>
                </select>
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-zinc-550 font-medium">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-zinc-550 font-medium">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              {/* Placeholder empty block for alignment */}
              <div className="pt-2"></div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-3 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-full text-xs cursor-pointer hover:bg-zinc-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-full text-xs cursor-pointer shadow-sm"
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Final CTA Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-8 sm:p-16 text-center space-y-6 relative overflow-hidden shadow-sm">
          {/* Radial visual glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-zinc-100 rounded-full blur-3xl pointer-events-none" />

          <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-800 border border-zinc-250 relative z-10 w-fit mx-auto">
            <CheckCircle2 className="h-3.5 w-3.5 text-zinc-900" />
            <span>Join 12,000+ local heroes</span>
          </span>

          <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 relative z-10 max-w-xl mx-auto leading-tight font-display">
            Ready to make a difference in your neighborhood?
          </h2>
          
          <p className="text-xs sm:text-sm text-zinc-500 max-w-lg mx-auto leading-relaxed relative z-10">
            Submit warnings immediately, receive repair logs directly from service teams, and vote on items to shape municipal resource scheduling.
          </p>

          <div className="pt-4 relative z-10">
            <Link
              to="/report"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-bold bg-zinc-950 hover:bg-zinc-800 text-white transition-all shadow-sm cursor-pointer"
            >
              <span>File Your Report</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
