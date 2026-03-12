import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { formatAIResponseToMarkdown } from '../utils/formatText';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, Utensils, ChefHat, Sparkles, Activity,
  Printer, Copy, Save, X, Calendar as CalendarIcon, Target
} from 'lucide-react';

import { mealPlanAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { cn } from '../utils/cn';
import SEO from './SEO';

function MealPlanner() {
  const { currentUser, userProfile } = useAuth();
  const [preferences, setPreferences] = useState({
    duration: 7,
    mealsPerDay: 3,
    cuisinePreferences: [],
  });

  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: parseInt(value) || value }));
  };

  const handleCuisineChange = (e) => {
    const value = e.target.value;
    if (value && !preferences.cuisinePreferences.includes(value)) {
      setPreferences(prev => ({
        ...prev,
        cuisinePreferences: [...prev.cuisinePreferences, value]
      }));
    }
  };

  const removeCuisine = (cuisine) => {
    setPreferences(prev => ({
      ...prev,
      cuisinePreferences: prev.cuisinePreferences.filter(c => c !== cuisine)
    }));
  };

  const generateMealPlan = async () => {
    if (!userProfile) {
      setError('Health profile setup required.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await mealPlanAPI.generate(userProfile, preferences);
      setMealPlan(response.data.data);
      setShowSaveModal(true);
    } catch (err) {
      setError('Generation failed. Verify connection to intelligence protocol.');
    } finally {
      setLoading(false);
    }
  };

  const saveMealPlanToProfile = async () => {
    try {
      const newPlan = {
        id: Date.now(),
        mealPlan: mealPlan.mealPlan,
        preferences: preferences,
        generatedAt: mealPlan.generatedAt,
        savedAt: new Date().toISOString(),
        userProfile: {
          age: userProfile.age,
          gender: userProfile.gender,
          activityLevel: userProfile.activityLevel
        }
      };
      
      if (currentUser) {
        await firebaseService.saveMealPlan(currentUser.uid, newPlan);
        const [updatedHealth, updatedNutrition] = await Promise.all([
           firebaseService.getHealthProfile(currentUser.uid),
           firebaseService.getDailyNutrition(currentUser.uid)
        ]);
        window.dispatchEvent(new CustomEvent('user-context-updated', {
           detail: { healthProfile: updatedHealth, todayNutrition: updatedNutrition }
        }));
        
        // Trigger review prompt after successful usage
        setTimeout(() => {
           window.dispatchEvent(new CustomEvent('trigger-review'));
        }, 12000);
      } else {
        const savedPlans = JSON.parse(localStorage.getItem('savedMealPlans') || '[]');
        savedPlans.unshift(newPlan);
        if (savedPlans.length > 10) savedPlans.pop();
        localStorage.setItem('savedMealPlans', JSON.stringify(savedPlans));
      }
      
      setShowSaveModal(false);
      setSaveSuccess('Protocol successfully synchronized.');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setError('Failed to synchronize memory.');
    }
  };

  const skipSaving = () => setShowSaveModal(false);

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SEO
        title="Personalized Meal Planner"
        description="Create AI-powered personalized meal plans tailored to your dietary needs, fitness goals, and cuisine preferences. Your smart gym meal planner."
        canonical="/meal-planner"
        ogImage="https://ainutritionist.tech/og/og-meal-planner.png"
      />
      
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
           <CalendarDays className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-4xl font-heading font-bold mb-4">Smart Meal Planner</h1>
        <p className="text-muted max-w-2xl mx-auto text-lg">Create personalized meal plans based on your unique body metrics.</p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
            {error}
          </motion.div>
        )}
        {saveSuccess && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-medium text-center flex items-center justify-center gap-2">
            <Target className="w-4 h-4"/> {saveSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Config Form */}
        <div className="lg:col-span-5">
           <div className="glass-panel p-6 sticky top-24">
              <h2 className="font-heading font-semibold text-lg mb-6 flex items-center gap-2">
                 <ChefHat className="w-5 h-5 text-accent" /> Protocol Parameters
              </h2>
              
              <div className="space-y-6">
                 <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">Cycle Duration</label>
                    <select name="duration" value={preferences.duration} onChange={handleChange} className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none appearance-none">
                       <option value={1}>1 Day Baseline</option>
                       <option value={3}>3 Day Micro-Cycle</option>
                       <option value={7}>7 Day Standard Cycle</option>
                       <option value={14}>14 Day Extended Cycle</option>
                    </select>
                 </div>

                 <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">Intake Frequency</label>
                    <select name="mealsPerDay" value={preferences.mealsPerDay} onChange={handleChange} className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none appearance-none">
                       <option value={2}>2 Intermittent Intervals</option>
                       <option value={3}>3 Standard Intervals</option>
                       <option value={4}>4 Moderate Intervals</option>
                       <option value={5}>5 Frequent Intervals</option>
                    </select>
                 </div>

                 <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">Culinary Constraints (Optional)</label>
                    <select onChange={handleCuisineChange} value="" className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3 text-sm text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none appearance-none">
                       <option value="">Select preferences to append...</option>
                       <option value="Mediterranean">Mediterranean</option>
                       <option value="Asian">Asian (General)</option>
                       <option value="Latin">Latin American</option>
                       <option value="Indian">Indian</option>
                       <option value="Continental">Continental</option>
                    </select>
                    
                    {preferences.cuisinePreferences.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 p-3 bg-surface/50 rounded-xl border border-border/5">
                        {preferences.cuisinePreferences.map(cuisine => (
                          <div key={cuisine} className="flex items-center gap-1.5 px-2.5 py-1 bg-foreground/5 border border-border/10 rounded-lg text-xs font-medium text-foreground">
                            {cuisine}
                            <button onClick={() => removeCuisine(cuisine)} className="text-muted hover:text-white transition-colors"><X className="w-3 h-3"/></button>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>

                 <button onClick={generateMealPlan} disabled={loading} className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-accent text-background hover:bg-accent/90 text-sm font-semibold transition-colors disabled:opacity-50 mt-8">
                    {loading ? <Activity className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                    {loading ? 'Creating Meal Plan...' : 'Generate Meal Plan'}
                 </button>
              </div>
           </div>
        </div>

        {/* Results Pane */}
        <div className="lg:col-span-7">
           <AnimatePresence mode="wait">
             {loading && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-panel p-12 text-center h-full flex flex-col items-center justify-center border-accent/20">
                 <div className="w-16 h-16 w-16 mb-6">
                    <Activity className="w-full h-full text-accent animate-pulse" />
                 </div>
                 <h3 className="text-xl font-heading font-semibold mb-2">Personalizing Your Plan</h3>
                 <p className="text-muted text-sm max-w-xs mx-auto mb-6">Matching your goals with the right nutrients...</p>
                 <div className="flex gap-1">
                   <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
               </motion.div>
             )}

             {!loading && !mealPlan && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-12 text-center h-full flex flex-col items-center justify-center bg-surface/30">
                 <div className="w-16 h-16 rounded-full border border-dashed border-border/20 flex items-center justify-center mb-4">
                    <CalendarIcon className="w-6 h-6 text-muted opacity-50" />
                 </div>
                 <p className="text-muted text-sm">Awaiting generation parameters.</p>
               </motion.div>
             )}

             {!loading && mealPlan && (
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-border/5 bg-surface/30">
                    <div className="flex items-start justify-between">
                       <div>
                         <h2 className="font-heading font-semibold text-xl mb-1 flex items-center gap-2">
                           <Utensils className="w-5 h-5 text-accent"/> Generated Protocol
                         </h2>
                         <p className="text-sm text-muted">
                           {preferences.duration} day cycle • {preferences.mealsPerDay} intervals
                         </p>
                       </div>
                    </div>
                  </div>

                  <div className="p-8 overflow-y-auto prose prose-invert prose-p:leading-relaxed prose-headings:font-heading prose-a:text-accent prose-pre:bg-surface prose-pre:border prose-pre:border-border/10 max-w-none text-sm text-foreground/90">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                      {formatAIResponseToMarkdown(mealPlan.mealPlan)}
                    </ReactMarkdown>
                  </div>

                  <div className="p-4 border-t border-border/5 bg-surface mt-auto flex justify-between">
                     <div className="text-xs text-muted flex items-center">
                        Synthesized {new Date(mealPlan.generatedAt).toLocaleTimeString()}
                     </div>
                     <div className="flex gap-3">
                       <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors border border-border/10 bg-surface/50 rounded-lg">
                         <Printer className="w-4 h-4"/> Print
                       </button>
                       <button onClick={() => { navigator.clipboard.writeText(mealPlan.mealPlan); alert('Copied'); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-foreground text-black hover:bg-foreground/90 rounded-lg transition-colors">
                         <Copy className="w-4 h-4"/> Copy
                       </button>
                     </div>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showSaveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md" onClick={skipSaving}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-panel w-full max-w-sm overflow-hidden text-center" onClick={(e) => e.stopPropagation()}>
               <div className="p-8">
                 <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4 border border-accent/20">
                    <Save className="w-6 h-6 text-accent" />
                 </div>
                 <h3 className="font-heading font-semibold text-lg mb-2">Save Your Meal Plan?</h3>
                 <p className="text-sm text-muted mb-8">This plan will be saved to your profile for future use.</p>
                 
                 <div className="flex flex-col gap-3">
                   <button onClick={saveMealPlanToProfile} className="w-full bg-accent text-background font-semibold py-3 rounded-xl hover:bg-accent/90 transition-colors">Confirm Sync</button>
                   <button onClick={skipSaving} className="w-full border border-border/10 text-muted hover:bg-foreground/5 py-3 rounded-xl font-medium transition-colors">Discard</button>
                 </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default MealPlanner;
