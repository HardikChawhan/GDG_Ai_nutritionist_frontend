import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Activity, Database, Sparkles, User, ChevronRight, Apple, Star, MessageSquare, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAllReviews, saveSuggestion } from '../services/firebaseService';
import { cn } from '../utils/cn';

function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { currentUser, userProfile, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [suggestionText, setSuggestionText] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const reviewDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - reviewDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y ago`;
  };

  React.useEffect(() => {
    const fetchReviews = async () => {
      const data = await getAllReviews();
      setReviews(data);
    };
    fetchReviews();
  }, []);

  const highlightedReviews = reviews.filter(r => r.priority === 1);
  const standardReviews = reviews.filter(r => r.priority !== 1);

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (!suggestionText.trim()) return;
    
    setIsSubmittingSuggestion(true);
    try {
      await saveSuggestion(currentUser.uid, currentUser.displayName, suggestionText.trim());
      alert("Thank you! Your suggestion has been successfully recorded.");
      setSuggestionText('');
    } catch (error) {
      alert(error.message || "Failed to submit suggestion.");
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  const handleGetStarted = (e) => {
    if (!currentUser) {
      e.preventDefault();
      setShowLoginModal(true);
    } else {
      navigate('/profile');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      setShowLoginModal(false);
      navigate('/profile');
    } catch (error) {
      console.error('Error signing in:', error);
      if (error.code === 'auth/popup-blocked') {
        alert('Authentication window blocked. Please permit popups for this domain.');
      } else {
        alert('Authentication failed. Please attempt again.');
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto selection:bg-accent/30">

      {/* Hero Section */}
      <motion.section
        className="text-center max-w-4xl mx-auto mb-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-8">
          <BrainCircuit className="w-4 h-4" />
          <span>Advanced Health Intelligence</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-heading font-bold text-foreground mb-6 leading-tight tracking-tight">
          Precision Nutrition <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted">
            Driven By Data
          </span>
        </h1>

        <p className="text-xl text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
          Experience personalized dietary analysis and customized meal planning, powered by your health goals and smart AI.
        </p>

        {!currentUser ? (
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-background px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] shadow-2xl shadow-accent/20"
          >
            Set Up Profile
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : !userProfile ? (
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-background px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] shadow-2xl shadow-accent/20"
          >
            Complete Assessment
            <ChevronRight className="w-5 h-5" />
          </Link>
        ) : (
          <div className="inline-flex items-center gap-3 glass-panel px-6 py-4">
            <User className="w-5 h-5 text-accent" />
            <div className="text-left">
              <div className="font-semibold text-foreground">Welcome back, {currentUser.displayName}</div>
              <div className="text-sm text-muted capitalize">Current Objective: {userProfile.goal?.replace('_', ' ')}</div>
            </div>
            <Link to="/dashboard" className="ml-4 px-4 py-2 border border-border/10 rounded-lg text-sm hover:bg-foreground/5 transition-colors">
              Go to Dashboard
            </Link>
          </div>
        )}
      </motion.section>

      {/* Bento Grid Architecture */}
      <motion.div
        className="bento-grid"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* Large Feature 1 */}
        <motion.div variants={itemVariants} className="bento-item md:col-span-2 lg:col-span-8 flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-2xl font-heading font-semibold mb-3">Meal Generation</h3>
            <p className="text-muted mb-6 max-w-md">Algorithmic meal planning strictly calibrated to your specific biometric markers, dietary requirements, and metabolic goals.</p>
            <Link to="/meal-planner" className="inline-flex items-center text-sm font-medium text-foreground hover:text-accent transition-colors">
              Generate Plan <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </motion.div>

        {/* Square Feature 1 */}
        <motion.div variants={itemVariants} className="bento-item md:col-span-1 lg:col-span-4 flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-surface/80 border border-border/10 flex items-center justify-center mb-6">
              <Database className="w-6 h-6 text-muted group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-3">Nutritional Analytics</h3>
            <p className="text-muted text-sm mb-6">Deep inspection of food parameters utilizing the power of AI.</p>
          </div>
          <Link to="/food-analyzer" className="inline-flex items-center text-sm font-medium text-foreground hover:text-accent transition-colors">
            Analyze Data <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </motion.div>

        {/* Square Feature 2 */}
        <motion.div variants={itemVariants} className="bento-item md:col-span-1 lg:col-span-5 flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-surface/80 border border-border/10 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-muted group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-3">Adaptive Intelligence</h3>
            <p className="text-muted text-sm mb-6">The system continuously monitors your adherence and dynamically adjusts caloric and macronutrient targets over time.</p>
          </div>
        </motion.div>

        {/* Wide Feature */}
        <motion.div variants={itemVariants} className="bento-item md:col-span-2 lg:col-span-7 flex flex-col justify-between bg-surface/30 group">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
                <Apple className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-2xl font-heading font-semibold mb-3">Comprehensive Food Matrix</h3>
              <p className="text-muted mb-4 max-w-sm">Access to an extensive repository of validated nutritional compositions for precise dietary tracking.</p>
              <Link to="/food-search" className="inline-flex items-center text-sm font-medium text-foreground hover:text-accent transition-colors">
                Query Database <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="w-full md:w-64 h-32 rounded-xl bg-surface/80 border border-border/5 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Dynamic Highlighted Reviews Section */}
      {highlightedReviews.length > 0 && (
        <motion.section 
          className="mt-24 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold mb-4">What Our Users Say <span className="text-accent underline decoration-wavy decoration-accent/30 underline-offset-8">Most Helpful</span></h2>
            <p className="text-muted max-w-2xl mx-auto">Real success stories explicitly featured by our administration module.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlightedReviews.map((review) => (
              <div key={review.userId} className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors duration-700" />
                <div className="relative z-10">
                  <div className="flex text-accent mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("w-4 h-4", i < Math.floor(review.rating) ? "fill-accent" : "text-muted/30")} />
                    ))}
                  </div>
                  <p className="text-foreground text-sm italic mb-6">"{review.text}"</p>
                </div>
                <div className="flex items-center gap-3 border-t border-border/5 pt-4 relative z-10">
                  {review.photoURL ? (
                    <img src={review.photoURL} alt="User Avatar" className="w-8 h-8 rounded-full border border-accent/20 object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface/80 border border-accent/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div className="text-xs font-semibold">{review.displayName || `User #${review.userId.substring(0, 4)}`}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {getTimeAgo(review.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Standard Complete Reviews Section */}
      {standardReviews.length > 0 && (
        <motion.section 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-heading font-bold mb-2">Community Voices</h2>
            <p className="text-muted text-sm max-w-xl mx-auto">Unfiltered experiences from our growing user base.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {standardReviews.map((review) => (
              <div key={review.userId} className="glass-panel p-5 flex flex-col justify-between border-border/5 hover:border-accent/10 transition-colors">
                <div>
                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("w-3 h-3", i < Math.floor(review.rating) ? "fill-accent text-accent" : "text-muted/20")} />
                    ))}
                  </div>
                  <p className="text-muted text-sm mb-4 line-clamp-4">"{review.text}"</p>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-border/5">
                  {review.photoURL ? (
                    <img src={review.photoURL} alt="Avatar" className="w-6 h-6 rounded-full border border-border/10 object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-surface/50 flex items-center justify-center">
                      <User className="w-3 h-3 text-muted/70" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold truncate">
                      {review.displayName || `U-${review.userId.substring(0, 4)}`}
                    </div>
                    <div className="text-[9px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {getTimeAgo(review.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Suggestion Portal */}
      <motion.section 
        className="mt-16 mb-20 max-w-2xl mx-auto glass-panel p-8 relative overflow-hidden group"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors duration-700" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-2xl font-heading font-semibold">Help Us Improve</h3>
          </div>
          <p className="text-muted text-sm mb-6">Have an idea for a new feature? We read every submission. (Max 5 suggestions per user).</p>
          
          <form onSubmit={handleSuggestionSubmit}>
            <textarea
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="I'd love to see a feature that..."
              className="w-full h-32 bg-surface/50 border border-border/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-sm text-foreground resize-none mb-4 transition-colors"
            />
            <button 
              type="submit"
              disabled={isSubmittingSuggestion || !suggestionText.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {isSubmittingSuggestion ? 'Submitting...' : 'Send Suggestion'}
            </button>
          </form>
        </div>
      </motion.section>

      {/* Authentication Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel w-full max-w-md p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors" onClick={() => setShowLoginModal(false)}>✕</button>
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-6 mt-2 mx-auto">
              <User className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-2xl font-heading font-semibold text-center mb-2">Secure Authentication</h2>
            <p className="text-muted text-center text-sm mb-8">Sign in with your account to set up your personal health profile.</p>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-foreground text-background hover:bg-foreground/90 px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              {loading ? 'Authenticating...' : 'Authenticate with Google'}
            </button>

            <div className="mt-8 pt-6 border-t border-border/10">
              <ul className="text-sm text-muted space-y-3">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Encrypted Health Records</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> HIPAA-compliant architecture</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Persistent biometric tracking</li>
              </ul>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Home;
