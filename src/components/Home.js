import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Activity, Database, Sparkles, User, ChevronRight, Apple } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { currentUser, userProfile, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

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
