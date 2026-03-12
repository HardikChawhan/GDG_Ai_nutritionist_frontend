import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { formatAIResponseToMarkdown } from '../utils/formatText';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircle, Activity, HeartPulse, Scale, Ruler,
  Target, AlertCircle, Calendar, Save, Copy, Trash2,
  ChevronRight, ChevronLeft, Lock, ArrowRight, BookOpen,
  Wheat, Ban, Info, CheckCircle2, X
} from 'lucide-react';

import { healthProfileAPI, nutritionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { cn } from '../utils/cn';
import SEO from './SEO';

function HealthProfile() {
  const { currentUser, userProfile, updateProfile, signInWithGoogle, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userId: currentUser?.uid || 'user123',
    name: currentUser?.displayName || '',
    email: currentUser?.email || '',
    photoURL: currentUser?.photoURL || '',
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
  const [message, setMessage] = useState(null);
  const [savedMealPlans, setSavedMealPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) setShowLoginPrompt(true);
    else setShowLoginPrompt(false);
  }, [currentUser, authLoading]);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        userId: currentUser.uid,
        name: currentUser.displayName || '',
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || '',
      }));

      if (userProfile) {
        setFormData(prev => ({ ...prev, ...userProfile }));
        fetchRecommendations(userProfile);
      } else {
        loadHealthProfileFromFirebase();
      }
    }
    loadSavedMealPlans();
  }, [currentUser, userProfile]);

  const loadHealthProfileFromFirebase = async () => {
    if (!currentUser) return;
    try {
      const profile = await firebaseService.getHealthProfile(currentUser.uid);
      if (profile) {
        setFormData(prev => ({ ...prev, ...profile }));
        await fetchRecommendations(profile);
      }
    } catch (error) {
      console.error('Error loading health profile:', error);
    }
  };

  const loadSavedMealPlans = async () => {
    if (!currentUser) {
      try {
        const plans = JSON.parse(localStorage.getItem('savedMealPlans') || '[]');
        setSavedMealPlans(plans);
      } catch (err) { }
      return;
    }
    try {
      const plans = await firebaseService.getMealPlans(currentUser.uid);
      setSavedMealPlans(plans);
      localStorage.setItem('savedMealPlans', JSON.stringify(plans));
    } catch (err) {
      const plans = JSON.parse(localStorage.getItem('savedMealPlans') || '[]');
      setSavedMealPlans(plans);
    }
  };

  const deleteMealPlan = async (planId) => {
    try {
      if (currentUser) {
        await firebaseService.deleteMealPlan(currentUser.uid, planId);
      }
      const plans = savedMealPlans.filter(plan => plan.id !== planId);
      localStorage.setItem('savedMealPlans', JSON.stringify(plans));
      setSavedMealPlans(plans);
      setMessage({ type: 'success', text: 'Meal Plan deleted successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error executing deletion.' });
    }
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
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Authentication required for profile modification.' });
      setShowLoginPrompt(true);
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      await updateProfile(formData);
      await healthProfileAPI.create(formData);
      await fetchRecommendations(formData);
      setMessage({ type: 'success', text: 'Biometric profile Saved' });

      const agentSettings = await firebaseService.getAgentSettings(currentUser.uid);
      if (!agentSettings) setTimeout(() => navigate('/agent-setup'), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'Synchronization failed. Please verify connection.' });
    } finally {
      setLoading(false);
    }
  };

  const getBMI = () => {
    if (formData.weight && formData.height) {
      const heightInMeters = formData.height / 100;
      return (formData.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-400' };
    if (bmi < 25) return { label: 'Optimal', color: 'text-accent' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-400' };
    return { label: 'Obese', color: 'text-red-500' };
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEO
        title="Health Profile"
        description="Configure your biometric health profile for personalized AI nutrition recommendations. Set dietary restrictions, allergies, and fitness goals."
        canonical="/profile"
      />

      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-panel w-full max-w-md p-8 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-6 mx-auto">
                <Lock className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-2xl font-heading font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted text-sm mb-8">Your health data requires secure sign in.</p>

              <button onClick={() => signInWithGoogle()} className="w-full flex items-center justify-center gap-3 bg-foreground text-black hover:bg-foreground/90 px-4 py-3 rounded-xl font-medium transition-colors mb-4">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Authenticate with Google
              </button>
              <button onClick={() => navigate('/')} className="w-full border border-border/10 hover:bg-foreground/5 py-3 rounded-xl font-medium text-muted transition-colors">
                Return to Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-12">
        <h1 className="text-4xl font-heading font-bold mb-4">Health Profile</h1>
        <p className="text-muted max-w-2xl text-lg">Manage your biometric data, dietary requirements, and computational health models.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Form Setup */}
        <div className="lg:col-span-7">
          <div className="glass-panel p-8">

            {/* Progress indicators */}
            <div className="flex items-center justify-between mb-8 pb-8 border-b border-border/5 text-sm font-medium">
              {[
                { step: 1, label: 'Body Info', icon: UserCircle },
                { step: 2, label: 'Activity & Goals', icon: Target },
                { step: 3, label: 'Health Conditions', icon: HeartPulse }
              ].map((s, idx) => (
                <div key={s.step} className="flex items-center">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                    currentStep === s.step ? "border-accent text-accent bg-accent/10" :
                      currentStep > s.step ? "border-transparent bg-accent text-white" : "border-border/10 text-muted"
                  )}>
                    {currentStep > s.step ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className={cn("ml-3 hidden sm:block", currentStep >= s.step ? "text-foreground" : "text-muted")}>{s.label}</span>
                  {idx < 2 && <div className={cn("hidden sm:block w-12 h-px mx-4", currentStep > s.step ? "bg-accent" : "bg-foreground/10")} />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {message && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn(
                  "px-4 py-3 rounded-lg mb-6 flex items-center gap-3 text-sm font-medium",
                  message.type === 'error' ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-accent/10 text-accent border border-accent/20"
                )}>
                  {message.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">

                {currentStep === 1 && (
                  <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-muted mb-1"><Calendar className="w-4 h-4 text-accent/70" /> Age</label>
                        <input type="number" name="age" required value={formData.age} onChange={handleChange} className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-all placeholder:text-foreground/20" placeholder="Years" />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-muted mb-1"><UserCircle className="w-4 h-4 text-accent/70" /> Genotype/Sex</label>
                        <div className="flex bg-surface/50 p-1 rounded-xl border border-border/5">
                          {['male', 'female'].map(g => (
                            <button key={g} type="button" onClick={() => setFormData(p => ({ ...p, gender: g }))} className={cn("flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-all", formData.gender === g ? "bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.2)] text-foreground" : "text-muted hover:text-foreground")}>{g}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-muted mb-1"><Scale className="w-4 h-4 text-accent/70" /> Mass (kg)</label>
                        <input type="number" name="weight" step="0.1" required value={formData.weight} onChange={handleChange} className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-all placeholder:text-foreground/20" placeholder="0.0" />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-muted mb-1"><Ruler className="w-4 h-4 text-accent/70" /> Stature (cm)</label>
                        <input type="number" name="height" required value={formData.height} onChange={handleChange} className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-all placeholder:text-foreground/20" placeholder="170" />
                      </div>
                    </div>

                    {getBMI() && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 p-4 rounded-xl border border-border/5 bg-gradient-to-br from-surface to-background flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface/80 flex items-center justify-center border border-border/10 font-mono text-sm font-medium">BMI</div>
                          <div>
                            <div className="text-2xl font-bold font-heading">{getBMI()}</div>
                            <div className={cn("text-xs font-semibold uppercase tracking-wider", getBMICategory(parseFloat(getBMI())).color)}>{getBMICategory(parseFloat(getBMI())).label}</div>
                          </div>
                        </div>
                        <Info className="w-5 h-5 text-muted/50" />
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-medium text-muted mb-3"><Activity className="w-4 h-4 text-accent/70" /> Activity Level</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'sedentary', label: 'Little or No Exercise', desc: 'Base metabolism' },
                          { value: 'light', label: 'Light Activity', desc: '1-3 sessions/week' },
                          { value: 'moderate', label: 'Moderate Activity', desc: '3-5 sessions/week' },
                          { value: 'active', label: 'Very Active', desc: '6-7 sessions/week' }
                        ].map(act => (
                          <button key={act.value} type="button" onClick={() => setFormData(p => ({ ...p, activityLevel: act.value }))} className={cn("p-4 rounded-xl border text-left transition-all", formData.activityLevel === act.value ? "bg-accent/10 border-accent/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-surface/30 border-border/5 hover:border-border/20")}>
                            <div className={cn("font-medium mb-1", formData.activityLevel === act.value ? "text-accent" : "text-foreground")}>{act.label}</div>
                            <div className="text-xs text-muted">{act.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-medium text-muted mb-3"><Target className="w-4 h-4 text-accent/70" /> Primary Goal</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'weight_loss', label: 'Lose Weight' },
                          { value: 'weight_gain', label: 'Gain Weight' },
                          { value: 'maintenance', label: 'Maintain Weight' },
                          { value: 'general_health', label: 'Improve Fitness' }
                        ].map(goal => (
                          <button key={goal.value} type="button" onClick={() => setFormData(p => ({ ...p, goal: goal.value }))} className={cn("p-4 rounded-xl border text-left transition-all", formData.goal === goal.value ? "bg-accent/10 border-accent/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-surface/30 border-border/5 hover:border-border/20")}>
                            <div className={cn("font-medium", formData.goal === goal.value ? "text-accent" : "text-foreground")}>{goal.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-muted"><Wheat className="w-4 h-4 text-accent/70" /> Dietary Restrictions</label>
                      <select onChange={(e) => handleMultiSelect(e, 'dietaryRestrictions')} value="" className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none appearance-none">
                        <option value="">Select restrictions to append...</option>
                        <option value="None">None</option>
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Vegan">Vegan</option>
                        <option value="Gluten-Free">Gluten-Free</option>
                        <option value="Dairy-Free">Dairy-Free</option>
                        <option value="Ketogenic">Ketogenic</option>
                      </select>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.dietaryRestrictions.map(item => (
                          <div key={item} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs font-medium text-accent">
                            {item}
                            <button type="button" onClick={() => removeItem('dietaryRestrictions', item)} className="hover:text-white"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-muted"><Ban className="w-4 h-4 text-accent/70" /> Known Allergens</label>
                      <select onChange={(e) => handleMultiSelect(e, 'allergies')} value="" className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none appearance-none">
                        <option value="">Select allergens to append...</option>
                        <option value="None">None</option>
                        <option value="Peanuts">Peanuts</option>
                        <option value="Tree Nuts">Tree Nuts</option>
                        <option value="Milk">Milk</option>
                        <option value="Eggs">Eggs</option>
                        <option value="Soy">Soy</option>
                      </select>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.allergies.map(item => (
                          <div key={item} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-medium text-red-400">
                            {item}
                            <button type="button" onClick={() => removeItem('allergies', item)} className="hover:text-white"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-muted"><HeartPulse className="w-4 h-4 text-accent/70" /> Diagnosed Conditions</label>
                      <select onChange={(e) => handleMultiSelect(e, 'healthConditions')} value="" className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none appearance-none">
                        <option value="">Select conditions to append...</option>
                        <option value="None">None</option>
                        <option value="Diabetes">Diabetes</option>
                        <option value="Hypertension">Hypertension</option>
                        <option value="High Cholesterol">High Cholesterol</option>
                        <option value="PCOS">PCOS</option>
                        <option value="Thyroid Issues">Thyroid Issues</option>
                      </select>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.healthConditions.map(item => (
                          <div key={item} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs font-medium text-orange-400">
                            {item}
                            <button type="button" onClick={() => removeItem('healthConditions', item)} className="hover:text-white"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/5">
                {currentStep > 1 ? (
                  <button type="button" onClick={() => setCurrentStep(c => c - 1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/10 hover:bg-foreground/5 text-sm font-medium transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Go Back
                  </button>
                ) : <div />}

                {currentStep < 3 ? (
                  <button type="button" onClick={(e) => { e.preventDefault(); setCurrentStep(c => c + 1); }} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-background hover:bg-accent/90 text-sm font-semibold transition-colors disabled:opacity-50" disabled={(currentStep === 1 && (!formData.age || !formData.weight || !formData.height)) || (currentStep === 2 && (!formData.activityLevel || !formData.goal))}>
                    Proceed <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={loading} onClick={() => { if(currentStep !== 3) return; }} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-background hover:bg-accent/90 text-sm font-semibold transition-colors disabled:opacity-50">
                    <Save className="w-4 h-4" /> {loading ? 'Synchronizing...' : 'Save Profile'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Recommendations & Meals */}
        <div className="lg:col-span-5 space-y-6">

          <AnimatePresence>
            {recommendations && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-accent" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg">Biometric Computed Targets</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-xl border border-border/5 bg-surface/50">
                    <p className="text-xs text-muted font-medium mb-1">Target Energy</p>
                    <p className="text-2xl font-bold text-accent font-heading">{recommendations.targetCalories} <span className="text-sm font-normal text-muted">kcal</span></p>
                    <p className="text-[10px] text-muted uppercase tracking-wider mt-2">Optimal Threshold</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/5 bg-surface/50">
                    <p className="text-xs text-muted font-medium mb-1">Basal Metabolic Rate</p>
                    <p className="text-2xl font-bold font-heading">{recommendations.bmr} <span className="text-sm font-normal text-muted">kcal</span></p>
                    <p className="text-[10px] text-muted uppercase tracking-wider mt-2">Resting Base</p>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-muted mb-4">Macronutrient Distribution</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Proteins</span>
                      <span className="text-accent font-mono">{recommendations.macros.protein}g</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden"><div className="h-full bg-accent w-[30%]" /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Carbohydrates</span>
                      <span className="text-blue-400 font-mono">{recommendations.macros.carbohydrates}g</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden"><div className="h-full bg-blue-400 w-[45%]" /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Lipids / Fats</span>
                      <span className="text-orange-400 font-mono">{recommendations.macros.fat}g</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden"><div className="h-full bg-orange-400 w-[25%]" /></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {savedMealPlans.length > 0 && (
            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-semibold text-lg flex items-center gap-2"><BookOpen className="w-4 h-4 text-muted" /> Generated Plans</h3>
                <span className="px-2.5 py-1 rounded-full bg-surface text-xs font-medium border border-border/5">{savedMealPlans.length} records</span>
              </div>

              <div className="space-y-3">
                {savedMealPlans.map(plan => (
                  <div key={plan.id} className="p-4 rounded-xl border border-border/5 bg-surface/30 hover:bg-surface/60 transition-colors group cursor-pointer" onClick={() => setSelectedPlan(plan)}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm text-foreground">Meal Plan • {plan.preferences.duration} Day(s)</p>
                        <p className="text-xs text-muted">{new Date(plan.savedAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteMealPlan(plan.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2 text-xs font-medium">
                      <span className="px-2 py-1 bg-foreground/5 rounded-md">{plan.preferences.mealsPerDay} meals/day</span>
                      {plan.preferences.cuisinePreferences.length > 0 && <span className="px-2 py-1 bg-foreground/5 rounded-md text-ellipsis overflow-hidden whitespace-nowrap max-w-[120px]">{plan.preferences.cuisinePreferences[0]}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <AnimatePresence>
        {selectedPlan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md" onClick={() => setSelectedPlan(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border/5">
                <h2 className="font-heading font-semibold text-lg">Protocol Documentation • {selectedPlan.preferences.duration} Days</h2>
                <button onClick={() => setSelectedPlan(null)} className="p-1"><X className="w-5 h-5 text-muted hover:text-foreground" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 text-sm text-foreground/90 prose prose-invert prose-p:leading-relaxed prose-headings:font-heading prose-a:text-accent">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{formatAIResponseToMarkdown(selectedPlan.mealPlan)}</ReactMarkdown>
              </div>

              <div className="p-4 border-t border-border/5 bg-surface/30 flex justify-end gap-3">
                <button onClick={() => setSelectedPlan(null)} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground">Close</button>
                <button onClick={() => { navigator.clipboard.writeText(selectedPlan.mealPlan); alert('Data copied to clipboard'); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent/90">
                  <Copy className="w-4 h-4" /> Copy Protocol
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default HealthProfile;
