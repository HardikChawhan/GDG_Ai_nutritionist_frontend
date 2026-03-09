import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Info, ChevronRight, X, Flame, Beef, Wheat, Droplets, Database } from 'lucide-react';
import { nutritionAPI } from '../services/api';

function FoodSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return setError('Submit a valid query.');
    
    setLoading(true);
    setError('');
    
    try {
      const response = await nutritionAPI.searchFoods(searchQuery, 30);
      setSearchResults(response.data.data);
      if (response.data.data.length === 0) setError('Entity not found in matrix.');
    } catch (err) {
      setError('Matrix connection failure.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSearch(); };
  const formatNutrientValue = (nutrient) => {
    if (!nutrient) return 'N/A';
    return `${nutrient.amount.toFixed(2)} ${nutrient.unit}`;
  };

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
           <Database className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-4xl font-heading font-bold mb-4 tracking-tight">Food Database</h1>
        <p className="text-muted max-w-2xl mx-auto text-lg">Search through our extensive database of over 8,000 foods.</p>
      </div>

      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative group">
           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
             <Search className="w-5 h-5 text-muted group-focus-within:text-accent transition-colors" />
           </div>
           <input type="text" className="w-full bg-surface/50 border border-border/10 rounded-2xl pl-12 pr-32 py-4 text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none shadow-xl placeholder:text-foreground/20 transition-all text-lg" placeholder="e.g., chicken breast, quinoa, avocado" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={handleKeyPress} />
           <div className="absolute inset-y-2 right-2">
              <button disabled={loading} onClick={handleSearch} className="px-6 h-full bg-accent text-background rounded-xl font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Search'}
              </button>
           </div>
        </div>
        {error && <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="mt-4 text-sm font-medium text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center">{error}</motion.div>}
      </div>

      {searchResults.length > 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/5 pb-4">
             <h2 className="text-lg font-heading font-semibold">Matched Entities</h2>
             <span className="text-sm font-mono text-accent bg-accent/10 py-1 px-3 rounded-full">{searchResults.length} Hits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((food, i) => (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} key={food.fdcId} onClick={() => setSelectedFood(food)} className="glass-panel p-5 cursor-pointer hover:border-accent/40 group transition-all flex flex-col min-h-[160px]">
                <div className="flex-1">
                  <div className="text-xs font-mono text-muted uppercase tracking-wider mb-2">{food.category}</div>
                  <h3 className="font-heading font-semibold text-lg leading-tight mb-4 group-hover:text-accent transition-colors capitalize">{food.description.toLowerCase()}</h3>
                </div>
                
                <div className="flex items-center gap-4 mt-auto pt-4 border-t border-border/5">
                   <div className="flex items-center gap-1.5 basis-1/2">
                     <Flame className="w-4 h-4 text-orange-400" />
                     <span className="text-sm font-bold text-foreground">{food.nutrients['Energy']?.amount.toFixed(0) || '0'}</span>
                     <span className="text-[10px] text-muted uppercase">kcal</span>
                   </div>
                   <div className="flex items-center gap-1.5 basis-1/2">
                     <Beef className="w-4 h-4 text-rose-400" />
                     <span className="text-sm font-bold text-foreground">{food.nutrients['Protein']?.amount.toFixed(1) || '0'}</span>
                     <span className="text-[10px] text-muted uppercase">g Pro</span>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Detail View Modal */}
      <AnimatePresence>
        {selectedFood && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md" onClick={() => setSelectedFood(null)}>
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
               
               <div className="p-6 border-b border-border/5 bg-surface/50 flex items-start justify-between">
                 <div>
                   <div className="text-xs font-mono text-accent uppercase tracking-wider mb-1">Entity Profile [{selectedFood.fdcId}]</div>
                   <h2 className="text-2xl font-heading font-semibold capitalize pr-8">{selectedFood.description.toLowerCase()}</h2>
                   {selectedFood.servingSize && (
                     <p className="text-sm text-muted mt-2">Serving Basis: {selectedFood.servingSize} {selectedFood.servingSizeUnit}</p>
                   )}
                 </div>
                 <button onClick={() => setSelectedFood(null)} className="w-8 h-8 rounded-full bg-surface border border-border/10 flex items-center justify-center text-muted hover:text-white transition-colors shrink-0">
                    <X className="w-4 h-4" />
                 </button>
               </div>

               <div className="p-6 overflow-y-auto custom-scrollbar">
                 <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">Core Macros</h3>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                   <div className="bg-surface/50 border border-orange-500/20 rounded-xl p-4 flex flex-col items-center">
                     <Flame className="w-6 h-6 text-orange-400 mb-2"/>
                     <span className="text-xs text-muted uppercase font-medium mb-1">Energy</span>
                     <div className="flex items-baseline gap-1"><span className="text-xl font-bold">{selectedFood.nutrients['Energy']?.amount.toFixed(0) || '0'}</span><span className="text-xs text-muted">kcal</span></div>
                   </div>
                   <div className="bg-surface/50 border border-rose-500/20 rounded-xl p-4 flex flex-col items-center">
                     <Beef className="w-6 h-6 text-rose-400 mb-2"/>
                     <span className="text-xs text-muted uppercase font-medium mb-1">Protein</span>
                     <div className="flex items-baseline gap-1"><span className="text-xl font-bold">{selectedFood.nutrients['Protein']?.amount.toFixed(1) || '0'}</span><span className="text-xs text-muted">g</span></div>
                   </div>
                   <div className="bg-surface/50 border border-amber-500/20 rounded-xl p-4 flex flex-col items-center">
                     <Wheat className="w-6 h-6 text-amber-400 mb-2"/>
                     <span className="text-xs text-muted uppercase font-medium mb-1">Carbs</span>
                     <div className="flex items-baseline gap-1"><span className="text-xl font-bold">{selectedFood.nutrients['Carbohydrate, by difference']?.amount.toFixed(1) || '0'}</span><span className="text-xs text-muted">g</span></div>
                   </div>
                   <div className="bg-surface/50 border border-lime-500/20 rounded-xl p-4 flex flex-col items-center">
                     <Droplets className="w-6 h-6 text-lime-400 mb-2"/>
                     <span className="text-xs text-muted uppercase font-medium mb-1">Lipids</span>
                     <div className="flex items-baseline gap-1"><span className="text-xl font-bold">{selectedFood.nutrients['Total lipid (fat)']?.amount.toFixed(1) || '0'}</span><span className="text-xs text-muted">g</span></div>
                   </div>
                 </div>

                 <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">Micronutrient Profile</h3>
                 <div className="bg-surface border border-border/5 rounded-xl overflow-hidden divide-y divide-white/5">
                   {Object.entries(selectedFood.nutrients)
                    .filter(([name]) => !['Energy', 'Protein', 'Carbohydrate, by difference', 'Total lipid (fat)'].includes(name))
                    .sort((a,b) => b[1].amount - a[1].amount)
                    .slice(0, 15)
                    .map(([name, data]) => (
                      <div key={name} className="flex justify-between items-center py-3 px-4 hover:bg-foreground/[0.02] transition-colors">
                        <span className="text-sm font-medium text-foreground">{name}</span>
                        <span className="text-sm font-mono text-muted">{formatNutrientValue(data)}</span>
                      </div>
                    ))}
                 </div>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FoodSearch;
