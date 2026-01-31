import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import cookieService from '../services/cookieService';
import firebaseService from '../services/firebaseService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data from cache on mount
  useEffect(() => {
    const cachedUser = cookieService.getUserInfo();
    const cachedProfile = cookieService.getHealthProfile();
    
    if (cachedUser) {
      setCurrentUser(cachedUser);
    }
    if (cachedProfile) {
      setUserProfile(cachedProfile);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError(null);

      if (user) {
        // User is signed in
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        };

        setCurrentUser(userData);
        
        // Store in cookies
        cookieService.setUserInfo(userData);
        
        // Get or create user profile in Firebase
        try {
          await firebaseService.saveUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastLogin: new Date().toISOString()
          });

          // Fetch all user data and cache it
          const allData = await firebaseService.getAllUserData(user.uid);
          
          if (allData.healthProfile) {
            setUserProfile(allData.healthProfile);
            cookieService.setHealthProfile(allData.healthProfile);
          }
          
          // Cache other data
          if (allData.mealPlans) {
            cookieService.setMealPlans(allData.mealPlans);
          }
          
          if (allData.todayNutrition) {
            cookieService.setDailyNutrition(allData.todayNutrition);
          }
          
          // Store consolidated user data
          cookieService.setUserData(allData);
          
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError(err.message);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setUserProfile(null);
        cookieService.clearAll();
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Set persistence to LOCAL (survives browser restarts)
      await setPersistence(auth, browserLocalPersistence);
      
      // For iOS Safari compatibility - clear any stale state
      try {
        sessionStorage.removeItem('firebase:previous_websocket_failure');
        sessionStorage.removeItem('firebase:authUser');
      } catch (storageError) {
        console.log('SessionStorage not accessible:', storageError);
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      
      return result.user;
    } catch (err) {
      console.error('Error signing in with Google:', err);
      
      // Provide iOS-specific error guidance
      if (err.code === 'auth/operation-not-allowed' || 
          err.message?.includes('sessionStorage')) {
        setError('Please enable cookies and disable private browsing mode in your browser settings.');
      } else {
        setError(err.message);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      cookieService.clearAll();
      localStorage.clear();
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update user profile (health profile)
  const updateProfile = async (profileData) => {
    try {
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      setError(null);
      
      // Save to Firebase
      await firebaseService.saveHealthProfile(currentUser.uid, profileData);
      
      // Update local state
      setUserProfile(profileData);
      
      // Update cache
      cookieService.setHealthProfile(profileData);
      
      return { success: true };
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
      throw err;
    }
  };

  // Refresh user data from Firebase
  const refreshUserData = async () => {
    try {
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      setError(null);
      setLoading(true);
      
      const allData = await firebaseService.getAllUserData(currentUser.uid);
      
      if (allData.healthProfile) {
        setUserProfile(allData.healthProfile);
        cookieService.setHealthProfile(allData.healthProfile);
      }
      
      if (allData.mealPlans) {
        cookieService.setMealPlans(allData.mealPlans);
      }
      
      if (allData.todayNutrition) {
        cookieService.setDailyNutrition(allData.todayNutrition);
      }
      
      cookieService.setUserData(allData);
      
      return allData;
    } catch (err) {
      console.error('Error refreshing user data:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    signInWithGoogle,
    logout,
    updateProfile,
    refreshUserData,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
