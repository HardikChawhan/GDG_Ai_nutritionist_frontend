import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  getDocs,
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Firebase Database Service
 * Handles all Firestore operations for user data
 */
class FirebaseService {
  
  // ==================== USER PROFILE ====================
  
  /**
   * Create or update user profile
   */
  async saveUserProfile(userId, profileData) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // ==================== HEALTH PROFILE ====================
  
  /**
   * Save health profile
   */
  async saveHealthProfile(userId, healthData) {
    try {
      const healthRef = doc(db, 'users', userId, 'health', 'profile');
      await setDoc(healthRef, {
        ...healthData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving health profile:', error);
      throw error;
    }
  }

  /**
   * Get health profile
   */
  async getHealthProfile(userId) {
    try {
      const healthRef = doc(db, 'users', userId, 'health', 'profile');
      const healthSnap = await getDoc(healthRef);
      
      if (healthSnap.exists()) {
        return healthSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting health profile:', error);
      throw error;
    }
  }

  // ==================== DAILY NUTRITION ====================
  
  /**
   * Save daily nutrition log
   */
  async saveDailyNutrition(userId, date, nutritionData) {
    try {
      const dateKey = date || new Date().toISOString().split('T')[0];
      const nutritionRef = doc(db, 'users', userId, 'nutrition', dateKey);
      
      await setDoc(nutritionRef, {
        date: dateKey,
        foods: nutritionData.foods || [],
        totals: nutritionData.totals || {
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
          fiber: 0
        },
        ...(nutritionData.caloriesBurned !== undefined && { caloriesBurned: nutritionData.caloriesBurned }),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      return { success: true };
    } catch (error) {
      console.error('Error saving daily nutrition:', error);
      throw error;
    }
  }

  /**
   * Get daily nutrition log
   */
  async getDailyNutrition(userId, date) {
    try {
      const dateKey = date || new Date().toISOString().split('T')[0];
      const nutritionRef = doc(db, 'users', userId, 'nutrition', dateKey);
      const nutritionSnap = await getDoc(nutritionRef);
      
      if (nutritionSnap.exists()) {
        return nutritionSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting daily nutrition:', error);
      throw error;
    }
  }

  /**
   * Increment calories burned for today
   */
  async incrementCaloriesBurned(userId, date, amount) {
    try {
      const dateKey = date || new Date().toISOString().split('T')[0];
      const nutritionRef = doc(db, 'users', String(userId), 'nutrition', dateKey);

      await setDoc(nutritionRef, {
        caloriesBurned: increment(Number(amount) || 0),
        lastWorkoutAt: serverTimestamp(),
        date: dateKey
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error incrementing calories burned:', error);
      throw error;
    }
  }

  /**
   * Add food to daily log
   */
  async addFoodToDaily(userId, date, foodItem) {
    try {
      const dateKey = date || new Date().toISOString().split('T')[0];
      const nutritionRef = doc(db, 'users', userId, 'nutrition', dateKey);
      
      // Get current data
      const nutritionSnap = await getDoc(nutritionRef);
      let currentData = nutritionSnap.exists() ? nutritionSnap.data() : {
        foods: [],
        totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 }
      };
      
      // Add new food
      currentData.foods.push(foodItem);
      
      // Update totals
      currentData.totals.calories += foodItem.nutrition?.calories || 0;
      currentData.totals.protein += foodItem.nutrition?.protein || 0;
      currentData.totals.carbohydrates += foodItem.nutrition?.carbohydrates || 0;
      currentData.totals.fat += foodItem.nutrition?.fat || 0;
      currentData.totals.fiber += foodItem.nutrition?.fiber || 0;
      
      await setDoc(nutritionRef, {
        ...currentData,
        date: dateKey,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, data: currentData };
    } catch (error) {
      console.error('Error adding food to daily log:', error);
      throw error;
    }
  }

  /**
   * Remove food from daily log
   */
  async removeFoodFromDaily(userId, date, foodIndex) {
    try {
      const dateKey = date || new Date().toISOString().split('T')[0];
      const nutritionRef = doc(db, 'users', userId, 'nutrition', dateKey);
      
      // Get current data
      const nutritionSnap = await getDoc(nutritionRef);
      if (!nutritionSnap.exists()) {
        throw new Error('No nutrition data found for this date');
      }
      
      let currentData = nutritionSnap.data();
      
      // Get the food to remove
      const foodToRemove = currentData.foods[foodIndex];
      
      // Remove food
      currentData.foods.splice(foodIndex, 1);
      
      // Update totals
      currentData.totals.calories -= foodToRemove.nutrition?.calories || 0;
      currentData.totals.protein -= foodToRemove.nutrition?.protein || 0;
      currentData.totals.carbohydrates -= foodToRemove.nutrition?.carbohydrates || 0;
      currentData.totals.fat -= foodToRemove.nutrition?.fat || 0;
      currentData.totals.fiber -= foodToRemove.nutrition?.fiber || 0;
      
      await setDoc(nutritionRef, {
        ...currentData,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, data: currentData };
    } catch (error) {
      console.error('Error removing food from daily log:', error);
      throw error;
    }
  }

  // ==================== MEAL PLANS ====================
  
  /**
   * Save meal plan
   */
  async saveMealPlan(userId, mealPlan) {
    try {
      const planId = String(mealPlan.id || `plan_${Date.now()}`);
      const safeUserId = String(userId || '');
      const mealPlanRef = doc(db, 'users', safeUserId, 'mealPlans', planId);
      
      await setDoc(mealPlanRef, {
        ...mealPlan,
        id: planId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { success: true, id: planId };
    } catch (error) {
      console.error('Error saving meal plan:', error);
      throw error;
    }
  }

  /**
   * Get all meal plans
   */
  async getMealPlans(userId) {
    try {
      const mealPlansRef = collection(db, 'users', userId, 'mealPlans');
      const querySnapshot = await getDocs(mealPlansRef);
      
      const mealPlans = [];
      querySnapshot.forEach((doc) => {
        mealPlans.push({ id: doc.id, ...doc.data() });
      });
      
      return mealPlans;
    } catch (error) {
      console.error('Error getting meal plans:', error);
      throw error;
    }
  }

  /**
   * Delete meal plan
   */
  async deleteMealPlan(userId, planId) {
    try {
      const mealPlanRef = doc(db, 'users', userId, 'mealPlans', planId);
      await deleteDoc(mealPlanRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      throw error;
    }
  }

  // ==================== FOOD ANALYSIS HISTORY ====================
  
  /**
   * Save food analysis
   */
  async saveFoodAnalysis(userId, analysisData) {
    try {
      const analysisId = `analysis_${Date.now()}`;
      const analysisRef = doc(db, 'users', userId, 'foodAnalysis', analysisId);
      
      await setDoc(analysisRef, {
        ...analysisData,
        id: analysisId,
        createdAt: serverTimestamp()
      });
      
      return { success: true, id: analysisId };
    } catch (error) {
      console.error('Error saving food analysis:', error);
      throw error;
    }
  }

  /**
   * Get food analysis history
   */
  async getFoodAnalysisHistory(userId, limit = 20) {
    try {
      const analysisRef = collection(db, 'users', userId, 'foodAnalysis');
      const querySnapshot = await getDocs(analysisRef);
      
      const analyses = [];
      querySnapshot.forEach((doc) => {
        analyses.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by date (most recent first)
      analyses.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      return analyses.slice(0, limit);
    } catch (error) {
      console.error('Error getting food analysis history:', error);
      throw error;
    }
  }

  // ==================== AGENT SETTINGS ====================
  
  /**
   * Save voice assistant agent settings
   */
  async saveAgentSettings(userId, agentConfig) {
    try {
      const agentRef = doc(db, 'users', userId, 'settings', 'agent');
      await setDoc(agentRef, {
        ...agentConfig,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving agent settings:', error);
      throw error;
    }
  }

  /**
   * Get voice assistant agent settings
   */
  async getAgentSettings(userId) {
    try {
      const agentRef = doc(db, 'users', userId, 'settings', 'agent');
      const agentSnap = await getDoc(agentRef);
      
      if (agentSnap.exists()) {
        return agentSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting agent settings:', error);
      throw error;
    }
  }

  // ==================== GET ALL USER DATA ====================
  
  /**
   * Get all user data (for caching)
   */
  async getAllUserData(userId) {
    try {
      const [
        userProfile,
        healthProfile,
        todayNutrition,
        mealPlans,
        agentSettings
      ] = await Promise.all([
        this.getUserProfile(userId),
        this.getHealthProfile(userId),
        this.getDailyNutrition(userId),
        this.getMealPlans(userId),
        this.getAgentSettings(userId)
      ]);
      
      return {
        userProfile,
        healthProfile,
        todayNutrition,
        mealPlans,
        agentSettings,
        lastFetched: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting all user data:', error);
      throw error;
    }
  }
}

const firebaseService = new FirebaseService();
export default firebaseService;

// Export individual functions for easier imports
export const {
  saveUserProfile,
  getUserProfile,
  saveHealthProfile,
  getHealthProfile,
  saveDailyNutrition,
  getDailyNutrition,
  incrementCaloriesBurned,
  saveMealPlan,
  getMealPlans,
  saveFoodAnalysis,
  getFoodAnalysisHistory,
  saveAgentSettings,
  getAgentSettings,
  getAllUserData
} = firebaseService;
