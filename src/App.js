import React, { useState, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Activity, User, LogOut, Sun, Moon } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

import Home from './components/Home';
import HealthProfile from './components/HealthProfile';
import MealPlanner from './components/MealPlanner';
import FoodAnalyzer from './components/FoodAnalyzer';
import NutritionDashboard from './components/NutritionDashboard';
import FoodSearch from './components/FoodSearch';
import AgentSelection from './components/AgentSelection';
import VoiceAssistant from './components/VoiceAssistant';
import WorkoutTracker from './components/WorkoutTracker';
import AdminPanel from './components/AdminPanel';
import ScrollToTop from './components/ScrollToTop';
import ReviewModal from './components/ReviewModal';
import Logo_pic from './assets/Images/god.png';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getAgentSettings, getHealthProfile, getDailyNutrition } from './services/firebaseService';
import { cn } from './utils/cn';

function AppContent() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [agentConfig, setAgentConfig] = useState(null);
  const [voiceAssistantEnabled, setVoiceAssistantEnabled] = useState(false);
  const [userContext, setUserContext] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Listen for voice navigation events
  useEffect(() => {
    const handleVoiceNavigation = (event) => {
      const { destination } = event.detail;
      navigate(destination);
    };
    window.addEventListener('voice-navigation', handleVoiceNavigation);
    return () => window.removeEventListener('voice-navigation', handleVoiceNavigation);
  }, [navigate]);

  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          const agent = await getAgentSettings(currentUser.uid);
          if (agent) {
            setAgentConfig(agent);
            setVoiceAssistantEnabled(true);
          } else {
            setVoiceAssistantEnabled(false);
          }
          const [healthProfile, todayNutrition] = await Promise.all([
            getHealthProfile(currentUser.uid),
            getDailyNutrition(currentUser.uid)
          ]);
          setUserContext({ healthProfile, todayNutrition });
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        setAgentConfig(null);
        setVoiceAssistantEnabled(false);
        setUserContext(null);
      }
    };
    loadUserData();
  }, [currentUser]);

  const handleAgentSetupComplete = (agent) => {
    setAgentConfig(agent);
    setVoiceAssistantEnabled(true);
    loadUserContext();
  };

  const loadUserContext = async () => {
    if (currentUser) {
      try {
        const [healthProfile, todayNutrition] = await Promise.all([
          getHealthProfile(currentUser.uid),
          getDailyNutrition(currentUser.uid)
        ]);
        setUserContext({ healthProfile, todayNutrition });
      } catch (error) {
        console.error('Error loading user context:', error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setMenuOpen(false);
      setShowLogoutModal(false);
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Logout failed. Please retry.');
    }
  };

  const toggleTheme = () => {
    // Only toggling class or attribute for now, relying on dark default
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Profile', path: '/profile' },
    { name: 'Meal Planner', path: '/meal-planner' },
    { name: 'Analysis', path: '/food-analyzer' },
    { name: 'Database', path: '/food-search' },
    { name: 'Workouts', path: '/workout' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-accent/30">
      <ScrollToTop />

      {/* Modern Glass Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel !rounded-none !border-t-0 !border-x-0 bg-surface/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Brand */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-accent/20 flex items-center justify-center p-1">
                <Activity className="w-5 h-5 text-accent" />
              </div>
              <span className="font-heading font-semibold text-lg tracking-tight hidden sm:block">AI Nutritionist</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-foreground",
                    location.pathname === link.path ? "text-accent" : "text-muted"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <button onClick={toggleTheme} className="text-muted hover:text-foreground transition-colors p-2 rounded-full hover:bg-white/5">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {currentUser ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-surface/80 border border-white/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-muted" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-2 text-sm font-medium text-muted hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : null}

              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 text-muted hover:text-foreground"
                >
                  {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden glass-panel !rounded-none !border-x-0 !border-b-0 border-t border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col">
              <Link to="/" onClick={() => setMenuOpen(false)} className="px-3 py-2 text-base font-medium text-muted hover:text-foreground hover:bg-white/5 rounded-md">Home</Link>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2 text-base font-medium text-muted hover:text-foreground hover:bg-white/5 rounded-md"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content routing */}
      <main className="flex-1 w-full pt-16">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<HealthProfile />} />
            <Route path="/agent-setup" element={<AgentSelection onComplete={handleAgentSetupComplete} />} />
            <Route path="/meal-planner" element={<MealPlanner />} />
            <Route path="/food-analyzer" element={<FoodAnalyzer />} />
            <Route path="/food-search" element={<FoodSearch />} />
            <Route path="/dashboard" element={<NutritionDashboard />} />
            <Route path="/workout" element={<WorkoutTracker />} />
            <Route path="/admin/panel/cwrazy" element={<AdminPanel />} />
            <Route path="/admin/panel/cwrazy/" element={<AdminPanel />} />
          </Routes>
        </AnimatePresence>
      </main>

      <footer className="w-full py-8 text-center text-sm text-muted border-t border-white/5 mt-auto">
        <p>© 2026 AI Nutritionist | Secure Platform</p>
      </footer>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}>
          <div className="glass-panel w-full max-w-sm p-6 relative border-red-500/20 shadow-red-500/10" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-center mb-2">Terminate Session</h3>
            <p className="text-muted text-center text-sm mb-6">Confirming session termination. Your clinical profile and biometric data strictly remain encrypted.</p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2 rounded-lg bg-surface hover:bg-surface/80 text-foreground transition-colors border border-white/10"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                onClick={handleLogout}
              >
                Terminate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant Module */}
      {currentUser && voiceAssistantEnabled && agentConfig && (
        <VoiceAssistant
          agentConfig={agentConfig}
          userContext={userContext}
          isEnabled={voiceAssistantEnabled}
        />
      )}

      {/* Global Review Prompt — TEMPORARILY DISABLED */}
      {/* {currentUser && <ReviewModal />} */}
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
