import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';
import Home from './components/Home';
import HealthProfile from './components/HealthProfile';
import MealPlanner from './components/MealPlanner';
import FoodAnalyzer from './components/FoodAnalyzer';
import NutritionDashboard from './components/NutritionDashboard';
import FoodSearch from './components/FoodSearch';
import AgentSelection from './components/AgentSelection';
import VoiceAssistant from './components/VoiceAssistant';
import WorkoutTracker from './components/WorkoutTracker';
import ScrollToTop from './components/ScrollToTop';
import Logo_pic from './assets/Images/god.png';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getAgentSettings, getHealthProfile, getDailyNutrition } from './services/firebaseService';

function AppContent() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [agentConfig, setAgentConfig] = useState(null);
  const [voiceAssistantEnabled, setVoiceAssistantEnabled] = useState(false);
  const [userContext, setUserContext] = useState(null);

  // Listen for voice navigation events
  useEffect(() => {
    const handleVoiceNavigation = (event) => {
      const { destination } = event.detail;
      navigate(destination);
    };

    window.addEventListener('voice-navigation', handleVoiceNavigation);

    return () => {
      window.removeEventListener('voice-navigation', handleVoiceNavigation);
    };
  }, [navigate]);

  // Load agent settings and user context when user logs in
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          // Load agent settings
          const agent = await getAgentSettings(currentUser.uid);
          if (agent) {
            console.log('Agent loaded:', agent);
            setAgentConfig(agent);
            setVoiceAssistantEnabled(true);
          } else {
            console.log('No agent configured');
          }

          // Load user context for voice assistant
          const [healthProfile, todayNutrition] = await Promise.all([
            getHealthProfile(currentUser.uid),
            getDailyNutrition(currentUser.uid)
          ]);

          console.log('User context loaded:', { healthProfile, todayNutrition });
          setUserContext({
            healthProfile,
            todayNutrition
          });
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
    // Force reload user context
    loadUserContext();
  };

  const loadUserContext = async () => {
    if (currentUser) {
      try {
        const [healthProfile, todayNutrition] = await Promise.all([
          getHealthProfile(currentUser.uid),
          getDailyNutrition(currentUser.uid)
        ]);

        setUserContext({
          healthProfile,
          todayNutrition
        });
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
      alert('Failed to logout. Please try again.');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="App">
      <ScrollToTop />
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-brand">
            <img src={Logo_pic} alt="Logo" className="nav-logo" />
            <span>AI Nutrition Assistant</span>
          </Link>
          <button 
            className="nav-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          <div className={`nav-right ${menuOpen ? 'active' : ''}`}>
            <ul className="nav-menu">
              <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
              <li><Link to="/profile" onClick={() => setMenuOpen(false)}>Health Profile</Link></li>
              <li><Link to="/meal-planner" onClick={() => setMenuOpen(false)}>Meal Planner</Link></li>
              <li><Link to="/food-analyzer" onClick={() => setMenuOpen(false)}>Food Analyzer</Link></li>
              <li><Link to="/food-search" onClick={() => setMenuOpen(false)}>Food Database</Link></li>
              <li><Link to="/workout" onClick={() => setMenuOpen(false)}>Workout Tracker</Link></li>
            </ul>
            <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {currentUser && (
              <div className="user-profile-nav">
                <Link to="/dashboard" className="user-info" onClick={() => setMenuOpen(false)}>
                  {currentUser.photoURL && (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.displayName || 'User'} 
                      className="user-avatar"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span className="user-name">{currentUser.displayName || 'User'}</span>
                </Link>
                <button onClick={() => setShowLogoutModal(true)} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/profile" 
            element={<HealthProfile />} 
          />
          <Route 
            path="/agent-setup" 
            element={<AgentSelection onComplete={handleAgentSetupComplete} />} 
          />
          <Route 
            path="/meal-planner" 
            element={<MealPlanner />} 
          />
          <Route 
            path="/food-analyzer" 
            element={<FoodAnalyzer />} 
          />
          <Route 
            path="/food-search" 
            element={<FoodSearch />} 
          />
          <Route 
            path="/dashboard" 
            element={<NutritionDashboard />} 
          />
          <Route 
            path="/workout" 
            element={<WorkoutTracker />} 
          />
        </Routes>
      </main>

      <footer className="footer">
        <p>© 2025 AI Nutrition Assistant | Powered by Google Gemini AI</p>
      </footer>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">👋</div>
            <h3>Logout Confirmation</h3>
            <p>Are you sure you want to logout? Your data is safely saved in the cloud.</p>
            <div className="modal-buttons">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant */}
      {currentUser && voiceAssistantEnabled && agentConfig && (
        <VoiceAssistant 
          agentConfig={agentConfig}
          userContext={userContext}
          isEnabled={voiceAssistantEnabled}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
