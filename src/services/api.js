import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health Profile API
export const healthProfileAPI = {
  create: (profile) => api.post('/health-profile', profile),
  get: (userId) => api.get(`/health-profile/${userId}`),
  update: (userId, updates) => api.patch(`/health-profile/${userId}`, updates),
  delete: (userId) => api.delete(`/health-profile/${userId}`),
};

// Nutrition API
export const nutritionAPI = {
  searchFoods: (query, limit = 20) => 
    api.get(`/nutrition/search?query=${encodeURIComponent(query)}&limit=${limit}`),
  getFoodById: (fdcId) => api.get(`/nutrition/${fdcId}`),
  getSimilarFoods: (fdcId, limit = 5) => 
    api.get(`/nutrition/${fdcId}/similar?limit=${limit}`),
  calculateNutrition: (foodIds, servings) => 
    api.post('/nutrition/calculate', { foodIds, servings }),
  getRecommendations: (userProfile) => 
    api.post('/nutrition/recommendations', userProfile),
};

// Meal Plan API
export const mealPlanAPI = {
  generate: (userProfile, preferences) => 
    api.post('/meal-plan/generate', { userProfile, preferences }),
  getFoodSwaps: (currentFoods, userProfile) => 
    api.post('/meal-plan/food-swaps', { currentFoods, userProfile }),
  explainFoodChoice: (foodItem, comparison, userProfile) => 
    api.post('/meal-plan/explain', { foodItem, comparison, userProfile }),
};

// Food Analysis API
export const foodAnalysisAPI = {
  analyzeText: (foodItems, userProfile) => 
    api.post('/food-analysis/analyze-text', { foodItems, userProfile }),
  getMealInsights: (mealName, foodItems, userProfile) => 
    api.post('/food-analysis/meal-insights', { mealName, foodItems, userProfile }),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
