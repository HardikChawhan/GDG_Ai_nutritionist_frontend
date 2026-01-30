import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { foodAnalysisAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import './FoodAnalyzer.css';
import Logo_pic from '../assets/Images/god.png';

function FoodAnalyzer() {
  const { currentUser, userProfile } = useAuth();
  const [foodInput, setFoodInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeFoodText = async () => {
    if (!userProfile) {
      setError('Please create your health profile first');
      return;
    }

    if (!foodInput.trim()) {
      setError('Please enter food items to analyze');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const foodItems = foodInput.split(',').map(f => f.trim()).filter(f => f);
      const response = await foodAnalysisAPI.analyzeText(foodItems, userProfile);
      const analysisData = response.data.data;
      setAnalysis(analysisData);
      
      // Save to Firebase if user is logged in
      if (currentUser) {
        try {
          await firebaseService.saveFoodAnalysis(currentUser.uid, {
            foodItems,
            analysis: analysisData,
            userProfile: {
              age: userProfile.age,
              goal: userProfile.goal
            }
          });
          console.log('Food analysis saved to Firebase');
        } catch (saveError) {
          console.error('Error saving to Firebase:', saveError);
        }
      }
    } catch (err) {
      setError('Failed to analyze food. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeFoodText();
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">AI Food Analyzer</h1>
          <p className="card-subtitle">
            Get instant nutrition insights and personalized recommendations
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="input-section">
          <label className="form-label">
            Enter Food Items (comma-separated)
          </label>
          <textarea
            className="form-textarea"
            placeholder="e.g., grilled chicken breast, brown rice, steamed broccoli, olive oil"
            value={foodInput}
            onChange={(e) => setFoodInput(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={4}
          />
          <p className="input-hint">
            💡 Tip: Add multiple foods separated by commas for a complete meal analysis
          </p>
          <button 
            className="btn btn-primary btn-large"
            onClick={analyzeFoodText}
            disabled={loading}
          >
            {loading ? '🔄 Analyzing...' : '🔍 Analyze Food'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="card loading-card">
          <div className="loading-animation">
            <div className="spinner"></div>
            <p>AI is analyzing your food...</p>
            <p className="loading-subtext">Getting nutrition insights</p>
          </div>
        </div>
      )}

      {analysis && !loading && (
        <div className="card analysis-result">
          <div className="result-header">
            <h2>📊 Nutrition Analysis</h2>
            <p className="analyzed-foods">
              <strong>Foods analyzed:</strong> {analysis.foodItems.join(', ')}
            </p>
            <p className="analyzed-time">
              Analyzed on {new Date(analysis.analyzedAt).toLocaleString()}
            </p>
          </div>

          <div className="analysis-content">
            <div className="analysis-text markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {analysis.analysis}
              </ReactMarkdown>
            </div>
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-grid">
              <button 
                className="action-btn"
                onClick={() => {
                  navigator.clipboard.writeText(analysis.analysis);
                  alert('Analysis copied to clipboard!');
                }}
              >
                📋 Copy Analysis
              </button>
              <button 
                className="action-btn"
                onClick={() => {
                  setFoodInput('');
                  setAnalysis(null);
                }}
              >
                🔄 New Analysis
              </button>
              <button 
                className="action-btn"
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card info-card">
        <h3>What Can You Analyze?</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-icon">🍽️</span>
            <div>
              <h4>Complete Meals</h4>
              <p>Analyze entire meals to see nutritional balance</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">
              <img src={Logo_pic} alt="Logo" style={{width: '40px', height: '40px', objectFit: 'contain'}} />
            </span>
            <div>
              <h4>Individual Foods</h4>
              <p>Get detailed insights on specific food items</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">🔄</span>
            <div>
              <h4>Food Comparisons</h4>
              <p>Compare different food options</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">💡</span>
            <div>
              <h4>Smart Suggestions</h4>
              <p>Receive personalized recommendations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodAnalyzer;
