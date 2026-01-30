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
    // Load saved meal plans from localStorage
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
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Your Health Profile</h1>
          <p className="card-subtitle">Tell us about yourself to get personalized nutrition recommendations</p>
        </div>

        {message.text && (
          <div className={message.type === 'success' ? 'success' : 'error'}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Age *</label>
              <input
                type="number"
                name="age"
                className="form-input"
                value={formData.age}
                onChange={handleChange}
                required
                min="1"
                max="120"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select
                name="gender"
                className="form-select"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Weight (kg) *</label>
              <input
                type="number"
                name="weight"
                className="form-input"
                value={formData.weight}
                onChange={handleChange}
                required
                min="1"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Height (cm) *</label>
              <input
                type="number"
                name="height"
                className="form-input"
                value={formData.height}
                onChange={handleChange}
                required
                min="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Activity Level *</label>
            <select
              name="activityLevel"
              className="form-select"
              value={formData.activityLevel}
              onChange={handleChange}
              required
            >
              <option value="sedentary">Sedentary (little or no exercise)</option>
              <option value="light">Light (exercise 1-3 days/week)</option>
              <option value="moderate">Moderate (exercise 3-5 days/week)</option>
              <option value="active">Active (exercise 6-7 days/week)</option>
              <option value="very_active">Very Active (intense exercise daily)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Health Goal *</label>
            <select
              name="goal"
              className="form-select"
              value={formData.goal}
              onChange={handleChange}
              required
            >
              <option value="weight_loss">Weight Loss</option>
              <option value="weight_gain">Weight Gain</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="maintenance">Maintenance</option>
              <option value="general_health">General Health</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Dietary Restrictions</label>
            <select
              className="form-select"
              onChange={(e) => handleMultiSelect(e, 'dietaryRestrictions')}
              value=""
            >
              <option value="">Select restrictions...</option>
              <option value="none">None</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="gluten-free">Gluten-Free</option>
              <option value="dairy-free">Dairy-Free</option>
              <option value="low-carb">Low-Carb</option>
              <option value="keto">Keto</option>
              <option value="paleo">Paleo</option>
              <option value="halal">Halal</option>
              <option value="kosher">Kosher</option>
            </select>
            <div className="tags-container">
              {formData.dietaryRestrictions.length === 0 && (
                <span className="empty-state-text">No dietary restrictions selected</span>
              )}
              {formData.dietaryRestrictions.map(item => (
                <span key={item} className="tag">
                  {item} <button type="button" onClick={() => removeItem('dietaryRestrictions', item)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Allergies</label>
            <select
              className="form-select"
              onChange={(e) => handleMultiSelect(e, 'allergies')}
              value=""
            >
              <option value="">Select allergies...</option>
              <option value="none">None</option>
              <option value="peanuts">Peanuts</option>
              <option value="tree nuts">Tree Nuts</option>
              <option value="milk">Milk</option>
              <option value="eggs">Eggs</option>
              <option value="soy">Soy</option>
              <option value="wheat">Wheat</option>
              <option value="fish">Fish</option>
              <option value="shellfish">Shellfish</option>
            </select>
            <div className="tags-container">
              {formData.allergies.length === 0 && (
                <span className="empty-state-text">No allergies selected</span>
              )}
              {formData.allergies.map(item => (
                <span key={item} className="tag tag-danger">
                  {item} <button type="button" onClick={() => removeItem('allergies', item)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Health Conditions</label>
            <select
              className="form-select"
              onChange={(e) => handleMultiSelect(e, 'healthConditions')}
              value=""
            >
              <option value="">Select conditions...</option>
              <option value="none">None</option>
              <option value="diabetes">Diabetes</option>
              <option value="hypertension">Hypertension</option>
              <option value="high cholesterol">High Cholesterol</option>
              <option value="heart disease">Heart Disease</option>
              <option value="PCOS">PCOS</option>
              <option value="thyroid">Thyroid Issues</option>
            </select>
            <div className="tags-container">
              {formData.healthConditions.length === 0 && (
                <span className="empty-state-text">No health conditions selected</span>
              )}
              {formData.healthConditions.map(item => (
                <span key={item} className="tag tag-warning">
                  {item} <button type="button" onClick={() => removeItem('healthConditions', item)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {recommendations && (
        <div className="card recommendations-card">
          <h2 className="card-title">Your Personalized Recommendations</h2>
          <div className="recommendations-grid">
            <div className="rec-item">
              <h3>Basal Metabolic Rate (BMR)</h3>
              <p className="rec-value">{recommendations.bmr} calories/day</p>
              <p className="rec-desc">Calories burned at rest</p>
            </div>
            <div className="rec-item">
              <h3>Total Daily Energy Expenditure</h3>
              <p className="rec-value">{recommendations.tdee} calories/day</p>
              <p className="rec-desc">Calories burned including activity</p>
            </div>
            <div className="rec-item">
              <h3>Target Calories</h3>
              <p className="rec-value">{recommendations.targetCalories} calories/day</p>
              <p className="rec-desc">To achieve your goal</p>
            </div>
          </div>
          <div className="macros-section">
            <h3>Recommended Macros</h3>
            <div className="macro-bars">
              <div className="macro-item">
                <div className="macro-label">
                  <span>Protein</span>
                  <span>{recommendations.macros.protein}g</span>
                </div>
                <div className="macro-bar">
                  <div className="macro-fill protein" style={{width: '35%'}}></div>
                </div>
              </div>
              <div className="macro-item">
                <div className="macro-label">
                  <span>Carbohydrates</span>
                  <span>{recommendations.macros.carbohydrates}g</span>
                </div>
                <div className="macro-bar">
                  <div className="macro-fill carbs" style={{width: '40%'}}></div>
                </div>
              </div>
              <div className="macro-item">
                <div className="macro-label">
                  <span>Fat</span>
                  <span>{recommendations.macros.fat}g</span>
                </div>
                <div className="macro-bar">
                  <div className="macro-fill fat" style={{width: '25%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Meal Plans Section */}
      {savedMealPlans.length > 0 && (
        <div className="card saved-meal-plans-section">
          <div className="card-header">
            <h2 className="card-title">📋 Saved Meal Plans</h2>
            <p className="card-subtitle">Your previously saved meal plans ({savedMealPlans.length})</p>
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
                      Saved: {new Date(plan.savedAt).toLocaleDateString()}
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

      {/* Meal Plan View Modal */}
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
