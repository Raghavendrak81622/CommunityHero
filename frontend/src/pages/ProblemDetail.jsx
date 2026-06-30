import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProblem } from '../hooks/useProblem';
import { useUpdateProblem } from '../hooks/useUpdateProblem';
import { useDeleteProblem } from '../hooks/useDeleteProblem';
import { problemsService } from '../services/problemsService';
import { getCategoryConfig } from '../utils/categories';
import { escapeHtml, toSearchableText } from '../utils/formatters';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  ThumbsUp, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3,
  Map,
  Mail,
  ExternalLink,
  Reply,
  CornerDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsService } from '../services/notificationsService';

export default function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Custom hooks consuming Firestore APIs
  const { problem, setProblem, loading, error } = useProblem(id);
  const { updateProblem, loading: isUpdating } = useUpdateProblem();
  const { deleteProblem, loading: isDeleting } = useDeleteProblem();

  // Local state for local interactions (upvote toggle, comments text)
  const [newCommentText, setNewCommentText] = useState('');
  const [upvoted, setUpvoted] = useState(false);
  const [localUpvotesOffset, setLocalUpvotesOffset] = useState(0);

  const [activeReplyFormId, setActiveReplyFormId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [upvotedComments, setUpvotedComments] = useState(() => {
    try {
      const saved = localStorage.getItem('upvotedComments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('upvotedComments', JSON.stringify(upvotedComments));
    } catch (err) {
      console.error("Failed to save upvoted comments:", err);
    }
  }, [upvotedComments]);

  const isOwner = user && problem && user.uid === problem.userId;
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);

  useEffect(() => {
    if (!problem || !problem.latitude || !problem.longitude || !mapRef.current) return;

    const lat = Number(problem.latitude);
    const lng = Number(problem.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Initialize Leaflet Map
    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });
    leafletMapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

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
      icon: getLeafletMarkerIcon(problem.severity || problem.priority)
    }).addTo(map);

    const contentString = `
      <div style="color: #0f172a; padding: 4px; font-family: sans-serif; font-size: 11px; line-height: 1.4; max-width: 200px;">
        <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #1e1b4b;">${escapeHtml(problem.title)}</h4>
        <p style="margin: 0 0 2px 0;"><strong>Category:</strong> ${escapeHtml(problem.category)}</p>
        <p style="margin: 0 0 2px 0;"><strong>Priority:</strong> ${escapeHtml(problem.severity || problem.priority || 'Medium')}</p>
        <p style="margin: 0 0 2px 0;"><strong>Locality:</strong> ${escapeHtml(problem.locality || problem.location || 'N/A')}</p>
        <p style="margin: 0;"><strong>Pincode:</strong> ${escapeHtml(problem.pincode || 'N/A')}</p>
      </div>
    `;

    marker.bindPopup(contentString);
    window.setTimeout(() => map.invalidateSize(), 0);

    // Clean up map instance on unmount
    return () => {
      map.remove();
      if (leafletMapRef.current === map) {
        leafletMapRef.current = null;
      }
    };
  }, [problem]);

  const handleUpvote = () => {
    if (upvoted) {
      setLocalUpvotesOffset(-1);
      setUpvoted(false);
    } else {
      setLocalUpvotesOffset(1);
      setUpvoted(true);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    if (!user) {
      toast.error("Please sign in to post a comment.");
      return;
    }

    const newComment = {
      id: `c_${Date.now()}`,
      author: user.displayName || 'Anonymous Hero',
      authorId: user.uid,
      authorPhoto: user.photoURL || '',
      date: new Date().toISOString().split('T')[0],
      text: newCommentText.trim(),
      upvotes: 0,
      replies: []
    };

    const previousText = newCommentText;
    setProblem((prev) => {
      const currentComments = Array.isArray(prev.comments) ? prev.comments : [];
      return {
        ...prev,
        comments: [...currentComments, newComment],
      };
    });
    setNewCommentText('');

    try {
      await problemsService.addComment(id, newComment, user.uid);
      toast.success("Comment posted.");

      // Dispatch notification to original report creator (unless they commented themselves)
      if (problem.userId && problem.userId !== user.uid) {
        await notificationsService.createNotification(
          problem.userId,
          id,
          `New Comment on '${problem.title}'`,
          'comment',
          `${newComment.author} commented: "${newComment.text.substring(0, 40)}..."`,
          `comment_${newComment.id}`
        );
      }
    } catch (err) {
      setProblem((prev) => {
        const currentComments = Array.isArray(prev.comments) ? prev.comments : [];
        return {
          ...prev,
          comments: currentComments.filter((comment) => comment.id !== newComment.id),
        };
      });
      setNewCommentText(previousText);
      toast.error(err.message || "Failed to post comment.");
    }
  };

  const handleUpvoteComment = async (commentId) => {
    if (!user) {
      toast.error("Please sign in to upvote comments.");
      return;
    }
    const isRemove = upvotedComments.includes(commentId);
    const change = isRemove ? -1 : 1;

    // Toggle upvote in state
    if (isRemove) {
      setUpvotedComments(prev => prev.filter(item => item !== commentId));
    } else {
      setUpvotedComments(prev => [...prev, commentId]);
    }

    // Update in problem state
    const currentComments = Array.isArray(problem.comments) ? problem.comments : [];
    const updatedComments = currentComments.map(c => {
      if (c.id === commentId) {
        return { ...c, upvotes: Math.max(0, (c.upvotes || 0) + change) };
      }
      return c;
    });

    setProblem(prev => ({ ...prev, comments: updatedComments }));

    try {
      await problemsService.updateComments(id, updatedComments);
    } catch (err) {
      console.error("Failed to sync comment upvote:", err);
      // Revert state
      setProblem(prev => {
        const resetComments = (Array.isArray(prev.comments) ? prev.comments : []).map(c => {
          if (c.id === commentId) {
            return { ...c, upvotes: Math.max(0, (c.upvotes || 0) - change) };
          }
          return c;
        });
        return { ...prev, comments: resetComments };
      });
      if (isRemove) {
        setUpvotedComments(prev => [...prev, commentId]);
      } else {
        setUpvotedComments(prev => prev.filter(item => item !== commentId));
      }
      toast.error("Failed to save upvote.");
    }
  };

  const handleReplySubmit = async (commentId, e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (!user) {
      toast.error("Please sign in to reply.");
      return;
    }

    const newReply = {
      id: `r_${Date.now()}`,
      author: user.displayName || 'Anonymous Hero',
      authorId: user.uid,
      authorPhoto: user.photoURL || '',
      date: new Date().toISOString().split('T')[0],
      text: replyText.trim(),
      upvotes: 0
    };

    let targetCommentAuthorId = null;
    const currentComments = Array.isArray(problem.comments) ? problem.comments : [];

    const updatedComments = currentComments.map(c => {
      if (c.id === commentId) {
        targetCommentAuthorId = c.authorId;
        const currentReplies = Array.isArray(c.replies) ? c.replies : [];
        return {
          ...c,
          replies: [...currentReplies, newReply]
        };
      }
      return c;
    });

    // Optimistically update UI
    setProblem(prev => ({ ...prev, comments: updatedComments }));
    setReplyText('');
    setActiveReplyFormId(null);

    try {
      await problemsService.updateComments(id, updatedComments);
      toast.success("Reply posted.");

      // Dispatch notifications
      // 1. Notify original report creator (unless they replied themselves)
      if (problem.userId && problem.userId !== user.uid) {
        await notificationsService.createNotification(
          problem.userId,
          id,
          `New Reply on '${problem.title}'`,
          'comment',
          `${newReply.author} replied: "${newReply.text.substring(0, 40)}..."`,
          `reply_${newReply.id}_creator`
        );
      }

      // 2. Notify comment author (unless they wrote the reply or are already the creator)
      if (targetCommentAuthorId && targetCommentAuthorId !== user.uid && targetCommentAuthorId !== problem.userId) {
        await notificationsService.createNotification(
          targetCommentAuthorId,
          id,
          `New reply to your comment`,
          'comment',
          `${newReply.author} replied: "${newReply.text.substring(0, 40)}..."`,
          `reply_${newReply.id}_author`
        );
      }
    } catch (err) {
      console.error("Failed to post reply:", err);
      toast.error("Failed to post reply.");
      // Revert state
      setProblem(prev => ({ ...prev, comments: currentComments }));
    }
  };

  const handleUpvoteReply = async (commentId, replyId) => {
    if (!user) {
      toast.error("Please sign in to upvote replies.");
      return;
    }
    const isRemove = upvotedComments.includes(replyId);
    const change = isRemove ? -1 : 1;

    // Toggle upvote in state
    if (isRemove) {
      setUpvotedComments(prev => prev.filter(item => item !== replyId));
    } else {
      setUpvotedComments(prev => [...prev, replyId]);
    }

    // Update in problem state
    const currentComments = Array.isArray(problem.comments) ? problem.comments : [];
    const updatedComments = currentComments.map(c => {
      if (c.id === commentId) {
        const currentReplies = Array.isArray(c.replies) ? c.replies : [];
        return {
          ...c,
          replies: currentReplies.map(r => {
            if (r.id === replyId) {
              return { ...r, upvotes: Math.max(0, (r.upvotes || 0) + change) };
            }
            return r;
          })
        };
      }
      return c;
    });

    setProblem(prev => ({ ...prev, comments: updatedComments }));

    try {
      await problemsService.updateComments(id, updatedComments);
    } catch (err) {
      console.error("Failed to sync reply upvote:", err);
      // Revert state
      setProblem(prev => {
        const resetComments = (Array.isArray(prev.comments) ? prev.comments : []).map(c => {
          if (c.id === commentId) {
            const currentReplies = Array.isArray(c.replies) ? c.replies : [];
            return {
              ...c,
              replies: currentReplies.map(r => {
                if (r.id === replyId) {
                  return { ...r, upvotes: Math.max(0, (r.upvotes || 0) - change) };
                }
                return r;
              })
            };
          }
          return c;
        });
        return { ...prev, comments: resetComments };
      });
      if (isRemove) {
        setUpvotedComments(prev => [...prev, replyId]);
      } else {
        setUpvotedComments(prev => prev.filter(item => item !== replyId));
      }
      toast.error("Failed to save upvote.");
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      await updateProblem(id, { status: newStatus });
      
      // Update local UI state
      setProblem(prev => {
        const currentTimeline = prev.timeline || [
          { date: prev.date, status: 'Reported', note: `Problem reported by ${prev.reporter}.` }
        ];
        
        return {
          ...prev,
          status: newStatus,
          timeline: [
            ...currentTimeline,
            { 
              date: new Date().toISOString().split('T')[0], 
              status: newStatus, 
              note: `Status updated to ${newStatus} by owner.` 
            }
          ]
        };
      });
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to permanently delete this community report?")) {
      try {
        await deleteProblem(id);
        navigate('/');
      } catch (err) {
        console.error("Deletion error:", err);
      }
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
      case 'investigating':
        return 'bg-amber-50 text-amber-800 border border-amber-250';
      default:
        return 'bg-zinc-50 text-zinc-600 border border-zinc-200';
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If problem is not found or does not exist
  if (error || !problem) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex-grow flex items-center justify-center">
        <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl text-center space-y-6 max-w-md shadow-2xl">
          <div className="mx-auto w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Report Not Found</h2>
            <p className="text-sm text-slate-400">
              The issue report with ID "{id}" could not be located in the database.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-650 hover:bg-indigo-555 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const finalUpvotes = (problem.upvotes || 0) + localUpvotesOffset;
  const categoryConfig = getCategoryConfig(problem.category);
  const CategoryIcon = categoryConfig.icon;
  const comments = Array.isArray(problem.comments) ? problem.comments : [];
  const defaultTimeline = [
    { date: problem.date, status: 'Reported', note: `Problem reported by ${problem.reporter}.` }
  ];
  const timeline = Array.isArray(problem.timeline) && problem.timeline.length > 0
    ? problem.timeline
    : defaultTimeline;
  const latitude = Number(problem.latitude);
  const longitude = Number(problem.longitude);
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 flex-grow">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center text-sm font-semibold text-slate-400 hover:text-white mb-8 group transition-colors"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Details Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header Card */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSeverityStyles(problem.severity)}`}>
                {problem.severity || 'Medium'} Priority
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusStyles(problem.status)}`}>
                {problem.status}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5 ${categoryConfig.bg} ${categoryConfig.text} ${categoryConfig.border}`}>
                <CategoryIcon className="h-3.5 w-3.5 mr-0.5 shrink-0" />
                <span>{problem.category}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 font-display">
              {problem.title}
            </h1>

            {problem.imageUrl && (
              <div data-report-image className="rounded-xl overflow-hidden border border-slate-850 max-h-96">
                <img
                  src={problem.imageUrl}
                  alt={problem.title}
                  className="w-full h-full object-cover"
                  onError={(event) => {
                    event.currentTarget.closest('[data-report-image]')?.remove();
                  }}
                />
              </div>
            )}

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {problem.description}
            </p>

            {/* Reporter Meta & Location Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-slate-800/50 rounded">
                  <MapPin className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-300">Location</p>
                  <p className="text-slate-455 mt-0.5">
                    {problem.locality || problem.location} {problem.pincode ? `(${problem.pincode})` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-slate-800/50 rounded">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-300">Date Reported</p>
                  <p className="text-slate-455 mt-0.5">{problem.date}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-slate-800/50 rounded">
                  <User className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-300">Reporter</p>
                  <p className="text-slate-455 mt-0.5">{problem.reporter || 'Anonymous'}</p>
                </div>
              </div>
            </div>

            {/* Action Interaction Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <button
                onClick={handleUpvote}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  upvoted
                    ? 'bg-indigo-650 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-slate-950 border-slate-855 hover:border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${upvoted ? 'fill-white text-indigo-650' : 'text-slate-400'}`} />
                <span>{finalUpvotes} Upvotes</span>
              </button>
              
              <div className="text-xs text-slate-555 flex items-center space-x-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Last updated today</span>
              </div>
            </div>
          </div>

          {/* Dispatcher Triage & Response Board */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            {/* Decorative behind-card radial glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div>
                <h3 className="text-lg font-black text-zinc-950 flex items-center space-x-2 font-display">
                  <span className="bg-zinc-105 p-1.5 rounded-lg text-zinc-900">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </span>
                  <span>Dispatcher Triage & Response Board</span>
                </h3>
                <p className="text-xs text-slate-455 mt-1">Official municipal triage status and operational response logs</p>
              </div>
            </div>

            {/* Grid of basic triage outputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900/60">
                <p className="font-semibold text-slate-455">Current Ticket Status</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${
                    problem.status === 'Resolved' ? 'bg-emerald-400' :
                    problem.status === 'In Progress' ? 'bg-blue-400' :
                    problem.status === 'Investigating' ? 'bg-amber-400' : 'bg-slate-400'
                  }`} />
                  <p className="text-slate-200 font-bold leading-relaxed">{problem.status}</p>
                </div>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900/60">
                <p className="font-semibold text-slate-450">Triage Confirmed Priority</p>
                <p className={`mt-1 font-bold ${
                  problem.severity === 'Critical' || problem.severity === 'High' 
                    ? 'text-rose-400' 
                    : 'text-indigo-400'
                }`}>{problem.severity || problem.priority || 'Medium'}</p>
              </div>
            </div>

            {/* Official Response Notes */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-300">Official Updates & Dispatcher Logs</p>
              {problem.adminNotes ? (
                <p className="text-xs text-slate-200 leading-relaxed bg-indigo-955/10 p-4 rounded-lg border border-indigo-900/20 italic">
                  "{problem.adminNotes}"
                </p>
              ) : (
                <p className="text-xs text-slate-450 leading-relaxed bg-slate-955/20 p-4 rounded-lg border border-slate-900/40">
                  No administrative notes or updates have been logged by city dispatchers yet.
                </p>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-zinc-950 flex items-center space-x-2 font-display">
              <MessageSquare className="h-5 w-5 text-zinc-900" />
              <span>Discussion ({comments.length})</span>
            </h3>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="p-6 text-center bg-zinc-50/50 border border-zinc-200/60 rounded-xl text-sm text-zinc-500">
                  No comments posted yet. Be the first to share your thoughts!
                </div>
              ) : (
                comments.map((comment) => {
                  const isCommentUpvoted = upvotedComments.includes(comment.id);
                  const commentReplies = Array.isArray(comment.replies) ? comment.replies : [];
                  
                  return (
                    <div key={comment.id} className="p-5 bg-white border border-zinc-200 rounded-xl space-y-4 shadow-sm text-left">
                      {/* Comment Header */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900">{comment.author}</span>
                        <span className="text-zinc-400">{comment.date}</span>
                      </div>
                      
                      {/* Comment Body */}
                      <p className="text-sm text-zinc-700 leading-relaxed">
                        {comment.text}
                      </p>
                      
                      {/* Comment Footer / Actions */}
                      <div className="flex items-center space-x-4 pt-1 text-xs">
                        <button
                          onClick={() => handleUpvoteComment(comment.id)}
                          className={`inline-flex items-center space-x-1 font-semibold transition-colors cursor-pointer ${
                            isCommentUpvoted 
                              ? 'text-zinc-950 font-bold' 
                              : 'text-zinc-400 hover:text-zinc-600'
                          }`}
                        >
                          <ThumbsUp className={`h-3.5 w-3.5 ${isCommentUpvoted ? 'fill-zinc-900 text-zinc-900' : 'text-zinc-450'}`} />
                          <span>{comment.upvotes || 0}</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            if (activeReplyFormId === comment.id) {
                              setActiveReplyFormId(null);
                              setReplyText('');
                            } else {
                              setActiveReplyFormId(comment.id);
                              setReplyText('');
                            }
                          }}
                          className="inline-flex items-center space-x-1 font-semibold text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                        >
                          <Reply className="h-3.5 w-3.5 text-zinc-450" />
                          <span>Reply</span>
                        </button>
                      </div>

                      {/* Nested Replies List */}
                      {commentReplies.length > 0 && (
                        <div className="pl-6 border-l border-zinc-200 ml-2 mt-3 space-y-3">
                          {commentReplies.map((reply) => {
                            const isReplyUpvoted = upvotedComments.includes(reply.id);
                            return (
                              <div key={reply.id} className="p-3 bg-zinc-50 border border-zinc-150 rounded-lg space-y-1.5 text-left">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center space-x-1">
                                    <CornerDownRight className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="font-bold text-zinc-800">{reply.author}</span>
                                  </div>
                                  <span className="text-zinc-400">{reply.date}</span>
                                </div>
                                <p className="text-sm text-zinc-600 leading-relaxed pl-4">
                                  {reply.text}
                                </p>
                                <div className="flex items-center pl-4 pt-0.5">
                                  <button
                                    onClick={() => handleUpvoteReply(comment.id, reply.id)}
                                    className={`inline-flex items-center space-x-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                                      isReplyUpvoted 
                                        ? 'text-zinc-950 font-bold' 
                                        : 'text-zinc-400 hover:text-zinc-600'
                                    }`}
                                  >
                                    <ThumbsUp className={`h-3 w-3 ${isReplyUpvoted ? 'fill-zinc-900 text-zinc-900' : 'text-zinc-450'}`} />
                                    <span>{reply.upvotes || 0}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Reply Submission Form */}
                      {activeReplyFormId === comment.id && (
                        <form onSubmit={(e) => handleReplySubmit(comment.id, e)} className="pl-6 border-l border-zinc-200 ml-2 mt-3 space-y-2">
                          <textarea
                            rows="2"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm focus:outline-none focus:border-zinc-500 resize-none transition-colors"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReplyFormId(null);
                                setReplyText('');
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!replyText.trim()}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              Post Reply
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="space-y-3 bg-zinc-50 border border-zinc-200 p-4 rounded-xl text-left">
              <label htmlFor="comment" className="sr-only">Add comment</label>
              <textarea
                id="comment"
                rows="3"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Share coordinates, ask for updates, or provide neighborhood context..."
                className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-200 focus:border-zinc-450 text-zinc-950 placeholder-zinc-400 text-sm focus:outline-none transition-colors resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-950 hover:bg-zinc-800 rounded-full disabled:opacity-55 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Post Comment
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Sidebar: Resolution Timeline & Owner Actions */}
        <div className="space-y-6">

          {/* Interactive Map Panel */}
          {hasValidCoordinates && (
            <div className="bg-slate-900/20 border border-slate-905 rounded-2xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center space-x-2 font-display">
                <MapPin className="h-4 w-4 text-zinc-800" />
                <span>Geotag Location</span>
              </h3>
              
              <div 
                ref={mapRef} 
                className="w-full h-52 rounded-xl overflow-hidden border border-slate-850" 
              />
              
              <a
                href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-indigo-650/15 hover:bg-indigo-655 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Map className="h-3.5 w-3.5 mr-1 shrink-0" />
                <span>View in OpenStreetMap</span>
              </a>
            </div>
          )}

          {/* External Escalation Board */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center space-x-2 font-display">
              <Mail className="h-4 w-4 text-zinc-800" />
              <span>Escalate to Authorities</span>
            </h3>
            
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If this issue requires urgent attention, you can escalate it directly to the designated municipal department:
            </p>
            
            <div className="space-y-3 pt-1 text-xs">
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900/60 space-y-1">
                <span className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider block">Municipal Department</span>
                <span className="text-slate-200 font-semibold text-xs">{problem.category} Division</span>
              </div>

              {categoryConfig?.complaintEmail && (
                <a
                  href={`mailto:${categoryConfig.complaintEmail}?subject=Community Complaint: ${encodeURIComponent(problem.title)}&body=Dear Department,%0D%0A%0D%0AI would like to register a complaint regarding an issue in my neighborhood.%0D%0A%0D%0ADetails:%0D%0A- Title: ${encodeURIComponent(problem.title)}%0D%0A- Category: ${encodeURIComponent(problem.category)}%0D%0A- Locality: ${encodeURIComponent(problem.locality || 'N/A')}%0D%0A- Pincode: ${encodeURIComponent(problem.pincode || 'N/A')}%0D%0A- Description: ${encodeURIComponent(problem.description)}%0D%0A%0D%0APlease look into this as soon as possible.%0D%0A%0D%0ASincerely,%0D%0A${encodeURIComponent(problem.reporter || 'Resident')}`}
                  className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-indigo-650/15 hover:bg-indigo-655 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span>Email Official Complaint</span>
                </a>
              )}

            </div>
          </div>
          
          {/* Owner Actions Panel */}
          {isOwner && (
            <div className="bg-slate-900/25 border border-indigo-950/40 rounded-2xl p-6 space-y-5">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center space-x-2 font-display">
                <Edit3 className="h-4 w-4 text-zinc-800" />
                <span>Manage Report</span>
              </h3>
              
              {/* Change Status */}
              <div className="space-y-2">
                <label htmlFor="status-select" className="block text-xs font-medium text-slate-400">
                  Update Issue Status
                </label>
                <select
                  id="status-select"
                  value={problem.status}
                  onChange={handleStatusChange}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white focus:outline-none appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="Reported">Reported</option>
                  <option value="Investigating">Investigating</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              {/* Delete Issue */}
              <div className="pt-2 border-t border-slate-855">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-555/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isDeleting ? "Deleting Report..." : "Delete Report"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Status Timeline Panel */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span>Status Activity</span>
            </h3>

            {/* Vertical Timeline */}
            <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-6 text-sm">
              {timeline.map((step, idx, arr) => {
                const isLatest = idx === arr.length - 1;
                return (
                  <div key={`${step.status}-${idx}`} className="relative">
                    {/* Circle Node */}
                    <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border ${
                      isLatest
                        ? 'bg-indigo-650 border-indigo-400 shadow-md shadow-indigo-600/35 ring-4 ring-indigo-900/20'
                        : 'bg-slate-900 border-slate-700'
                    }`}>
                      {isLatest && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                    </span>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className={`font-semibold ${isLatest ? 'text-indigo-400' : 'text-slate-350'}`}>
                          {step.status}
                        </span>
                        <span className="text-slate-555">{step.date}</span>
                      </div>
                      <p className="text-xs text-slate-450 leading-relaxed">
                        {step.note}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
