import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nutritionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import NutritionCalendar from './NutritionCalendar';
import './NutritionDashboard.css';

// Cookie helper for calories burned
const getCaloriesBurnedFromCookie = (date) => {
  const dateKey = date || new Date().toISOString().split('T')[0];
  const cookieKey = `caloriesBurned_${dateKey}`;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${cookieKey}=`);
  if (parts.length === 2) {
    const calories = parseInt(parts.pop().split(';').shift()) || 0;
    console.log(`📊 Loaded calories burned from cookie (${dateKey}): ${calories}`);
    return calories;
  }
  return 0;
};

function NutritionDashboard() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [dailyFoods, setDailyFoods] = useState([]);
  const [foodInput, setFoodInput] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [currentNutrition, setCurrentNutrition] = useState({
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0
  });
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [agentSettings, setAgentSettings] = useState(null);
  const [showAgentSettings, setShowAgentSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Get today's date as a key
  const getTodayKey = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load foods from Firebase or localStorage on mount
  useEffect(() => {
    const loadDailyFoods = async () => {
      try {
        const todayKey = getTodayKey();
        
        if (currentUser) {
          // Try to load from Firebase
          try {
            const nutritionData = await firebaseService.getDailyNutrition(currentUser.uid, todayKey);
            
            if (nutritionData) {
              console.log('Loaded from Firebase:', nutritionData);
              setDailyFoods(nutritionData.foods || []);
              setCurrentNutrition(nutritionData.totals || {
                calories: 0,
                protein: 0,
                carbohydrates: 0,
                fat: 0,
                fiber: 0
              });
              // Load calories burned from cookie instead of Firebase
              setCaloriesBurned(getCaloriesBurnedFromCookie(todayKey));
            } else {
              // No data in Firebase, try localStorage
              loadFromLocalStorage(todayKey);
            }
          } catch (error) {
            console.error('Error loading from Firebase:', error);
            loadFromLocalStorage(todayKey);
          }
          
          // Load agent settings
          try {
            const agent = await firebaseService.getAgentSettings(currentUser.uid);
            setAgentSettings(agent);
          } catch (error) {
            console.error('Error loading agent settings:', error);
          }
        } else {
          // Not logged in, use localStorage
          loadFromLocalStorage(todayKey);
          // Always load calories burned from cookie
          setCaloriesBurned(getCaloriesBurnedFromCookie(todayKey));
        }
      } catch (error) {
        console.error('Error loading daily foods:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadDailyFoods();
  }, [currentUser]);

  const loadFromLocalStorage = (todayKey) => {
    try {
      const savedData = localStorage.getItem(`dailyFoods_${todayKey}`);
      
      if (savedData) {
        const data = JSON.parse(savedData);
        setDailyFoods(data.foods || []);
        setCurrentNutrition(data.totals || {
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          fiber: 0
        });
      }
      // Always load calories burned from cookie
      setCaloriesBurned(getCaloriesBurnedFromCookie(todayKey));
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  // Save foods to Firebase and localStorage whenever they change
  useEffect(() => {
    if (isInitialLoad) {
      return; // Skip saving on initial load
    }

    const saveData = async () => {
      try {
        const todayKey = getTodayKey();
        const dataToSave = {
          foods: dailyFoods,
          totals: currentNutrition,
          lastUpdated: new Date().toISOString()
        };

        // Save to localStorage (backup)
        localStorage.setItem(`dailyFoods_${todayKey}`, JSON.stringify(dataToSave));

        // Save to Firebase if user is logged in
        if (currentUser) {
          await firebaseService.saveDailyNutrition(currentUser.uid, todayKey, dataToSave);
          console.log('Saved to Firebase:', dataToSave);
        }
      } catch (error) {
        console.error('Error saving daily foods:', error);
      }
    };

    saveData();
  }, [dailyFoods, currentNutrition, isInitialLoad, currentUser]);

  const fetchRecommendations = async () => {
    if (!userProfile) return;
    
    try {
      const response = await nutritionAPI.getRecommendations(userProfile);
      setRecommendations(response.data.data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchRecommendations();
    }
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for voice food logging events
  useEffect(() => {
    const handleVoiceFoodLog = (event) => {
      const foodData = event.detail;
      console.log('📢 Voice food log received:', foodData);
      
      // Add the food to daily foods
      const newFood = {
        name: foodData.food,
        calories: parseFloat(foodData.calories) || 0,
        protein: parseFloat(foodData.protein) || 0,
        carbohydrates: parseFloat(foodData.carbs) || 0,
        fat: parseFloat(foodData.fat) || 0,
        serving: foodData.serving || '1 serving',
        timestamp: new Date().toISOString()
      };

      console.log('➕ Adding food with macros:', newFood);

      // Update foods array
      setDailyFoods(prev => {
        const updated = [...prev, newFood];
        console.log('📊 Total foods now:', updated.length);
        return updated;
      });
      
      // Update totals using functional update to ensure we have latest state
      setCurrentNutrition(prev => {
        const updated = {
          calories: (prev.calories || 0) + newFood.calories,
          protein: (prev.protein || 0) + newFood.protein,
          carbohydrates: (prev.carbohydrates || 0) + newFood.carbohydrates,
          fat: (prev.fat || 0) + newFood.fat,
          fiber: prev.fiber || 0
        };
        console.log('📈 Updated nutrition totals:', updated);
        
        // Check if macros exceed limits
        checkMacroLimits(updated);
        
        return updated;
      });
      
      setIsInitialLoad(false);
    };

    window.addEventListener('voice-food-log', handleVoiceFoodLog);
    
    return () => {
      window.removeEventListener('voice-food-log', handleVoiceFoodLog);
    };
  }, []);

  const searchAndAddFood = async (foodName) => {
    setIsSearching(true);
    try {
      // Search for the food in the database
      const response = await nutritionAPI.searchFoods(foodName, 1);
      
      if (response.data.data && response.data.data.length > 0) {
        const foodData = response.data.data[0];
        
        // Extract nutritional values from the food data
        const nutrients = foodData.nutrients || {};
        const calories = nutrients['Energy']?.amount || 0;
        const protein = nutrients['Protein']?.amount || 0;
        const carbs = nutrients['Carbohydrate, by difference']?.amount || 0;
        const fat = nutrients['Total lipid (fat)']?.amount || 0;
        const fiber = nutrients['Fiber, total dietary']?.amount || 0;

        // Add food with actual nutritional data
        const foodEntry = {
          name: foodName,
          fdcId: foodData.fdcId,
          description: foodData.description,
          nutrition: {
            calories: Math.round(calories),
            protein: Math.round(protein * 10) / 10,
            carbohydrates: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10,
            fiber: Math.round(fiber * 10) / 10
          }
        };

        setDailyFoods([...dailyFoods, foodEntry]);
        
        // Update total nutrition
        setCurrentNutrition(prev => ({
          calories: prev.calories + foodEntry.nutrition.calories,
          protein: Math.round((prev.protein + foodEntry.nutrition.protein) * 10) / 10,
          carbohydrates: Math.round((prev.carbohydrates + foodEntry.nutrition.carbohydrates) * 10) / 10,
          fat: Math.round((prev.fat + foodEntry.nutrition.fat) * 10) / 10,
          fiber: Math.round((prev.fiber + foodEntry.nutrition.fiber) * 10) / 10
        }));
      } else {
        // If food not found, add with estimated values
        alert(`Food "${foodName}" not found in database. Please try a more specific name.`);
      }
    } catch (error) {
      console.error('Error searching for food:', error);
      alert('Failed to search for food. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const addFood = () => {
    if (foodInput.trim()) {
      searchAndAddFood(foodInput.trim());
      setFoodInput('');
    }
  };

  const removeFood = (index) => {
    const foodToRemove = dailyFoods[index];
    const newFoods = dailyFoods.filter((_, i) => i !== index);
    setDailyFoods(newFoods);
    
    // Subtract the actual nutrition values (handle both old and new structures)
    const calories = foodToRemove.calories || foodToRemove.nutrition?.calories || 0;
    const protein = foodToRemove.protein || foodToRemove.nutrition?.protein || 0;
    const carbs = foodToRemove.carbohydrates || foodToRemove.nutrition?.carbohydrates || 0;
    const fat = foodToRemove.fat || foodToRemove.nutrition?.fat || 0;
    const fiber = foodToRemove.fiber || foodToRemove.nutrition?.fiber || 0;
    
    setCurrentNutrition(prev => ({
      calories: Math.max(0, prev.calories - calories),
      protein: Math.max(0, Math.round((prev.protein - protein) * 10) / 10),
      carbohydrates: Math.max(0, Math.round((prev.carbohydrates - carbs) * 10) / 10),
      fat: Math.max(0, Math.round((prev.fat - fat) * 10) / 10),
      fiber: Math.max(0, Math.round((prev.fiber - fiber) * 10) / 10)
    }));
    
    setIsInitialLoad(false);
  };

  const resetDay = () => {
    setDailyFoods([]);
    setCurrentNutrition({
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0
    });
    
    // Clear localStorage for today
    try {
      const todayKey = getTodayKey();
      localStorage.removeItem(todayKey);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  };

  const checkMacroLimits = (nutrition) => {
    if (!recommendations) return;
    
    const warnings = [];
    const targetCals = recommendations.targetCalories || 2000;
    const targetProtein = recommendations.macros?.protein || 150;
    const targetCarbs = recommendations.macros?.carbohydrates || 200;
    const targetFat = recommendations.macros?.fat || 65;
    
    if (nutrition.calories > targetCals * 1.1) {
      warnings.push(`Calories exceeded by ${Math.round(nutrition.calories - targetCals)} cal`);
    }
    if (nutrition.protein > targetProtein * 1.2) {
      warnings.push(`Protein exceeded by ${Math.round(nutrition.protein - targetProtein)}g`);
    }
    if (nutrition.carbohydrates > targetCarbs * 1.2) {
      warnings.push(`Carbs exceeded by ${Math.round(nutrition.carbohydrates - targetCarbs)}g`);
    }
    if (nutrition.fat > targetFat * 1.2) {
      warnings.push(`Fat exceeded by ${Math.round(nutrition.fat - targetFat)}g`);
    }
    
    if (warnings.length > 0) {
      setWarningMessage(warnings.join(' • '));
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
    }
  };

  const getProgressPercentage = (current, target) => {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage < 50) return '#e74c3c';
    if (percentage < 80) return '#f39c12';
    if (percentage <= 100) return '#27ae60';
    return '#3498db';
  };

  if (!userProfile) {
    return (
      <div className="container">
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h2>Welcome to Your Nutrition Dashboard</h2>
            <p>Please create your health profile first to get personalized nutrition tracking</p>
            <a href="/profile" className="btn btn-primary">Create Profile</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container nutrition-dashboard-container">
      {/* Warning Popup */}
      {showWarning && (
        <div className="warning-popup">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h4>Macro Limit Exceeded!</h4>
            <p>{warningMessage}</p>
          </div>
          <button className="warning-close" onClick={() => setShowWarning(false)}>×</button>
        </div>
      )}

      {/* Calendar Toggle Button */}
      <button className="calendar-toggle-btn" onClick={() => setShowCalendar(!showCalendar)}>
        📅
      </button>

      {/* Calendar Popup */}
      {showCalendar && (
        <div className="calendar-popup">
          <div className="calendar-popup-header">
            <h3>📅 Nutrition History</h3>
            <button className="close-btn" onClick={() => setShowCalendar(false)}>×</button>
          </div>
          <NutritionCalendar />
        </div>
      )}

      {/* Voice Assistant Settings */}
      {agentSettings && (
        <div className="agent-settings-card">
          <div className="agent-header">
            <div className="agent-info">
              <span className="agent-avatar-large">{agentSettings.avatar}</span>
              <div>
                <h3>Your AI Assistant: {agentSettings.name}</h3>
                <p className="agent-personality">{agentSettings.personality}</p>
                <p className="agent-voice-info">Voice: {agentSettings.voice}</p>
              </div>
            </div>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/agent-setup')}
            >
              Change Assistant
            </button>
          </div>
          <div className="agent-status">
            <div className="status-indicator active"></div>
            <span>Listening for "{agentSettings.name}"</span>
          </div>
        </div>
      )}

      {/* Hero Stats Section */}
      {recommendations && (
        <div className="hero-stats-grid">
          <div className="hero-stat-card calories-card">
            <div className="hero-stat-icon">🔥</div>
            <div className="hero-stat-content">
              <div className="hero-stat-label">Calories</div>
              <div className="hero-stat-values">
                <span className="current">{currentNutrition.calories}</span>
                <span className="separator">/</span>
                <span className="target">{recommendations.targetCalories}</span>
              </div>
              <div className="hero-progress-bar">
                <div 
                  className="hero-progress-fill"
                  style={{
                    width: `${getProgressPercentage(currentNutrition.calories, recommendations.targetCalories)}%`,
                    background: getProgressColor(getProgressPercentage(currentNutrition.calories, recommendations.targetCalories))
                  }}
                />
              </div>
              <div className="progress-label">
                {getProgressPercentage(currentNutrition.calories, recommendations.targetCalories).toFixed(0)}% Complete
              </div>
            </div>
          </div>

          <div className="hero-stat-card protein-card">
            <div className="hero-stat-icon">🥩</div>
            <div className="hero-stat-content">
              <div className="hero-stat-label">Protein</div>
              <div className="hero-stat-values">
                <span className="current">{currentNutrition.protein}g</span>
                <span className="separator">/</span>
                <span className="target">{recommendations.macros.protein}g</span>
              </div>
              <div className="hero-progress-bar">
                <div 
                  className="hero-progress-fill protein"
                  style={{
                    width: `${getProgressPercentage(currentNutrition.protein, recommendations.macros.protein)}%`
                  }}
                />
              </div>
              <div className="progress-label">
                {getProgressPercentage(currentNutrition.protein, recommendations.macros.protein).toFixed(0)}% Complete
              </div>
            </div>
          </div>

          <div className="hero-stat-card carbs-card">
            <div className="hero-stat-icon">🍚</div>
            <div className="hero-stat-content">
              <div className="hero-stat-label">Carbs</div>
              <div className="hero-stat-values">
                <span className="current">{currentNutrition.carbohydrates}g</span>
                <span className="separator">/</span>
                <span className="target">{recommendations.macros.carbohydrates}g</span>
              </div>
              <div className="hero-progress-bar">
                <div 
                  className="hero-progress-fill carbs"
                  style={{
                    width: `${getProgressPercentage(currentNutrition.carbohydrates, recommendations.macros.carbohydrates)}%`
                  }}
                />
              </div>
              <div className="progress-label">
                {getProgressPercentage(currentNutrition.carbohydrates, recommendations.macros.carbohydrates).toFixed(0)}% Complete
              </div>
            </div>
          </div>

          <div className="hero-stat-card fats-card">
            <div className="hero-stat-icon">🥑</div>
            <div className="hero-stat-content">
              <div className="hero-stat-label">Fats</div>
              <div className="hero-stat-values">
                <span className="current">{currentNutrition.fat}g</span>
                <span className="separator">/</span>
                <span className="target">{recommendations.macros.fat}g</span>
              </div>
              <div className="hero-progress-bar">
                <div 
                  className="hero-progress-fill fats"
                  style={{
                    width: `${getProgressPercentage(currentNutrition.fat, recommendations.macros.fat)}%`
                  }}
                />
              </div>
              <div className="progress-label">
                {getProgressPercentage(currentNutrition.fat, recommendations.macros.fat).toFixed(0)}% Complete
              </div>
            </div>
          </div>

          <div className="hero-stat-card workout-card">
            <div className="hero-stat-icon">💪</div>
            <div className="hero-stat-content">
              <div className="hero-stat-label">Calories Burned</div>
              <div className="hero-stat-values">
                <span className="current workout-calories">{caloriesBurned}</span>
                <span className="calories-label">kcal</span>
              </div>
              <button 
                className="workout-btn" 
                onClick={() => navigate('/workout')}
              >
                Start Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Food Entry Card */}
      <div className="card food-entry-card">
        <div className="card-header">
          <div>
            <h2 className="card-title">🍽️ Log Your Food</h2>
            <p className="card-subtitle">Track what you eat today</p>
          </div>
          {dailyFoods.length > 0 && (
            <button className="btn-reset" onClick={resetDay}>
              🔄 Reset Day
            </button>
          )}
        </div>

        <div className="food-entry-bar">
          <input
            type="text"
            className="food-input"
            placeholder="What did you eat? (e.g., chicken breast, apple, oats)"
            value={foodInput}
            onChange={(e) => setFoodInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isSearching && addFood()}
            disabled={isSearching}
          />
          <button className="btn-add-food" onClick={addFood} disabled={isSearching}>
            <span className="btn-icon">{isSearching ? '🔄' : '➕'}</span>
            <span className="btn-text">{isSearching ? 'Searching...' : 'Add Food'}</span>
          </button>
        </div>

        {dailyFoods.length > 0 ? (
          <div className="daily-foods-section">
            <div className="section-header">
              <h3>Today's Foods</h3>
              <span className="food-count">{dailyFoods.length} items</span>
            </div>
            <div className="foods-list-modern scrollable">
                {[...dailyFoods].reverse().map((food, reversedIndex) => {
                  const actualIndex = dailyFoods.length - 1 - reversedIndex;
                  return (
                    <div key={actualIndex} className="food-item-modern">
                      <div className="food-item-icon">🍴</div>
                      <div className="food-item-details">
                        <span className="food-item-name">{food.description || food.name || food}</span>
                        <span className="food-item-nutrition">
                          {food.calories || food.nutrition?.calories || 0} cal | {food.protein || food.nutrition?.protein || 0}g protein | {food.carbohydrates || food.nutrition?.carbohydrates || 0}g carbs | {food.fat || food.nutrition?.fat || 0}g fat
                        </span>
                      </div>
                      <button 
                        className="food-remove-btn"
                        onClick={() => removeFood(actualIndex)}
                        title="Remove food"
                      >
                        <span>×</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="empty-food-list">
            <div className="empty-icon">🍽️</div>
            <p>No foods logged yet. Start tracking your meals!</p>
          </div>
        )}
      </div>

      {/* Quick Stats Card */}
      <div className="card quick-stats-card">
        <h2 className="stats-title">📊 Quick Stats</h2>
        <div className="quick-stats-grid">
          <div className="quick-stat-item">
            <div className="quick-stat-icon goal-icon">📈</div>
            <div className="quick-stat-content">
              <div className="quick-stat-label">Goal</div>
              <div className="quick-stat-value">{userProfile.goal?.replace('_', ' ')}</div>
            </div>
          </div>
          <div className="quick-stat-item">
            <div className="quick-stat-icon activity-icon">⚡</div>
            <div className="quick-stat-content">
              <div className="quick-stat-label">Activity</div>
              <div className="quick-stat-value">{userProfile.activityLevel}</div>
            </div>
          </div>
          <div className="quick-stat-item">
            <div className="quick-stat-icon foods-icon">🍽️</div>
            <div className="quick-stat-content">
              <div className="quick-stat-label">Foods Today</div>
              <div className="quick-stat-value">{dailyFoods.length}</div>
            </div>
          </div>
          <div className="quick-stat-item">
            <div className="quick-stat-icon streak-icon">✅</div>
            <div className="quick-stat-content">
              <div className="quick-stat-label">Streak</div>
              <div className="quick-stat-value">1 day</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NutritionDashboard;
