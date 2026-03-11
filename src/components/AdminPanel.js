import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, LogOut, MessageSquare, Star, CheckSquare, Square, Save, Activity } from 'lucide-react';
import { getAllReviews, getAllSuggestions, updateReviewPriority, verifyAdminPasscode } from '../services/firebaseService';
import { cn } from '../utils/cn';

function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'suggestions'
  
  const [reviews, setReviews] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Track changes made directly in UI
  const [priorityToggles, setPriorityToggles] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check session
    if (sessionStorage.getItem('adminAuth') === 'true') {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isValid = await verifyAdminPasscode(password);
      if (isValid) {
        setIsAuthenticated(true);
        sessionStorage.setItem('adminAuth', 'true');
        fetchData();
      } else {
        alert('Unauthorized. Matrix breach detected.');
      }
    } catch (error) {
      alert('Authentication service error.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
    setPassword('');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedReviews, fetchedSuggestions] = await Promise.all([
        getAllReviews(),
        getAllSuggestions()
      ]);
      setReviews(fetchedReviews);
      setSuggestions(fetchedSuggestions);
      
      // Initialize toggles safely
      const initToggles = {};
      fetchedReviews.forEach(r => {
        initToggles[r.userId] = r.priority === 1;
      });
      setPriorityToggles(initToggles);
    } catch (error) {
      console.error("Admin Matrix fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (userId) => {
    setPriorityToggles(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleBatchSave = async () => {
    setIsSaving(true);
    try {
      // Find what changed
      const changes = reviews.filter(r => {
        const originalPriority = r.priority === 1;
        const currentToggle = priorityToggles[r.userId];
        return originalPriority !== currentToggle;
      });

      if (changes.length === 0) {
        alert("No priority changes detected.");
        setIsSaving(false);
        return;
      }

      // Concurrently batch process priority injections
      await Promise.all(
        changes.map(r => 
          updateReviewPriority(r.userId, priorityToggles[r.userId] ? 1 : 0)
        )
      );

      // Mutate local state immediately so no refresh needed
      setReviews(prev => prev.map(r => ({
        ...r,
        priority: priorityToggles[r.userId] ? 1 : 0
      })));
      
      alert(`Synchronized ${changes.length} reviews.`);
    } catch (err) {
      alert("Synchronization structurally denied: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------- Render Branches ----------------

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-32 flex flex-col items-center justify-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-10 max-w-md w-full"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-accent shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-center mb-2">Admin Uplink</h1>
          <p className="text-muted text-center mb-8">Enter administrative clearance code.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passcode..."
              className="w-full bg-surface/50 border border-border/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent"
              autoFocus
            />
            <button type="submit" className="w-full bg-accent text-background font-bold py-3 rounded-xl hover:bg-accent/90 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              Initialize Connection
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Calculate if any save pending
  const dirtyCount = reviews.filter(r => (r.priority === 1) !== Boolean(priorityToggles[r.userId])).length;

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-3">
            <Lock className="w-8 h-8 text-accent" /> Control Matrix
          </h1>
          <p className="text-muted">Manage global review architectures and incoming suggestions.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 glass-panel hover:bg-white/5 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" /> Terminate Session
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('reviews')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors",
            activeTab === 'reviews' ? "bg-accent text-background shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "glass-panel hover:bg-white/5"
          )}
        >
          <Star className="w-5 h-5" /> Reviews ({reviews.length})
        </button>
        <button 
          onClick={() => setActiveTab('suggestions')}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors",
            activeTab === 'suggestions' ? "bg-accent text-background shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "glass-panel hover:bg-white/5"
          )}
        >
          <MessageSquare className="w-5 h-5" /> Suggestions ({suggestions.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Activity className="w-10 h-10 text-accent animate-spin" />
        </div>
      ) : activeTab === 'reviews' ? (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="glass-panel p-10 text-center text-muted">No reviews detected in network.</div>
          ) : (
            reviews.map(r => (
              <div key={r.userId} className={cn("glass-panel p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-6 transition-all", priorityToggles[r.userId] && "border-accent/30 bg-accent/5")}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-surface border border-border/10 text-muted">UID: {r.userId}</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("w-3 h-3", i < Math.floor(r.rating) ? "fill-accent text-accent" : "text-muted/30")} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm">"{r.text}"</p>
                </div>
                
                <button 
                  onClick={() => handleToggle(r.userId)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                >
                  {priorityToggles[r.userId] ? (
                    <><CheckSquare className="w-5 h-5 text-accent" /> <span className="text-accent font-medium">Priority: 1</span></>
                  ) : (
                    <><Square className="w-5 h-5 text-muted" /> <span className="text-muted">Priority: 0</span></>
                  )}
                </button>
              </div>
            ))
          )}

          {/* Floating Save Bar */}
          <AnimatePresence>
            {dirtyCount > 0 && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass-panel shadow-2xl border-accent/20 p-4 flex items-center gap-6 rounded-2xl bg-background/95 backdrop-blur-xl"
              >
                <div className="text-sm font-medium">
                  Unsaved overrides: <span className="text-accent text-lg font-bold">{dirtyCount}</span>
                </div>
                <button 
                  onClick={handleBatchSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-accent text-background px-6 py-3 rounded-xl font-bold hover:bg-accent/90 transition-all disabled:opacity-50"
                >
                  {isSaving ? <Activity className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Synchronize Matrix
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="glass-panel p-10 text-center text-muted">No suggestions in databanks.</div>
          ) : (
            suggestions.map(s => (
              <div key={s.id} className="glass-panel p-6 flex flex-col gap-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-xs font-mono text-muted/50">ID: {s.userId.substring(0,6)}...</span>
                </div>
                <p className="text-sm text-muted">"{s.text}"</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
