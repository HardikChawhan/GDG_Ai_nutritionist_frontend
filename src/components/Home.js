import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Joyride, { STATUS } from 'react-joyride';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './Home.css';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const [runTour, setRunTour] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { currentUser, userProfile, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize AOS
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
      easing: 'ease-out-cubic',
    });

    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      // Start tour after a brief delay
      setTimeout(() => {
        setRunTour(true);
      }, 1000);
    }
  }, []);

  const tourSteps = [
    {
      target: '.hero-section',
      content: 'Welcome to your AI Nutrition Assistant! 🎉 Let\'s take a quick tour of all the amazing features.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.feature-card:nth-child(1)',
      content: '🎯 Create personalized meal plans tailored to your health goals and dietary preferences!',
      placement: 'bottom',
    },
    {
      target: '.feature-card:nth-child(2)',
      content: '🔍 Analyze any food or meal to get detailed nutritional insights and AI recommendations!',
      placement: 'bottom',
    },
    {
      target: '.feature-card:nth-child(3)',
      content: '📊 Track your daily nutrition, calories, and macros with our interactive dashboard!',
      placement: 'bottom',
    },
    {
      target: '.feature-card:nth-child(4)',
      content: '🗃️ Search through thousands of foods in our comprehensive USDA database!',
      placement: 'bottom',
    },
    {
      target: '.info-section',
      content: '✨ Powered by Google Gemini AI for intelligent, personalized nutrition guidance!',
      placement: 'top',
    },
    {
      target: '.btn-primary',
      content: '🚀 Ready to get started? Create your health profile to unlock all features!',
      placement: 'top',
    },
  ];

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('hasSeenTour', 'true');
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
      
      // Check for iOS-specific errors
      if (error.code === 'auth/popup-blocked') {
        alert('Popup was blocked. Please allow popups for this site in your browser settings.');
      } else if (error.message?.includes('sessionStorage')) {
        alert('Authentication requires browser storage. Please:\n1. Disable Private Browsing mode\n2. Enable cookies in Settings\n3. Try again');
      } else {
        alert('Failed to sign in. Please try again.');
      }
    }
  };

  return (
    <div className="container home-container">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#6366f1',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: '16px',
            fontSize: '16px',
          },
          buttonNext: {
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
          },
          buttonBack: {
            borderRadius: '8px',
            marginRight: '10px',
          },
          buttonSkip: {
            color: '#6366f1',
          },
        }}
      />

      <div className="hero-section" data-aos="fade-down" data-aos-duration="1200">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <h1 className="hero-title" data-aos="zoom-in" data-aos-delay="200">
          Welcome to Your AI Nutrition Assistant
        </h1>
        <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="400">
          Powered by Google Gemini AI 
        </p>
        <p className="hero-description" data-aos="fade-up" data-aos-delay="600">
          Get personalized meal plans, smart food recommendations, and expert nutrition guidance 
          tailored to your unique health goals and preferences.
        </p>
        
        {!currentUser ? (
          <button 
            onClick={handleGetStarted}
            className="btn btn-primary btn-large pulse-btn"
            data-aos="zoom-in" 
            data-aos-delay="800"
          >
            Get Started - Create Your Profile ✨
          </button>
        ) : !userProfile ? (
          <Link 
            to="/profile" 
            className="btn btn-primary btn-large pulse-btn"
            data-aos="zoom-in" 
            data-aos-delay="800"
          >
            Complete Your Health Profile ✨
          </Link>
        ) : (
          <div className="welcome-back-compact" data-aos="zoom-in" data-aos-delay="800">
            <span className="welcome-icon">👋</span>
            <div className="welcome-text">
              <strong>Welcome back, {currentUser.displayName}!</strong>
              <span className="goal-text">Goal: {userProfile.goal?.replace('_', ' ')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="features-grid">
        <div 
          className="feature-card"
          data-aos="fade-up"
          data-aos-delay="100"
          data-aos-duration="800"
        >
          <div className="feature-icon bounce">🎯</div>
          <h3>Personalized Meal Plans</h3>
          <p>AI-generated meal plans tailored to your health goals, dietary restrictions, and preferences.</p>
          <Link to="/meal-planner" className="feature-link glow-on-hover">Create Meal Plan →</Link>
        </div>

        <div 
          className="feature-card"
          data-aos="fade-up"
          data-aos-delay="200"
          data-aos-duration="800"
        >
          <div className="feature-icon bounce">🔍</div>
          <h3>Food Analysis</h3>
          <p>Analyze any food or meal and get detailed nutritional insights and recommendations.</p>
          <Link to="/food-analyzer" className="feature-link glow-on-hover">Analyze Food →</Link>
        </div>

        <div 
          className="feature-card"
          data-aos="fade-up"
          data-aos-delay="300"
          data-aos-duration="800"
        >
          <div className="feature-icon bounce">📊</div>
          <h3>Nutrition Dashboard</h3>
          <p>Track your daily nutrition, calories, and macros with smart recommendations.</p>
          <Link to="/dashboard" className="feature-link glow-on-hover">View Dashboard →</Link>
        </div>

        <div 
          className="feature-card"
          data-aos="fade-up"
          data-aos-delay="400"
          data-aos-duration="800"
        >
          <div className="feature-icon bounce">🗃️</div>
          <h3>Food Database</h3>
          <p>Search through thousands of foods and get detailed nutritional information.</p>
          <Link to="/food-search" className="feature-link glow-on-hover">Search Foods →</Link>
        </div>
      </div>

      <div className="info-section" data-aos="fade-up" data-aos-duration="1000">
        <h2 data-aos="zoom-in">Why Choose Our AI Nutrition Assistant?</h2>
        <div className="benefits-list">
          <div 
            className="benefit-item"
            data-aos="fade-right"
            data-aos-delay="100"
          >
            <span className="benefit-icon rotate-on-hover">✨</span>
            <div>
              <h4>AI-Powered Intelligence</h4>
              <p>Leveraging Google Gemini AI for accurate, context-aware nutrition guidance</p>
            </div>
          </div>
          <div 
            className="benefit-item"
            data-aos="fade-left"
            data-aos-delay="200"
          >
            <span className="benefit-icon rotate-on-hover">🎨</span>
            <div>
              <h4>Personalized Experience</h4>
              <p>Considers your health conditions, allergies, cultural preferences, and lifestyle</p>
            </div>
          </div>
          <div 
            className="benefit-item"
            data-aos="fade-right"
            data-aos-delay="300"
          >
            <span className="benefit-icon rotate-on-hover">🔄</span>
            <div>
              <h4>Adaptive Learning</h4>
              <p>Continuously learns from your feedback to improve recommendations</p>
            </div>
          </div>
          <div 
            className="benefit-item"
            data-aos="fade-left"
            data-aos-delay="400"
          >
            <span className="benefit-icon rotate-on-hover">💡</span>
            <div>
              <h4>Educational Insights</h4>
              <p>Understand why certain foods are better for your specific goals</p>
            </div>
          </div>
        </div>
      </div>

      <div className="cta-section" data-aos="zoom-in-up" data-aos-duration="1000">
        <h2>Ready to Transform Your Health? 🚀</h2>
        <p>Join thousands of users achieving their health goals with AI-powered nutrition guidance</p>
        {!currentUser ? (
          <button onClick={handleGetStarted} className="btn btn-primary btn-large pulse-btn">
            Start Your Journey Now →
          </button>
        ) : !userProfile && (
          <Link to="/profile" className="btn btn-primary btn-large pulse-btn">
            Complete Your Profile →
          </Link>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            <div className="modal-content">
              <div className="modal-icon">🔐</div>
              <h2>Welcome to AI Nutrition Assistant</h2>
              <p>Sign in with Google to get started and unlock personalized nutrition guidance!</p>
              
              <button 
                onClick={handleGoogleSignIn} 
                className="google-signin-btn"
                disabled={loading}
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google" 
                />
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </button>
              
              <div className="modal-benefits">
                <h4>Why sign in?</h4>
                <ul>
                  <li>✅ Personalized meal plans and recommendations</li>
                  <li>✅ Track your nutrition and progress</li>
                  <li>✅ Save your health profile and preferences</li>
                  <li>✅ Access your data from any device</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
