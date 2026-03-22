import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Beef, Wheat, Droplets, Target, Activity, 
  Calendar as CalendarIcon, Plus, Trash2,
  AlertTriangle, RotateCcw, Zap, CheckCircle2, Settings, X, Mic, BrainCircuit, Moon
} from 'lucide-react';

import { nutritionAPI, voiceAssistantAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import NutritionCalendar from './NutritionCalendar';
import { cn } from '../utils/cn';
import SEO from './SEO';

// ─── Helper ──────────────────────────────────────────────────────────────────
function calcDailyWaterGoal(profile) {
  if (!profile) return 2500;
  const weight = parseFloat(profile.weight) || 70;
  const activityMap = { sedentary: 0, lightly_active: 300, moderately_active: 500, very_active: 700, extra_active: 900 };
  const extra = activityMap[profile.activityLevel] || 0;
  return Math.round(weight * 35 + extra);
}

function calcSleepCalories(profile, hours) {
  if (!profile || !hours) return 0;
  const weight = parseFloat(profile.weight) || 70;
  const height = parseFloat(profile.height) || 170;
  const age = parseFloat(profile.age) || 30;
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  return Math.round((bmr / 24) * hours);
}

function isSleepAllowed() {
  const h = new Date().getHours();
  return h >= 8; // allowed 8:00 AM to 11:59 PM
}

// ─── Component ───────────────────────────────────────────────────────────────
function NutritionDashboard() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // Core nutrition state
  const [dailyFoods, setDailyFoods]       = useState([]);
  const [foodInput, setFoodInput]         = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [currentNutrition, setCurrentNutrition] = useState({ calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });

  // New tracking state
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [waterDrank, setWaterDrank]         = useState(0); // ml
  const [sleepHours, setSleepHours]         = useState(0);

  // UI input state
  const [customWaterInput, setCustomWaterInput]     = useState('');
  const [customCaloriesInput, setCustomCaloriesInput] = useState('');
  const [customSleepInput, setCustomSleepInput]     = useState('');

  // App state
  const [isSearching, setIsSearching]         = useState(false);
  const [agentSettings, setAgentSettings]     = useState(null);
  const [showCalendar, setShowCalendar]       = useState(false);
  const [showWarning, setShowWarning]         = useState(false);
  const [warningMessage, setWarningMessage]   = useState('');
  const [showAgentSettings, setShowAgentSettings] = useState(false);
  const [agentName, setAgentName]             = useState('');
  const [selectedVoice, setSelectedVoice]     = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);

  // Guard: never save until Firebase load is complete
  const dataLoadedRef = useRef(false);

  // ── Voices for TTS ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => setAvailableVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  // ── Date key helper ─────────────────────────────────────────────────────────
  const getTodayKey = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  };

  // ── Direct Firebase save (called after every user action) ───────────────────
  const saveToFirebase = async (foods, nutrition, water, sleep, calories) => {
    if (!dataLoadedRef.current) return; // safety: never save before first load
    if (!currentUser) return;
    try {
      await firebaseService.saveDailyNutrition(currentUser.uid, getTodayKey(), {
        foods,
        totals: nutrition,
        water,
        sleep,
        caloriesBurned: calories,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error('Firebase save error:', err);
    }
  };

  // ── Load from Firebase on login/user change ─────────────────────────────────
  useEffect(() => {
    const load = async () => {
      // Block saves while loading
      dataLoadedRef.current = false;

      // Reset everything to zero first (prevents stale data from previous user)
      setDailyFoods([]);
      setCurrentNutrition({ calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });
      setCaloriesBurned(0);
      setWaterDrank(0);
      setSleepHours(0);

      // Nuke any leftover localStorage keys to prevent cross-user bleed
      try {
        Object.keys(localStorage).filter(k => k.startsWith('dailyFoods_')).forEach(k => localStorage.removeItem(k));
      } catch (_) {}

      if (!currentUser) { dataLoadedRef.current = true; return; }

      try {
        const data = await firebaseService.getDailyNutrition(currentUser.uid, getTodayKey());
        if (data) {
          setDailyFoods(data.foods || []);
          setCurrentNutrition(data.totals || { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 });
          setCaloriesBurned(data.caloriesBurned || 0);
          setWaterDrank(data.water || 0);
          setSleepHours(data.sleep || 0);
        }
        try {
          const agent = await firebaseService.getAgentSettings(currentUser.uid);
          if (agent) { setAgentSettings(agent); setAgentName(agent.name || 'Ronnie'); setSelectedVoice(agent.voice || ''); }
        } catch (_) {}
      } catch (err) {
        console.error('Firebase load error:', err);
      } finally {
        // Unlock saves AFTER all state is populated
        dataLoadedRef.current = true;
      }
    };
    load();
  }, [currentUser]);

  // ── Recommendations ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile) return;
    nutritionAPI.getRecommendations(userProfile).then(r => setRecommendations(r.data.data)).catch(() => {});
  }, [userProfile]);

  // ── Voice event listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const onFoodLog = (e) => {
      const f = e.detail;
      const newFood = {
        name: f.food, calories: +f.calories||0, protein: +f.protein||0,
        carbohydrates: +f.carbs||0, fat: +f.fat||0,
        serving: f.serving || '1 serving', timestamp: new Date().toISOString()
      };
      setDailyFoods(prev => {
        const newFoods = [...prev, newFood];
        setCurrentNutrition(prevN => {
          const updated = {
            calories: (prevN.calories||0) + newFood.calories,
            protein: (prevN.protein||0) + newFood.protein,
            carbohydrates: (prevN.carbohydrates||0) + newFood.carbohydrates,
            fat: (prevN.fat||0) + newFood.fat,
            fiber: prevN.fiber||0
          };
          checkMacroLimits(updated);
          saveToFirebase(newFoods, updated, waterDrank, sleepHours, caloriesBurned);
          return updated;
        });
        return newFoods;
      });
    };

    const onWaterLog = (e) => {
      const ml = e.detail.amountMl;
      setWaterDrank(prev => {
        const n = prev + ml;
        saveToFirebase(dailyFoods, currentNutrition, n, sleepHours, caloriesBurned);
        return n;
      });
    };

    const onWorkoutLog = (e) => {
      const added = Math.round(e.detail.caloriesBurned || 0);
      if (added <= 0) return;
      setCaloriesBurned(prev => {
        const n = prev + added;
        saveToFirebase(dailyFoods, currentNutrition, waterDrank, sleepHours, n);
        return n;
      });
    };

    const onSleepLog = (e) => {
      if (!isSleepAllowed()) {
        alert('Sleep logging is only available from 8:00\u202FAM to 11:59\u202FPM.');
        return;
      }
      const hrs = e.detail.hours;
      setSleepHours(hrs);
      const sleepCals = calcSleepCalories(userProfile, hrs);
      setCaloriesBurned(prev => {
        const n = prev + sleepCals;
        saveToFirebase(dailyFoods, currentNutrition, waterDrank, hrs, n);
        return n;
      });
    };

    window.addEventListener('voice-food-log',    onFoodLog);
    window.addEventListener('voice-water-log',   onWaterLog);
    window.addEventListener('voice-workout-log', onWorkoutLog);
    window.addEventListener('voice-sleep-log',   onSleepLog);
    return () => {
      window.removeEventListener('voice-food-log',    onFoodLog);
      window.removeEventListener('voice-water-log',   onWaterLog);
      window.removeEventListener('voice-workout-log', onWorkoutLog);
      window.removeEventListener('voice-sleep-log',   onSleepLog);
    };
  }, [dailyFoods, currentNutrition, waterDrank, sleepHours, caloriesBurned, userProfile]);

  // ── Food handlers ───────────────────────────────────────────────────────────
  const searchAndAddFood = async (foodName) => {
    setIsSearching(true);
    try {
      const response = await voiceAssistantAPI.processCommand({
        prompt: `User Command: "${foodName}"\nIntent: nutrition_log\n(Nutrition data will be fetched automatically)`,
        agentName: agentSettings?.name || 'Assistant',
        intent: 'nutrition_log',
        payload: { intent: 'nutrition_log', foods: [foodName], command: foodName, userContext: { healthProfile: userProfile } }
      });
      const ai = response.data;
      if (ai?.data?.totals) {
        const t = ai.data.totals;
        const displayName = ai.data.foods?.[0]?.name || foodName;
        const entry = {
          name: displayName, description: displayName,
          nutrition: {
            calories: Math.round(t.calories)||0,
            protein:  Math.round(t.protein*10)/10||0,
            carbohydrates: Math.round(t.carbs*10)/10||0,
            fat:   Math.round(t.fat*10)/10||0,
            fiber: Math.round((t.fiber||0)*10)/10
          }
        };
        const newFoods = [...dailyFoods, entry];
        setDailyFoods(newFoods);
        setCurrentNutrition(prev => {
          const updated = {
            calories: prev.calories + entry.nutrition.calories,
            protein: Math.round((prev.protein + entry.nutrition.protein)*10)/10,
            carbohydrates: Math.round((prev.carbohydrates + entry.nutrition.carbohydrates)*10)/10,
            fat: Math.round((prev.fat + entry.nutrition.fat)*10)/10,
            fiber: Math.round((prev.fiber + entry.nutrition.fiber)*10)/10
          };
          checkMacroLimits(updated);
          saveToFirebase(newFoods, updated, waterDrank, sleepHours, caloriesBurned);
          return updated;
        });
      } else {
        alert(`AI couldn't identify "${foodName}". Try being more specific.`);
      }
    } catch (_) {
      alert('Network issue communicating with the AI Engine.');
    } finally {
      setIsSearching(false);
    }
  };

  const addFood = () => { if (foodInput.trim()) { searchAndAddFood(foodInput.trim()); setFoodInput(''); } };

  const removeFood = (index) => {
    const rem = dailyFoods[index];
    const newFoods = dailyFoods.filter((_, i) => i !== index);
    const newNutrition = {
      calories:      Math.max(0, currentNutrition.calories      - (rem.calories      || rem.nutrition?.calories      || 0)),
      protein:       Math.max(0, Math.round((currentNutrition.protein       - (rem.protein       || rem.nutrition?.protein       || 0))*10)/10),
      carbohydrates: Math.max(0, Math.round((currentNutrition.carbohydrates - (rem.carbohydrates || rem.nutrition?.carbohydrates || 0))*10)/10),
      fat:           Math.max(0, Math.round((currentNutrition.fat           - (rem.fat           || rem.nutrition?.fat           || 0))*10)/10),
      fiber:         Math.max(0, Math.round((currentNutrition.fiber         - (rem.fiber         || rem.nutrition?.fiber         || 0))*10)/10),
    };
    setDailyFoods(newFoods);
    setCurrentNutrition(newNutrition);
    saveToFirebase(newFoods, newNutrition, waterDrank, sleepHours, caloriesBurned);
  };

  // ── Water handlers ──────────────────────────────────────────────────────────
  const addWater = (ml) => {
    const n = waterDrank + ml;
    setWaterDrank(n);
    saveToFirebase(dailyFoods, currentNutrition, n, sleepHours, caloriesBurned);
  };

  const removeWater = (ml) => {
    const n = Math.max(0, waterDrank - ml);
    setWaterDrank(n);
    saveToFirebase(dailyFoods, currentNutrition, n, sleepHours, caloriesBurned);
  };

  const handleManualWater = () => {
    const ml = parseInt(customWaterInput);
    if (!isNaN(ml) && ml > 0 && ml <= 5000) {
      addWater(ml);
      setCustomWaterInput('');
    } else {
      alert('Please enter a valid amount (1–5000 ml).');
    }
  };

  // ── Sleep handler ───────────────────────────────────────────────────────────
  const handleManualSleep = () => {
    if (sleepHours > 0) {
      alert('Sleep already logged for today. You can only log sleep once per day.');
      return;
    }
    if (!isSleepAllowed()) {
      alert('Sleep logging is available from 8:00 AM to 11:59 PM only.');
      return;
    }
    const hrs = parseFloat(customSleepInput);
    if (isNaN(hrs) || hrs <= 0 || hrs > 24) {
      alert('Please enter a valid number of hours (e.g., 7.5).');
      return;
    }
    const sleepCals = calcSleepCalories(userProfile, hrs);
    const newCals = caloriesBurned + sleepCals;
    setSleepHours(hrs);
    setCaloriesBurned(newCals);
    saveToFirebase(dailyFoods, currentNutrition, waterDrank, hrs, newCals);
    setCustomSleepInput('');
  };

  // ── Manual calories handler ─────────────────────────────────────────────────
  const handleManualCalories = () => {
    const cals = parseInt(customCaloriesInput);
    if (isNaN(cals) || cals <= 0) {
      alert('Please enter a valid number of calories burned.');
      return;
    }
    const n = caloriesBurned + cals;
    setCaloriesBurned(n);
    saveToFirebase(dailyFoods, currentNutrition, waterDrank, sleepHours, n);
    setCustomCaloriesInput('');
  };

  // ── Reset day ───────────────────────────────────────────────────────────────
  const resetDay = () => {
    const empty = { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 };
    setDailyFoods([]); setCurrentNutrition(empty);
    setWaterDrank(0); setSleepHours(0); setCaloriesBurned(0);
    saveToFirebase([], empty, 0, 0, 0);
  };

  // ── Macro limits ────────────────────────────────────────────────────────────
  const checkMacroLimits = (nutrition) => {
    if (!recommendations) return;
    const warnings = [];
    const { targetCalories: tCal = 2000, macros: { protein: tPro = 150, carbohydrates: tCarb = 200, fat: tFat = 65 } = {} } = recommendations;
    if (nutrition.calories > tCal*1.1)   warnings.push(`Energy +${Math.round(nutrition.calories - tCal)} kcal`);
    if (nutrition.protein > tPro*1.2)    warnings.push(`Protein +${Math.round(nutrition.protein - tPro)}g`);
    if (nutrition.carbohydrates > tCarb*1.2) warnings.push(`Carbs +${Math.round(nutrition.carbohydrates - tCarb)}g`);
    if (nutrition.fat > tFat*1.2)        warnings.push(`Fat +${Math.round(nutrition.fat - tFat)}g`);
    if (warnings.length) { setWarningMessage(warnings.join(' • ')); setShowWarning(true); setTimeout(() => setShowWarning(false), 5000); }
  };

  const pct = (current, target) => !target ? 0 : Math.min((current / target) * 100, 100);

  // ── Agent settings save ─────────────────────────────────────────────────────
  const saveAgentConfiguration = async () => {
    if (!agentName.trim()) { alert('Assistant name cannot be empty.'); return; }
    const cfg = { ...(agentSettings||{}), id: agentSettings?.id || 'ronnie', name: agentName.trim(), voice: selectedVoice };
    try {
      if (currentUser) await firebaseService.saveAgentSettings(currentUser.uid, cfg);
      setAgentSettings(cfg); setShowAgentSettings(false);
      window.location.reload();
    } catch (_) { alert('Failed to save assistant settings.'); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const waterGoal = calcDailyWaterGoal(userProfile);
  const waterPct  = Math.min((waterDrank / waterGoal) * 100, 100);

  // ── Guard: profile required ─────────────────────────────────────────────────
  if (!userProfile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel max-w-lg w-full p-8 text-center text-foreground">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <Activity className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-heading font-semibold mb-3">Health Profile Required</h2>
          <p className="text-muted mb-8">Please set up your health profile before using the nutrition dashboard.</p>
          <button onClick={() => navigate('/profile')} className="w-full bg-accent hover:bg-accent/90 text-background font-semibold py-3 rounded-xl transition-all">Set Up Profile</button>
        </motion.div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      <SEO title="Nutrition Dashboard" description="Track your daily calorie intake, macronutrients, and nutritional goals in real-time." canonical="/dashboard" />

      {/* Threshold warning toast */}
      <AnimatePresence>
        {showWarning && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-50 flex items-center gap-3 px-6 py-4 bg-red-500/90 backdrop-blur-md text-white rounded-xl shadow-2xl border border-red-400">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h4 className="font-semibold text-sm">Target Threshold Exceeded</h4>
              <p className="text-xs font-mono mt-0.5">{warningMessage}</p>
            </div>
            <button onClick={() => setShowWarning(false)} className="ml-4 p-1 hover:bg-white/20 rounded-md"><Trash2 className="w-4 h-4"/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-heading font-bold mb-2 tracking-tight">Daily Nutrition</h1>
          <p className="text-muted">Monitor and manage your daily intake & activity.</p>
        </div>
        <button onClick={() => setShowCalendar(true)} className="flex items-center gap-2 px-4 py-2 border border-border/10 hover:bg-foreground/5 bg-surface/30 rounded-xl transition-colors text-sm font-medium">
          <CalendarIcon className="w-4 h-4" /> History
        </button>
      </div>

      {/* History modal */}
      <AnimatePresence>
        {showCalendar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-panel w-full max-w-3xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-5 border-b border-border/5">
                <h3 className="font-heading font-semibold text-lg flex items-center gap-2"><CalendarIcon className="w-5 h-5"/> Historical Records</h3>
                <button onClick={() => setShowCalendar(false)} className="p-1 text-muted hover:text-foreground"><X className="w-4 h-4"/></button>
              </div>
              <div className="p-6 overflow-y-auto"><NutritionCalendar /></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent settings modal */}
      <AnimatePresence>
        {showAgentSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-panel w-full max-w-md flex flex-col pt-6 pb-8 px-8 border border-accent/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-semibold text-2xl flex items-center gap-2"><Mic className="w-6 h-6 text-accent"/> Assistant Settings</h3>
                <button onClick={() => setShowAgentSettings(false)} className="p-1 text-muted hover:text-foreground"><X className="w-5 h-5"/></button>
              </div>
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-sm font-medium text-muted block mb-2">Designation (Wake Word)</label>
                  <input type="text" maxLength={20} value={agentName} onChange={e => setAgentName(e.target.value)} className="w-full bg-surface/50 border border-border/10 rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-accent outline-none" placeholder="e.g. Ronnie" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted block mb-2">Vocal Synthesis Model</label>
                  <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="w-full bg-surface/50 border border-border/10 rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-accent outline-none appearance-none">
                    {availableVoices.length > 0 ? availableVoices.map((v,i) => <option key={i} value={v.name}>{v.name}</option>) : <option value="">No voices available</option>}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={saveAgentConfiguration} className="flex-1 bg-accent text-background font-semibold py-3 rounded-xl hover:bg-accent/90 transition-colors">Apply Changes</button>
                <button onClick={() => setShowAgentSettings(false)} className="flex-1 border border-border/10 text-muted font-semibold py-3 rounded-xl hover:bg-foreground/5 transition-colors">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

        {/* ── Left column ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Macro row */}
          {recommendations && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Energy',  icon: Flame,    current: currentNutrition.calories,      target: recommendations.targetCalories,          unit: 'kcal', color: 'bg-accent' },
                { label: 'Protein', icon: Beef,     current: currentNutrition.protein,       target: recommendations.macros?.protein,          unit: 'g',    color: 'bg-blue-400' },
                { label: 'Carbs',   icon: Wheat,    current: currentNutrition.carbohydrates, target: recommendations.macros?.carbohydrates,    unit: 'g',    color: 'bg-orange-400' },
                { label: 'Lipids',  icon: Droplets, current: currentNutrition.fat,           target: recommendations.macros?.fat,              unit: 'g',    color: 'bg-yellow-400' },
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
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct(m.current, m.target)}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn('h-full', m.color, pct(m.current, m.target) >= 100 ? 'bg-red-500' : '')} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Water & Sleep row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ── Water card ── */}
            <div className="glass-panel p-6 flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Droplets className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm">Hydration</h3>
                    <p className="text-xs text-muted">Goal: {waterGoal}ml / day</p>
                  </div>
                </div>
                <span className="text-2xl font-bold font-mono">{waterDrank}<span className="text-sm text-muted font-normal">ml</span></span>
              </div>

              {/* Animated glass */}
              <div className="flex items-end gap-4">
                <div className="relative w-12 h-20 rounded-b-xl rounded-t-sm border-2 border-blue-500/30 overflow-hidden bg-surface/30 flex-shrink-0">
                  <motion.div
                    animate={{ height: `${waterPct}%` }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                    className="absolute bottom-0 left-0 right-0 bg-blue-500/60"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-full" />
                  </motion.div>
                </div>
                <div className="flex-1">
                  <div className="w-full h-2 bg-surface rounded-full overflow-hidden mb-2">
                    <motion.div animate={{ width: `${waterPct}%` }} transition={{ type: 'spring', stiffness: 60 }} className="h-full bg-blue-500/70 rounded-full" />
                  </div>
                  <p className="text-xs text-muted">{Math.round(waterPct)}% of daily goal</p>
                </div>
              </div>

              {/* Water controls */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => addWater(250)} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20">+250ml</button>
                <button onClick={() => addWater(500)} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20">+500ml</button>
                <button onClick={() => removeWater(250)} disabled={waterDrank <= 0} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 disabled:opacity-30">−250ml</button>
              </div>

              {/* Custom water input */}
              <div className="flex gap-2">
                <input
                  type="number" value={customWaterInput} onChange={e => setCustomWaterInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualWater()}
                  placeholder="Custom ml..." min="1" max="5000"
                  className="flex-1 bg-surface/50 border border-border/10 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={handleManualWater} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors border border-blue-500/20">Add</button>
              </div>
            </div>

            {/* ── Sleep card ── */}
            <div className="glass-panel p-6 flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Moon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm">Rest & Recovery</h3>
                    <p className="text-xs text-muted">Log once daily · 8AM–midnight</p>
                  </div>
                </div>
                {sleepHours > 0 && (
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono">{sleepHours}<span className="text-sm text-muted font-normal">h</span></span>
                    <p className="text-xs text-emerald-400">+{calcSleepCalories(userProfile, sleepHours)} kcal burned</p>
                  </div>
                )}
              </div>

              {sleepHours > 0 ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-indigo-300">Sleep logged for today</p>
                    <p className="text-xs text-muted">You slept {sleepHours} hours · ~{calcSleepCalories(userProfile, sleepHours)} kcal burned</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted">
                    {isSleepAllowed() ? "How many hours did you sleep last night?" : "⏰ Sleep logging available from 8:00 AM"}
                  </p>
                  {isSleepAllowed() && (
                    <div className="flex gap-2">
                      <input
                        type="number" value={customSleepInput} onChange={e => setCustomSleepInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleManualSleep()}
                        placeholder="Hours (e.g. 7.5)" min="0.5" max="24" step="0.5"
                        className="flex-1 bg-surface/50 border border-border/10 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button onClick={handleManualSleep} className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-500/30 transition-colors border border-indigo-500/20">Log</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* AI food logger */}
          <div className="glass-panel flex-col p-0 overflow-hidden border-accent/20">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/5 bg-surface/30">
              <h2 className="font-heading font-semibold flex items-center gap-2 text-accent"><BrainCircuit className="w-4 h-4"/> AI Dietary Logger</h2>
              {dailyFoods.length > 0 && (
                <button onClick={resetDay} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Log
                </button>
              )}
            </div>
            <div className="p-6">
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1 group">
                  <div className="absolute inset-0 bg-accent/5 rounded-xl border border-accent/20 transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none" />
                  <BrainCircuit className="absolute left-4 top-[14px] w-5 h-5 text-accent/50 group-focus-within:text-accent transition-colors" />
                  <input
                    type="text" value={foodInput} onChange={e => setFoodInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isSearching && addFood()}
                    disabled={isSearching}
                    className="w-full pl-12 pr-4 py-3 bg-surface border border-border/10 rounded-xl focus:ring-1 focus:ring-accent text-sm text-foreground placeholder-white/30 relative z-10 bg-transparent"
                    placeholder="Type naturally… e.g. 'I had 2 scrambled eggs and toast'"
                  />
                </div>
                <button onClick={addFood} disabled={isSearching || !foodInput.trim()} className="px-6 rounded-xl bg-accent text-background font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-accent/20">
                  {isSearching ? <Activity className="w-4 h-4 animate-spin"/> : <Plus className="w-5 h-5" />}
                  <span className="hidden sm:inline">Log</span>
                </button>
              </div>
              {dailyFoods.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {[...dailyFoods].reverse().map((food, ri) => {
                    const idx = dailyFoods.length - 1 - ri;
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
                  <p className="text-sm">Ready to log. What did you eat today?</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Calories burned card */}
          <div className="glass-panel p-6 bg-gradient-to-b from-surface/50 to-background/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Zap className="w-4 h-4 text-orange-400" />
              </div>
              <h3 className="font-heading font-semibold">Calories Burned</h3>
            </div>

            <div className="flex flex-col items-center justify-center py-4 mb-4">
              <div className="w-36 h-36 rounded-full border-4 border-surface flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-500/20 to-transparent" style={{ height: `${Math.min((caloriesBurned/1000)*100, 100)}%` }} />
                <span className="text-4xl font-bold font-mono text-foreground relative z-10 tracking-tighter">{caloriesBurned}</span>
                <span className="text-xs uppercase tracking-widest text-muted relative z-10 mt-1">kcal Out</span>
              </div>
            </div>

            {/* Manual calories input */}
            <div className="flex gap-2 mb-3">
              <input
                type="number" value={customCaloriesInput} onChange={e => setCustomCaloriesInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualCalories()}
                placeholder="Add kcal burned…" min="1"
                className="flex-1 bg-surface border border-border/10 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-accent"
              />
              <button onClick={handleManualCalories} className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-xl text-sm font-medium hover:bg-orange-500/30 transition-colors border border-orange-500/20">
                <Plus className="w-4 h-4"/>
              </button>
            </div>

            <button onClick={() => navigate('/workout')} className="w-full flex items-center justify-center gap-2 py-2.5 border border-border/10 rounded-xl font-medium text-sm hover:bg-foreground/5 transition-colors text-muted">
              <Activity className="w-4 h-4"/> Workout Tracker
            </button>
          </div>

          {/* Settings card */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Current Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/5">
                <div className="flex items-center gap-2 text-sm"><Target className="w-4 h-4 text-muted"/> Current Objective</div>
                <div className="text-sm font-mono capitalize">{userProfile.goal?.replace('_', ' ')}</div>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border/5">
                <div className="flex items-center gap-2 text-sm"><Activity className="w-4 h-4 text-muted"/> Activity Level</div>
                <div className="text-sm font-mono capitalize">{userProfile.activityLevel?.replace('_', ' ')}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-accent"/> AI Assistant</div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-accent">{agentSettings?.name || 'Ronnie'}</span>
                  <button onClick={() => setShowAgentSettings(true)} className="p-1.5 rounded-lg border border-border/10 bg-surface/50 hover:bg-foreground/10 text-muted hover:text-foreground transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NutritionDashboard;
