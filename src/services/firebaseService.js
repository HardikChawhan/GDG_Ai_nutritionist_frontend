import { 
  collection, 
  collectionGroup,
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  getDocs,
  serverTimestamp,
  increment,
  query,
  where,
  orderBy,
  limit
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
        ...(nutritionData.water !== undefined && { water: nutritionData.water }),
        ...(nutritionData.sleep !== undefined && { sleep: nutritionData.sleep }),
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

  // ==================== REVIEWS ====================

  /**
   * Save user review
   */
  async saveReview(userId, rating, text) {
    try {
      // Fetch user profile data to embed into the review
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      // Store in subcollection so it inherits user's permissions securely
      const reviewRef = doc(db, 'users', userId, 'reviews', 'appReview');
      await setDoc(reviewRef, {
        userId,
        rating,
        text,
        priority: 0,
        displayName: userData.displayName || 'Anonymous User',
        photoURL: userData.photoURL || null,
        createdAt: serverTimestamp()
      });
      
      // Update user document to mark review as complete
      await setDoc(userRef, { hasReviewed: true }, { merge: true });
      
      return { success: true };
    } catch (error) {
      console.error('Error saving review:', error);
      throw error;
    }
  }

  /**
   * Defer review prompt
   */
  async deferReview(userId) {
    try {
       const userRef = doc(db, 'users', userId);
       await setDoc(userRef, { lastReviewDeferredAt: serverTimestamp() }, { merge: true });
       return { success: true };
    } catch (error) {
      console.error('Error deferring review:', error);
      throw error;
    }
  }

  /**
   * Check if user should see review prompt
   */
  async shouldShowReviewPrompt(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return true;
      
      const data = userSnap.data();
      if (data.hasReviewed) return false;
      
      if (data.lastReviewDeferredAt) {
         // Check if deferred within the last 24 hours
         const deferredDate = data.lastReviewDeferredAt.toDate();
         const now = new Date();
         const msInDay = 24 * 60 * 60 * 1000;
         
         const isSameDayOrFuture = (now - deferredDate) < msInDay;
         if (isSameDayOrFuture) return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking review status:', error);
      return false; // Safest default is to not bug the user if backend flakes
    }
  }

  /**
   * Get highlighted reviews for landing page
   */
  async getHighlightedReviews() {
    try {
      // Use collectionGroup to query 'reviews' subcollections across all users
      const q = query(collectionGroup(db, 'reviews'), where('priority', '==', 1));
      const querySnapshot = await getDocs(q);
      
      const reviews = [];
      querySnapshot.forEach((docSnap) => {
         reviews.push({ id: docSnap.id, ...docSnap.data() });
      });
      return reviews;
    } catch (error) {
      console.error('Error getting highlighted reviews:', error);
      return [];
    }
  }

  /**
   * Get all reviews for admin panel and landing page
   */
  async getAllReviews() {
    try {
      const q = collectionGroup(db, 'reviews');
      const querySnapshot = await getDocs(q);
      
      const reviews = [];
      querySnapshot.forEach((docSnap) => {
         reviews.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by newest first
      return reviews.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    } catch (error) {
      console.error('Error getting all reviews:', error);
      return [];
    }
  }

  /**
   * Update review priority (Admin)
   */
  async updateReviewPriority(userId, priority) {
    try {
      const reviewRef = doc(db, 'users', userId, 'reviews', 'appReview');
      await setDoc(reviewRef, { priority }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error updating priority:', error);
      throw error;
    }
  }

  // ==================== SUGGESTIONS ====================
  
  /**
   * Get all suggestions (Admin)
   */
  async getAllSuggestions() {
    try {
      const q = collectionGroup(db, 'suggestions');
      const querySnapshot = await getDocs(q);
      const suggestions = [];
      querySnapshot.forEach((docSnap) => {
         suggestions.push({ id: docSnap.id, ...docSnap.data() });
      });
      return suggestions.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }
  /**
   * Save user suggestion (enforces 5 max inline)
   */
  async saveSuggestion(userId, name, text) {
    try {
      // Direct count inside the function to avoid `this` context loss on destructuring exports
      const q = collection(db, 'users', userId, 'suggestions');
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.size >= 5) {
         throw new Error('Suggestion limit reached. You can only submit up to 5 suggestions.');
      }
      
      const suggestionRef = doc(collection(db, 'users', userId, 'suggestions'));
      await setDoc(suggestionRef, {
        userId,
        name: name || 'Anonymous',
        text,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving suggestion:', error);
      throw error;
    }
  }

  /**
   * Get count of user's suggestions directly (optional helper)
   */
  async getUserSuggestionCount(userId) {
     try {
       const q = collection(db, 'users', userId, 'suggestions');
       const querySnapshot = await getDocs(q);
       return querySnapshot.size;
     } catch (error) {
       throw error;
     }
  }

  /**
   * Verify Admin Passcode Securely
   */
  async verifyAdminPasscode(inputPassword) {
    try {
      const docRef = doc(db, 'admin', 'config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.passcode === inputPassword;
      }
      return false;
    } catch (error) {
      console.error('Error verifying admin passcode:', error);
      return false;
    }
  }
  /**
   * Record a daily visit and update streak
   */
  async recordDailyVisit(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return { success: false };
      
      const userData = userSnap.data();
      const now = new Date();
      // Use local date string YYYY-MM-DD for consistency
      const todayStr = now.toISOString().split('T')[0];
      
      const lastVisitDate = userData.lastVisitDate || '';
      let currentStreak = userData.currentStreak || 0;
      let longestStreak = userData.longestStreak || 0;
      
      if (lastVisitDate === todayStr) {
        // Already visited today
        return { success: true, alreadyVisited: true };
      }
      
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastVisitDate === yesterdayStr) {
        // Consecutive visit
        currentStreak += 1;
      } else {
        // Gap or first visit
        currentStreak = 1;
      }
      
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
      
      await setDoc(userRef, {
        lastVisitDate: todayStr,
        currentStreak,
        longestStreak,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      return { success: true, currentStreak, longestStreak };
    } catch (error) {
      console.error('Error recording daily visit:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(limitCount = 20) {
    try {
      const usersRef = collection(db, 'users');
      // Query users who have at least 1 streak, sorted by current streak then longest
      const q = query(
        usersRef, 
        where('currentStreak', '>', 0),
        orderBy('currentStreak', 'desc'),
        orderBy('longestStreak', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const leaderboard = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leaderboard.push({
          userId: doc.id,
          displayName: data.displayName || 'Anonymous',
          photoURL: data.photoURL || null,
          currentStreak: data.currentStreak || 0,
          longestStreak: data.longestStreak || 0
        });
      });
      
      return leaderboard;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      // Fallback for indexing issues or empty data
      return [];
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
  getAllUserData,
  saveReview,
  deferReview,
  shouldShowReviewPrompt,
  getHighlightedReviews,
  saveSuggestion,
  getUserSuggestionCount,
  getAllReviews,
  updateReviewPriority,
  getAllSuggestions,
  verifyAdminPasscode,
  recordDailyVisit,
  getLeaderboard
} = firebaseService;
