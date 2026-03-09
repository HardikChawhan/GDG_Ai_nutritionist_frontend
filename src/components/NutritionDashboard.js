import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Beef, Wheat, Droplets, Target, Activity, 
  Calendar as CalendarIcon, Plus, Search, Trash2,
  AlertTriangle, RotateCcw, Utensils, Zap, CheckCircle2
} from 'lucide-react';

import { nutritionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import NutritionCalendar from './NutritionCalendar';
import { cn } from '../utils/cn';

const getCaloriesBurnedFromCookie = (date) => {
  const dateKey = date || new Date().toISOString().split('T')[0];
  const cookieKey = `caloriesBurned_${dateKey}`;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${cookieKey}=`);
  if (parts.length === 2) {
    return parseInt(parts.pop().split(';').shift()) || 0;
  }
  return 0;
};

function NutritionDashboard() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [dailyFoods, setDailyFoods] = useState([]);
  const [foodInput, setFoodInput] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [currentNutrition, setCurrentNutrition] = useState({ calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [agentSettings, setAgentSettings] = useState(null);
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadDailyFoods = async () => {
      try {
        const todayKey = getTodayKey();
        if (currentUser) {
          try {
            const nutritionData = await firebaseService.getDailyNutrition(currentUser.uid, todayKey);
            if (nutritionData) {
              setDailyFoods(nutritionData.foods || []);
              setCurrentNutrition(nutritionData.totals || { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });
              setCaloriesBurned(getCaloriesBurnedFromCookie(todayKey));
            } else {
              loadFromLocalStorage(todayKey);
            }
          } catch (error) {
            loadFromLocalStorage(todayKey);
          }
          
          try {
            const agent = await firebaseService.getAgentSettings(currentUser.uid);
            setAgentSettings(agent);
          } catch (error) {}
        } else {
          loadFromLocalStorage(todayKey);
        }
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
        setCurrentNutrition(data.totals || { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });
      }
      setCaloriesBurned(getCaloriesBurnedFromCookie(todayKey));
    } catch (error) {}
  };

  useEffect(() => {
    if (isInitialLoad) return;

    const saveData = async () => {
      try {
        const todayKey = getTodayKey();
        const dataToSave = { foods: dailyFoods, totals: currentNutrition, lastUpdated: new Date().toISOString() };
        localStorage.setItem(`dailyFoods_${todayKey}`, JSON.stringify(dataToSave));
        if (currentUser) {
          await firebaseService.saveDailyNutrition(currentUser.uid, todayKey, dataToSave);
        }
      } catch (error) {}
    };
    saveData();
  }, [dailyFoods, currentNutrition, isInitialLoad, currentUser]);

  const fetchRecommendations = async () => {
    if (!userProfile) return;
    try {
      const response = await nutritionAPI.getRecommendations(userProfile);
      setRecommendations(response.data.data);
    } catch (error) {}
  };

  useEffect(() => {
    if (userProfile) fetchRecommendations();
  }, [userProfile]);

  useEffect(() => {
    const handleVoiceFoodLog = (event) => {
      const foodData = event.detail;
      const newFood = {
        name: foodData.food,
        calories: parseFloat(foodData.calories) || 0,
        protein: parseFloat(foodData.protein) || 0,
        carbohydrates: parseFloat(foodData.carbs) || 0,
        fat: parseFloat(foodData.fat) || 0,
        serving: foodData.serving || '1 serving',
        timestamp: new Date().toISOString()
      };

      setDailyFoods(prev => [...prev, newFood]);
      setCurrentNutrition(prev => {
        const updated = {
          calories: (prev.calories || 0) + newFood.calories,
          protein: (prev.protein || 0) + newFood.protein,
          carbohydrates: (prev.carbohydrates || 0) + newFood.carbohydrates,
          fat: (prev.fat || 0) + newFood.fat,
          fiber: prev.fiber || 0
        };
        checkMacroLimits(updated);
        return updated;
      });
      setIsInitialLoad(false);
    };

    window.addEventListener('voice-food-log', handleVoiceFoodLog);
    return () => window.removeEventListener('voice-food-log', handleVoiceFoodLog);
  }, [recommendations]);

  const searchAndAddFood = async (foodName) => {
    setIsSearching(true);
    try {
      const response = await nutritionAPI.searchFoods(foodName, 1);
      if (response.data.data && response.data.data.length > 0) {
        const foodData = response.data.data[0];
        const nutrients = foodData.nutrients || {};
        
        const extractNutrient = (name) => nutrients[name]?.amount || 0;
        
        const foodEntry = {
          name: foodName,
          fdcId: foodData.fdcId,
          description: foodData.description,
          nutrition: {
            calories: Math.round(extractNutrient('Energy')),
            protein: Math.round(extractNutrient('Protein') * 10) / 10,
            carbohydrates: Math.round(extractNutrient('Carbohydrate, by difference') * 10) / 10,
            fat: Math.round(extractNutrient('Total lipid (fat)') * 10) / 10,
            fiber: Math.round(extractNutrient('Fiber, total dietary') * 10) / 10
          }
        };

        setDailyFoods([...dailyFoods, foodEntry]);
        setCurrentNutrition(prev => {
          const updated = {
            calories: prev.calories + foodEntry.nutrition.calories,
            protein: Math.round((prev.protein + foodEntry.nutrition.protein) * 10) / 10,
            carbohydrates: Math.round((prev.carbohydrates + foodEntry.nutrition.carbohydrates) * 10) / 10,
            fat: Math.round((prev.fat + foodEntry.nutrition.fat) * 10) / 10,
            fiber: Math.round((prev.fiber + foodEntry.nutrition.fiber) * 10) / 10
          };
          checkMacroLimits(updated);
          return updated;
        });
      } else {
        alert(`Entry "${foodName}" not located in clinical database.`);
      }
    } catch (error) {
      alert('Network issue communicating with USDA database.');
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
    setDailyFoods(dailyFoods.filter((_, i) => i !== index));
    
    setCurrentNutrition(prev => ({
      calories: Math.max(0, prev.calories - (foodToRemove.calories || foodToRemove.nutrition?.calories || 0)),
      protein: Math.max(0, Math.round((prev.protein - (foodToRemove.protein || foodToRemove.nutrition?.protein || 0)) * 10) / 10),
      carbohydrates: Math.max(0, Math.round((prev.carbohydrates - (foodToRemove.carbohydrates || foodToRemove.nutrition?.carbohydrates || 0)) * 10) / 10),
      fat: Math.max(0, Math.round((prev.fat - (foodToRemove.fat || foodToRemove.nutrition?.fat || 0)) * 10) / 10),
      fiber: Math.max(0, Math.round((prev.fiber - (foodToRemove.fiber || foodToRemove.nutrition?.fiber || 0)) * 10) / 10)
    }));
    setIsInitialLoad(false);
  };

  const resetDay = () => {
    setDailyFoods([]);
    setCurrentNutrition({ calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });
    try { localStorage.removeItem(`dailyFoods_${getTodayKey()}`); } catch (e) {}
  };

  const checkMacroLimits = (nutrition) => {
    if (!recommendations) return;
    
    const warnings = [];
    const targetCals = recommendations.targetCalories || 2000;
    const { protein: targetProtein = 150, carbohydrates: targetCarbs = 200, fat: targetFat = 65 } = recommendations.macros || {};
    
    if (nutrition.calories > targetCals * 1.1) warnings.push(`Energy threshold exceeded by ${Math.round(nutrition.calories - targetCals)} kcal`);
    if (nutrition.protein > targetProtein * 1.2) warnings.push(`Protein threshold exceeded by ${Math.round(nutrition.protein - targetProtein)}g`);
    if (nutrition.carbohydrates > targetCarbs * 1.2) warnings.push(`Carbohydrate threshold exceeded by ${Math.round(nutrition.carbohydrates - targetCarbs)}g`);
    if (nutrition.fat > targetFat * 1.2) warnings.push(`Lipid threshold exceeded by ${Math.round(nutrition.fat - targetFat)}g`);
    
    if (warnings.length > 0) {
      setWarningMessage(warnings.join(' • '));
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
    }
  };

  const getProgressPercentage = (current, target) => !target ? 0 : Math.min((current / target) * 100, 100);

  if (!userProfile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel max-w-lg w-full p-8 text-center text-foreground">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
             <Activity className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-heading font-semibold mb-3">Clinical Profile Required</h2>
          <p className="text-muted mb-8">Baseline biometrics are required before accessing the nutrition intelligence dashboard.</p>
          <button onClick={() => navigate('/profile')} className="w-full bg-accent hover:bg-accent/90 text-background font-semibold py-3 rounded-xl transition-all">Initialize Profile</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      
      <AnimatePresence>
        {showWarning && (
           <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className="fixed top-24 left-1/2 z-50 flex items-center gap-3 px-6 py-4 bg-red-500/90 backdrop-blur-md text-white rounded-xl shadow-2xl border border-red-400">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <h4 className="font-semibold text-sm">Target Threshold Exceeded</h4>
                <p className="text-xs text-foreground/90 font-mono mt-0.5">{warningMessage}</p>
              </div>
              <button onClick={() => setShowWarning(false)} className="ml-4 p-1 hover:bg-foreground/20 rounded-md transition-colors"><Trash2 className="w-4 h-4"/></button>
           </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-heading font-bold mb-2 tracking-tight">Daily Nutrition</h1>
          <p className="text-muted">Monitor and align your intake with computed targets.</p>
        </div>
        <button onClick={() => setShowCalendar(true)} className="flex items-center gap-2 px-4 py-2 border border-border/10 hover:bg-foreground/5 bg-surface/30 rounded-xl transition-colors text-sm font-medium">
          <CalendarIcon className="w-4 h-4" /> History
        </button>
      </div>

      <AnimatePresence>
        {showCalendar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
             <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-panel w-full max-w-3xl flex flex-col max-h-[90vh]">
               <div className="flex items-center justify-between p-5 border-b border-border/5">
                 <h3 className="font-heading font-semibold text-lg flex items-center gap-2"><CalendarIcon className="w-5 h-5"/> Historical Records</h3>
                 <button onClick={() => setShowCalendar(false)} className="p-1 text-muted hover:text-foreground"><Trash2 className="w-4 h-4"/></button>
               </div>
               <div className="p-6 overflow-y-auto">
                 <NutritionCalendar />
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Col: Macros & Stats */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Macro Row */}
          {recommendations && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Energy', icon: Flame, current: currentNutrition.calories, target: recommendations.targetCalories, unit: 'kcal', color: 'bg-accent' },
                { label: 'Protein', icon: Beef, current: currentNutrition.protein, target: recommendations.macros.protein, unit: 'g', color: 'bg-blue-400' },
                { label: 'Carbs', icon: Wheat, current: currentNutrition.carbohydrates, target: recommendations.macros.carbohydrates, unit: 'g', color: 'bg-orange-400' },
                { label: 'Lipids', icon: Droplets, current: currentNutrition.fat, target: recommendations.macros.fat, unit: 'g', color: 'bg-yellow-400' }
              ].map((m, idx) => (
                <div key={idx} className="glass-panel p-5 relative overflow-hidden group">
                   <div className="flex justify-between items-start mb-4">
                     <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border/5">
                        <m.icon className="w-4 h-4 text-muted group-hover:text-foreground transition-colors" />
                     </div>
                   </div>
                   <div className="mb-4">
                     <div className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">{m.label}</div>
                     <div className="flex items-baseline gap-1.5 font-mono">
                        <span className="text-2xl font-bold text-foreground">{m.current}</span>
                        <span className="text-sm text-muted">/ {m.target}{m.unit}</span>
                     </div>
                   </div>
                   <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${getProgressPercentage(m.current, m.target)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={cn("h-full", m.color, getProgressPercentage(m.current, m.target) >= 100 ? "bg-red-500" : "")}
                      />
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Add Form Section */}
          <div className="glass-panel flex-col p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/5 bg-surface/30">
               <div>
                  <h2 className="font-heading font-semibold flex items-center gap-2"><Utensils className="w-4 h-4 text-accent"/> Dietary Intake Log</h2>
               </div>
               {dailyFoods.length > 0 && (
                <button onClick={resetDay} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Initialize Zero
                </button>
               )}
            </div>
            
            <div className="p-6">
               <div className="flex gap-3 mb-6">
                 <div className="relative flex-1">
                   <Search className="absolute left-4 top-[14px] w-5 h-5 text-muted" />
                   <input
                     type="text"
                     value={foodInput}
                     onChange={(e) => setFoodInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && !isSearching && addFood()}
                     disabled={isSearching}
                     className="w-full pl-12 pr-4 py-3 bg-surface border border-border/10 rounded-xl focus:ring-1 focus:ring-accent focus:border-accent text-sm transition-all text-foreground placeholder-white/20"
                     placeholder="Query database for items (e.g. 200g grilled salmon)"
                   />
                 </div>
                 <button onClick={addFood} disabled={isSearching || !foodInput.trim()} className="px-6 rounded-xl bg-accent text-background font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2">
                   {isSearching ? <Activity className="w-4 h-4 animate-spin"/> : <Plus className="w-5 h-5" />}
                   <span className="hidden sm:inline">Append</span>
                 </button>
               </div>

               {dailyFoods.length > 0 ? (
                 <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                   {[...dailyFoods].reverse().map((food, reversedIndex) => {
                     const idx = dailyFoods.length - 1 - reversedIndex;
                     return (
                       <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={idx} className="flex items-center justify-between p-4 rounded-xl border border-border/5 bg-surface/20 hover:bg-surface/50 transition-colors group">
                          <div>
                            <div className="font-medium text-sm text-foreground mb-1 capitalize">{food.description || food.name}</div>
                            <div className="flex items-center gap-3 text-xs text-muted font-mono">
                               <span>{food.calories || food.nutrition?.calories || 0}kcal</span>
                               <span className="w-1 h-1 rounded-full bg-foreground/10" />
                               <span>{food.protein || food.nutrition?.protein || 0}g Pro</span>
                               <span className="w-1 h-1 rounded-full bg-foreground/10" />
                               <span>{food.carbohydrates || food.nutrition?.carbohydrates || 0}g Carb</span>
                               <span className="w-1 h-1 rounded-full bg-foreground/10" />
                               <span>{food.fat || food.nutrition?.fat || 0}g Fat</span>
                            </div>
                          </div>
                          <button onClick={() => removeFood(idx)} className="p-2 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </motion.div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="py-12 text-center text-muted flex flex-col items-center">
                   <div className="w-12 h-12 rounded-full border border-dashed border-border/20 flex items-center justify-center mb-3">
                     <Target className="w-5 h-5 opacity-50" />
                   </div>
                   <p className="text-sm">Database query ready. Awaiting dietary input.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
        
        {/* Right Col: Secondary Info */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="glass-panel p-6 bg-gradient-to-b from-surface/50 to-background/50">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                 <Zap className="w-4 h-4 text-orange-400" />
               </div>
               <h3 className="font-heading font-semibold">Expenditure Model</h3>
             </div>
             
             <div className="flex flex-col items-center justify-center py-4 mb-6 relative">
               <div className="w-40 h-40 rounded-full border-4 border-surface flex flex-col items-center justify-center relative overflow-hidden">
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-500/20 to-transparent" style={{ height: `${Math.min((caloriesBurned/1000)*100, 100)}%` }} />
                 <span className="text-4xl font-bold font-mono text-foreground relative z-10 tracking-tighter">{caloriesBurned}</span>
                 <span className="text-xs uppercase tracking-widest text-muted relative z-10 mt-1">kcal Out</span>
               </div>
             </div>

             <button onClick={() => navigate('/workout')} className="w-full flex items-center justify-center gap-2 py-3 border border-border/10 rounded-xl font-medium text-sm hover:bg-foreground/5 transition-colors">
               Launch Activity Protocol <Plus className="w-4 h-4"/>
             </button>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Diagnostics Sync</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/5">
                <div className="flex items-center gap-2 text-sm"><Target className="w-4 h-4 text-muted"/> Current Objective</div>
                <div className="text-sm font-mono capitalize">{userProfile.goal?.replace('_', ' ')}</div>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/5">
                <div className="flex items-center gap-2 text-sm"><Activity className="w-4 h-4 text-muted"/> Base Multiplier</div>
                <div className="text-sm font-mono capitalize">{userProfile.activityLevel?.replace('_', ' ')}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-accent"/> Intelligence Model</div>
                <div className="text-sm font-mono text-accent">Active</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default NutritionDashboard;
