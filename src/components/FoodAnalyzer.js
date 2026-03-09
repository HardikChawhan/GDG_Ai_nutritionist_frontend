import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scan, Search, Activity, ClipboardList, Database, RefreshCcw, Printer,
  Info
} from 'lucide-react';

import { foodAnalysisAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { cn } from '../utils/cn';

function FoodAnalyzer() {
  const { currentUser, userProfile } = useAuth();
  const [foodInput, setFoodInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeFoodText = async () => {
    if (!userProfile) {
      setError('Clinical profile required for contextual analysis.');
      return;
    }

    if (!foodInput.trim()) {
      setError('Provide dietary target inputs for scanning.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const foodItems = foodInput.split(',').map(f => f.trim()).filter(f => f);
      const response = await foodAnalysisAPI.analyzeText(foodItems, userProfile);
      const analysisData = response.data.data;
      setAnalysis(analysisData);
      
      if (currentUser) {
        try {
          await firebaseService.saveFoodAnalysis(currentUser.uid, {
            foodItems,
            analysis: analysisData,
            userProfile: {
              age: userProfile.age,
              goal: userProfile.goal
            }
          });
        } catch (saveError) {}
      }
    } catch (err) {
      setError('Analysis failed. Matrix communication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeFoodText();
    }
  };

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
           <Scan className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-4xl font-heading font-bold mb-4 tracking-tight">Intelligence Analyzer</h1>
        <p className="text-muted max-w-2xl mx-auto text-lg">Deep computational analysis of complex macronutrient compositions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Intakes & Info */}
        <div className="lg:col-span-5 flex flex-col gap-6">
           <div className="glass-panel p-6">
             <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-muted" />
                <h2 className="font-heading font-semibold text-lg">Input Matrix</h2>
             </div>
             
             {error && (
               <div className="mb-4 text-sm font-medium text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                 {error}
               </div>
             )}

             <div className="space-y-4">
               <textarea
                 className="w-full bg-surface border border-border/10 rounded-xl p-4 text-sm text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none resize-none transition-all placeholder:text-foreground/20 custom-scrollbar"
                 placeholder="e.g. 200g grilled salmon, 1 cup quinoa, 2tbsp olive oil"
                 value={foodInput}
                 onChange={(e) => setFoodInput(e.target.value)}
                 onKeyDown={handleKeyPress}
                 rows={5}
               />
               
               <div className="flex items-start gap-2 text-xs text-muted bg-surface/30 p-3 rounded-lg border border-border/5">
                 <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                 <p>Comma segregate discrete structural entities for precise batch analysis.</p>
               </div>

               <button 
                 onClick={analyzeFoodText} 
                 disabled={loading}
                 className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-accent text-background hover:bg-accent/90 text-sm font-semibold transition-colors disabled:opacity-50"
               >
                 {loading ? <Search className="w-5 h-5 animate-pulse" /> : <Scan className="w-5 h-5" />}
                 {loading ? 'Processing Signature...' : 'Initiate Deep Scan'}
               </button>
             </div>
           </div>

           <div className="glass-panel p-6 bg-gradient-to-br from-surface to-background border-border/5">
             <h3 className="font-heading font-semibold mb-4 text-sm uppercase tracking-wider text-muted">Capabilities</h3>
             <div className="space-y-3">
                {[
                  { icon: ClipboardList, title: "Compound Meals", desc: "Scan aggregate nutrition profiles." },
                  { icon: Activity, title: "Molecular Tracking", desc: "Retrieve distinct nutrient densities." },
                  { icon: RefreshCcw, title: "Comparison Matrices", desc: "Perform side-by-side analytics." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-foreground/5 rounded-xl border border-border/5">
                     <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                       <item.icon className="w-4 h-4 text-muted" />
                     </div>
                     <div>
                       <div className="text-sm font-medium text-foreground">{item.title}</div>
                       <div className="text-xs text-muted">{item.desc}</div>
                     </div>
                  </div>
                ))}
             </div>
           </div>
        </div>

        {/* Right Col: Output Analytics */}
        <div className="lg:col-span-7">
           <AnimatePresence mode="wait">
             {loading && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-panel h-[600px] flex flex-col items-center justify-center">
                 <div className="w-32 h-32 relative flex items-center justify-center mb-8">
                    <div className="absolute inset-0 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin"></div>
                    <Scan className="w-8 h-8 text-accent opacity-50 absolute" />
                 </div>
                 <h3 className="font-heading font-semibold text-lg text-foreground mb-2">Computational Scan Active</h3>
                 <p className="text-sm text-muted">Decoding matrices against known databases...</p>
               </motion.div>
             )}

             {!loading && !analysis && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel h-[600px] flex flex-col items-center justify-center bg-surface/30">
                 <div className="w-16 h-16 rounded-full border border-dashed border-border/20 flex items-center justify-center mb-4">
                    <Activity className="w-6 h-6 text-muted opacity-50" />
                 </div>
                 <p className="text-muted text-sm">Telemetry screen is standing by.</p>
               </motion.div>
             )}

             {!loading && analysis && (
               <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel overflow-hidden flex flex-col h-[700px]">
                 <div className="p-6 border-b border-border/5 bg-surface/80 backdrop-blur-md flex items-start justify-between">
                   <div>
                     <h2 className="font-heading font-semibold text-lg flex items-center gap-2 mb-1">
                       <Scanner className="w-5 h-5 text-accent"/> Diagnostic Report
                     </h2>
                     <p className="text-xs font-mono text-muted flex items-center gap-2">
                       ID: {analysis.analyzedAt.substring(0,8).replace(/-/g,'')} • {analysis.foodItems.length} entities tracked
                     </p>
                   </div>
                 </div>

                 <div className="flex-1 p-8 overflow-y-auto custom-scrollbar prose prose-invert prose-p:leading-relaxed prose-headings:font-heading prose-a:text-accent max-w-none text-sm text-foreground/90">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {analysis.analysis}
                    </ReactMarkdown>
                 </div>

                 <div className="p-4 border-t border-border/5 bg-surface mt-auto">
                    <div className="flex gap-3 justify-end">
                       <button onClick={() => { setFoodInput(''); setAnalysis(null); }} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors border border-transparent">
                          Clear Output
                       </button>
                       <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-surface border border-border/10 hover:bg-foreground/10 rounded-lg transition-colors">
                          <Printer className="w-4 h-4"/> Print
                       </button>
                       <button onClick={() => { navigator.clipboard.writeText(analysis.analysis); alert('Copied to clipboard'); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-foreground text-black hover:bg-foreground/90 rounded-lg transition-colors">
                          Copy Diagnostic
                       </button>
                    </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Icon placeholder for scanner
function Scanner(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
      <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
      <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
      <line x1="7" y1="12" x2="17" y2="12"></line>
    </svg>
  );
}

export default FoodAnalyzer;
