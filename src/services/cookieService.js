import Cookies from 'js-cookie';

// Cookie expiration time (7 days)
const COOKIE_EXPIRY = 7;

/**
 * Cookie Management Service
 * Handles all cookie operations for caching user data
 */
class CookieService {
  // Auth token cookie
  setAuthToken(token) {
    Cookies.set('auth_token', token, { expires: COOKIE_EXPIRY });
  }

  getAuthToken() {
    return Cookies.get('auth_token');
  }

  removeAuthToken() {
    Cookies.remove('auth_token');
  }

  // User info cookie
  setUserInfo(user) {
    Cookies.set('user_info', JSON.stringify(user), { expires: COOKIE_EXPIRY });
  }

  getUserInfo() {
    const userInfo = Cookies.get('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  removeUserInfo() {
    Cookies.remove('user_info');
  }

  // Health profile cookie
  setHealthProfile(profile) {
    Cookies.set('health_profile', JSON.stringify(profile), { expires: COOKIE_EXPIRY });
  }

  getHealthProfile() {
    const profile = Cookies.get('health_profile');
    return profile ? JSON.parse(profile) : null;
  }

  removeHealthProfile() {
    Cookies.remove('health_profile');
  }

  // Daily nutrition data
  setDailyNutrition(data) {
    const today = new Date().toISOString().split('T')[0];
    Cookies.set(`nutrition_${today}`, JSON.stringify(data), { expires: 1 }); // Expires in 1 day
  }

  getDailyNutrition() {
    const today = new Date().toISOString().split('T')[0];
    const data = Cookies.get(`nutrition_${today}`);
    return data ? JSON.parse(data) : null;
  }

  // Meal plans cache
  setMealPlans(plans) {
    Cookies.set('meal_plans', JSON.stringify(plans), { expires: COOKIE_EXPIRY });
  }

  getMealPlans() {
    const plans = Cookies.get('meal_plans');
    return plans ? JSON.parse(plans) : null;
  }

  removeMealPlans() {
    Cookies.remove('meal_plans');
  }

  // User data cache (consolidated)
  setUserData(data) {
    Cookies.set('user_data_cache', JSON.stringify(data), { expires: COOKIE_EXPIRY });
  }

  getUserData() {
    const data = Cookies.get('user_data_cache');
    return data ? JSON.parse(data) : null;
  }

  removeUserData() {
    Cookies.remove('user_data_cache');
  }

  // Clear all cookies
  clearAll() {
    this.removeAuthToken();
    this.removeUserInfo();
    this.removeHealthProfile();
    this.removeMealPlans();
    this.removeUserData();
    
    // Clear all nutrition data
    const allCookies = Cookies.get();
    Object.keys(allCookies).forEach(cookieName => {
      if (cookieName.startsWith('nutrition_')) {
        Cookies.remove(cookieName);
      }
    });
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getAuthToken();
  }
}

const cookieService = new CookieService();
export default cookieService;
