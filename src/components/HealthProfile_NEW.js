import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { healthProfileAPI, nutritionAPI } from '../services/api';
import './HealthProfile.css';

function HealthProfile({ userProfile, updateUserProfile }) {
  const [formData, setFormData] = useState({
    userId: 'user123',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    activityLevel: 'moderate',
    goal: 'maintenance',
    dietaryRestrictions: [],
    allergies: [],
    healthConditions: [],
  });

  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [savedMealPlans, setSavedMealPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (userProfile) {
      setFormData(userProfile);
      fetchRecommendations(userProfile);
    }
    loadSavedMealPlans();
  }, [userProfile]);

  const loadSavedMealPlans = () => {
    try {
      const plans = JSON.parse(localStorage.getItem('savedMealPlans') || '[]');
      setSavedMealPlans(plans);
    } catch (err) {
      console.error('Failed to load saved meal plans:', err);
    }
  };

  const deleteMealPlan = (planId) => {
    try {
      const plans = savedMealPlans.filter(plan => plan.id !== planId);
      localStorage.setItem('savedMealPlans', JSON.stringify(plans));
      setSavedMealPlans(plans);
      setMessage({ type: 'success', text: 'Meal plan deleted successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Failed to delete meal plan:', err);
      setMessage({ type: 'error', text: 'Failed to delete meal plan.' });
    }
  };

  const viewMealPlan = (plan) => {
    setSelectedPlan(plan);
  };

  const closeMealPlanModal = () => {
    setSelectedPlan(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelect = (e, field) => {
    const value = e.target.value;
    if (value && !formData[field].includes(value)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value]
      }));
    }
  };

  const removeItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(i => i !== item)
    }));
  };

  const fetchRecommendations = async (profile) => {
    try {
      const response = await nutritionAPI.getRecommendations(profile);
      setRecommendations(response.data.data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await healthProfileAPI.create(formData);
      updateUserProfile(formData);
      await fetchRecommendations(formData);
      setMessage({ type: 'success', text: '🎉 Profile saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to save profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const getBMI = () => {
    if (formData.weight && formData.height) {
      const heightInMeters = formData.height / 100;
      return (formData.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#3b82f6' };
    if (bmi < 25) return { label: 'Healthy', color: '#10b981' };
    if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
    return { label: 'Obese', color: '#ef4444' };
  };

  return (
    <div className="health-profile-page">
      <div className="profile-wizard-container">
        {/* Progress Bar */}
        <div className="wizard-progress">
          <div className="progress-steps">
            <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
              <div className="step-circle">
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className="step-label">Basic Info</span>
            </div>
            <div className={`progress-line ${currentStep > 1 ? 'active' : ''}`}></div>
            <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
              <div className="step-circle">
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className="step-label">Lifestyle</span>
            </div>
            <div className={`progress-line ${currentStep > 2 ? 'active' : ''}`}></div>
            <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="step-circle">3</div>
              <span className="step-label">Health Details</span>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="wizard-card">
          <div className="wizard-header">
            <h1 className="wizard-title">
              {currentStep === 1 && '👤 Tell Us About Yourself'}
              {currentStep === 2 && '🎯 Your Lifestyle & Goals'}
              {currentStep === 3 && '🏥 Health & Dietary Information'}
            </h1>
            <p className="wizard-subtitle">
              {currentStep === 1 && 'Let\'s start with your basic information'}
              {currentStep === 2 && 'Help us understand your activity and goals'}
              {currentStep === 3 && 'Share any restrictions or health conditions'}
            </p>
          </div>

          {message.text && (
            <div className={`wizard-message ${message.type === 'success' ? 'success-message' : 'error-message'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="wizard-form">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="form-step step-1">
                <div className="form-grid">
                  <div className="input-group">
                    <label className="input-label">
                      <span className="label-icon">🎂</span>
                      Age
                    </label>
                    <input
                      type="number"
                      name="age"
                      className="wizard-input"
                      value={formData.age}
                      onChange={handleChange}
                      required
                      min="1"
                      max="120"
                      placeholder="Enter your age"
                    />
                  </div>

                  <div className="input-group full-width">
                    <label className="input-label">
                      <span className="label-icon">⚧</span>
                      Gender
                    </label>
                    <div className="gender-selector">
                      <button
                        type="button"
                        className={`gender-option ${formData.gender === 'male' ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                      >
                        <span className="gender-icon">👨</span>
                        Male
                      </button>
                      <button
                        type="button"
                        className={`gender-option ${formData.gender === 'female' ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                      >
                        <span className="gender-icon">👩</span>
                        Female
                      </button>
                      <button
                        type="button"
                        className={`gender-option ${formData.gender === 'other' ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, gender: 'other' }))}
                      >
                        <span className="gender-icon">🧑</span>
                        Other
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      <span className="label-icon">⚖️</span>
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      className="wizard-input"
                      value={formData.weight}
                      onChange={handleChange}
                      required
                      min="1"
                      step="0.1"
                      placeholder="Enter your weight"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      <span className="label-icon">📏</span>
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      name="height"
                      className="wizard-input"
                      value={formData.height}
                      onChange={handleChange}
                      required
                      min="1"
                      placeholder="Enter your height"
                    />
                  </div>
                </div>

                {getBMI() && (
                  <div className="bmi-card">
                    <div className="bmi-header">
                      <span className="bmi-icon">📊</span>
                      <span>Your BMI</span>
                    </div>
                    <div className="bmi-value">{getBMI()}</div>
                    <div className="bmi-category" style={{ color: getBMICategory(parseFloat(getBMI())).color }}>
                      {getBMICategory(parseFloat(getBMI())).label}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Lifestyle & Goals */}
            {currentStep === 2 && (
              <div className="form-step step-2">
                <div className="input-group full-width">
                  <label className="input-label">
                    <span className="label-icon">🏃</span>
                    Activity Level
                  </label>
                  <div className="activity-grid">
                    {[
                      { value: 'sedentary', icon: '🛋️', label: 'Sedentary', desc: 'Little or no exercise' },
                      { value: 'light', icon: '🚶', label: 'Light', desc: '1-3 days/week' },
                      { value: 'moderate', icon: '🏋️', label: 'Moderate', desc: '3-5 days/week' },
                      { value: 'active', icon: '🏃', label: 'Active', desc: '6-7 days/week' },
                      { value: 'very_active', icon: '💪', label: 'Very Active', desc: 'Intense daily' }
                    ].map((activity) => (
                      <button
                        key={activity.value}
                        type="button"
                        className={`activity-card ${formData.activityLevel === activity.value ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, activityLevel: activity.value }))}
                      >
                        <span className="activity-icon">{activity.icon}</span>
                        <span className="activity-label">{activity.label}</span>
                        <span className="activity-desc">{activity.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group full-width">
                  <label className="input-label">
                    <span className="label-icon">🎯</span>
                    Health Goal
                  </label>
                  <div className="goals-grid">
                    {[
                      { value: 'weight_loss', icon: '📉', label: 'Weight Loss', color: '#3b82f6' },
                      { value: 'weight_gain', icon: '📈', label: 'Weight Gain', color: '#10b981' },
                      { value: 'muscle_gain', icon: '💪', label: 'Muscle Gain', color: '#8b5cf6' },
                      { value: 'maintenance', icon: '⚖️', label: 'Maintenance', color: '#f59e0b' },
                      { value: 'general_health', icon: '❤️', label: 'General Health', color: '#ef4444' }
                    ].map((goal) => (
                      <button
                        key={goal.value}
                        type="button"
                        className={`goal-card ${formData.goal === goal.value ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, goal: goal.value }))}
                        style={{ '--goal-color': goal.color }}
                      >
                        <span className="goal-icon">{goal.icon}</span>
                        <span className="goal-label">{goal.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Health Details */}
            {currentStep === 3 && (
              <div className="form-step step-3">
                <div className="input-group full-width">
                  <label className="input-label">
                    <span className="label-icon">🥗</span>
                    Dietary Restrictions
                  </label>
                  <select
                    className="wizard-select"
                    onChange={(e) => handleMultiSelect(e, 'dietaryRestrictions')}
                    value=""
                  >
                    <option value="">Click to add restrictions...</option>
                    <option value="none">None</option>
                    <option value="vegetarian">🌱 Vegetarian</option>
                    <option value="vegan">🥬 Vegan</option>
                    <option value="gluten-free">🌾 Gluten-Free</option>
                    <option value="dairy-free">🥛 Dairy-Free</option>
                    <option value="low-carb">🍞 Low-Carb</option>
                    <option value="keto">🥓 Keto</option>
                    <option value="paleo">🦴 Paleo</option>
                    <option value="halal">☪️ Halal</option>
                    <option value="kosher">✡️ Kosher</option>
                  </select>
                  <div className="chips-container">
                    {formData.dietaryRestrictions.length === 0 && (
                      <span className="empty-chips">No restrictions selected</span>
                    )}
                    {formData.dietaryRestrictions.map(item => (
                      <span key={item} className="chip chip-primary">
                        {item}
                        <button type="button" className="chip-remove" onClick={() => removeItem('dietaryRestrictions', item)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="input-group full-width">
                  <label className="input-label">
                    <span className="label-icon">⚠️</span>
                    Allergies
                  </label>
                  <select
                    className="wizard-select"
                    onChange={(e) => handleMultiSelect(e, 'allergies')}
                    value=""
                  >
                    <option value="">Click to add allergies...</option>
                    <option value="none">None</option>
                    <option value="peanuts">🥜 Peanuts</option>
                    <option value="tree nuts">🌰 Tree Nuts</option>
                    <option value="milk">🥛 Milk</option>
                    <option value="eggs">🥚 Eggs</option>
                    <option value="soy">🫘 Soy</option>
                    <option value="wheat">🌾 Wheat</option>
                    <option value="fish">🐟 Fish</option>
                    <option value="shellfish">🦐 Shellfish</option>
                  </select>
                  <div className="chips-container">
                    {formData.allergies.length === 0 && (
                      <span className="empty-chips">No allergies selected</span>
                    )}
                    {formData.allergies.map(item => (
                      <span key={item} className="chip chip-danger">
                        {item}
                        <button type="button" className="chip-remove" onClick={() => removeItem('allergies', item)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="input-group full-width">
                  <label className="input-label">
                    <span className="label-icon">🏥</span>
                    Health Conditions
                  </label>
                  <select
                    className="wizard-select"
                    onChange={(e) => handleMultiSelect(e, 'healthConditions')}
                    value=""
                  >
                    <option value="">Click to add conditions...</option>
                    <option value="none">None</option>
                    <option value="diabetes">💉 Diabetes</option>
                    <option value="hypertension">🩺 Hypertension</option>
                    <option value="high cholesterol">📊 High Cholesterol</option>
                    <option value="heart disease">❤️ Heart Disease</option>
                    <option value="PCOS">🔬 PCOS</option>
                    <option value="thyroid">🦋 Thyroid Issues</option>
                  </select>
                  <div className="chips-container">
                    {formData.healthConditions.length === 0 && (
                      <span className="empty-chips">No health conditions selected</span>
                    )}
                    {formData.healthConditions.map(item => (
                      <span key={item} className="chip chip-warning">
                        {item}
                        <button type="button" className="chip-remove" onClick={() => removeItem('healthConditions', item)}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="wizard-actions">
              {currentStep > 1 && (
                <button type="button" className="btn-wizard btn-secondary" onClick={prevStep}>
                  ← Previous
                </button>
              )}
              {currentStep < 3 ? (
                <button 
                  type="button" 
                  className="btn-wizard btn-primary" 
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && (!formData.age || !formData.weight || !formData.height)) ||
                    (currentStep === 2 && (!formData.activityLevel || !formData.goal))
                  }
                >
                  Next →
                </button>
              ) : (
                <button type="submit" className="btn-wizard btn-success" disabled={loading}>
                  {loading ? '⏳ Saving...' : '✨ Complete Profile'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {recommendations && (
        <div className="recommendations-section">
          <h2 className="section-title">📊 Your Personalized Recommendations</h2>
          <div className="recommendations-grid-new">
            <div className="rec-card">
              <div className="rec-icon">🔥</div>
              <div className="rec-label">BMR</div>
              <div className="rec-value">{recommendations.bmr}</div>
              <div className="rec-unit">calories/day</div>
            </div>
            <div className="rec-card">
              <div className="rec-icon">⚡</div>
              <div className="rec-label">TDEE</div>
              <div className="rec-value">{recommendations.tdee}</div>
              <div className="rec-unit">calories/day</div>
            </div>
            <div className="rec-card highlight">
              <div className="rec-icon">🎯</div>
              <div className="rec-label">Target Calories</div>
              <div className="rec-value">{recommendations.targetCalories}</div>
              <div className="rec-unit">calories/day</div>
            </div>
          </div>

          <div className="macros-section-new">
            <h3 className="macros-title">🍽️ Recommended Daily Macros</h3>
            <div className="macros-cards">
              <div className="macro-card protein-card">
                <div className="macro-icon">🥩</div>
                <div className="macro-name">Protein</div>
                <div className="macro-amount">{recommendations.macros.protein}g</div>
                <div className="macro-percentage">30%</div>
              </div>
              <div className="macro-card carbs-card">
                <div className="macro-icon">🍚</div>
                <div className="macro-name">Carbs</div>
                <div className="macro-amount">{recommendations.macros.carbohydrates}g</div>
                <div className="macro-percentage">45%</div>
              </div>
              <div className="macro-card fat-card">
                <div className="macro-icon">🥑</div>
                <div className="macro-name">Fats</div>
                <div className="macro-amount">{recommendations.macros.fat}g</div>
                <div className="macro-percentage">25%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {savedMealPlans.length > 0 && (
        <div className="saved-meals-section">
          <div className="section-header">
            <h2 className="section-title">📋 Saved Meal Plans ({savedMealPlans.length})</h2>
          </div>

          <div className="meal-plans-grid">
            {savedMealPlans.map((plan) => (
              <div key={plan.id} className="saved-plan-card">
                <div className="plan-card-header">
                  <div className="plan-icon">🍽️</div>
                  <div className="plan-meta">
                    <h3>
                      {plan.preferences.duration} Day{plan.preferences.duration > 1 ? 's' : ''} Plan
                    </h3>
                    <p className="plan-date">
                      {new Date(plan.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="plan-details">
                  <div className="plan-detail-item">
                    <span className="detail-label">Meals/Day:</span>
                    <span className="detail-value">{plan.preferences.mealsPerDay}</span>
                  </div>
                  {plan.preferences.cuisinePreferences.length > 0 && (
                    <div className="plan-detail-item">
                      <span className="detail-label">Cuisines:</span>
                      <span className="detail-value">
                        {plan.preferences.cuisinePreferences.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="plan-actions">
                  <button 
                    className="btn-view-plan"
                    onClick={() => viewMealPlan(plan)}
                  >
                    👁️ View Plan
                  </button>
                  <button 
                    className="btn-delete-plan"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this meal plan?')) {
                        deleteMealPlan(plan.id);
                      }
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPlan && (
        <div className="modal-overlay" onClick={closeMealPlanModal}>
          <div className="meal-plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selectedPlan.preferences.duration} Day Meal Plan
              </h2>
              <button className="modal-close" onClick={closeMealPlanModal}>
                ×
              </button>
            </div>

            <div className="modal-info">
              <div className="info-badge">
                📅 Generated: {new Date(selectedPlan.generatedAt).toLocaleDateString()}
              </div>
              <div className="info-badge">
                🍽️ {selectedPlan.preferences.mealsPerDay} meals/day
              </div>
              {selectedPlan.preferences.cuisinePreferences.length > 0 && (
                <div className="info-badge">
                  🌍 {selectedPlan.preferences.cuisinePreferences.join(', ')}
                </div>
              )}
            </div>

            <div className="modal-content-scroll markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selectedPlan.mealPlan}
              </ReactMarkdown>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(selectedPlan.mealPlan);
                  alert('Meal plan copied to clipboard!');
                }}
              >
                📋 Copy to Clipboard
              </button>
              <button 
                className="btn btn-secondary"
                onClick={closeMealPlanModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthProfile;
