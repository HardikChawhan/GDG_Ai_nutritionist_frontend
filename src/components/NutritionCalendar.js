import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flame, Beef, Wheat, Droplets, Activity, Utensils } from 'lucide-react';
import firebaseService from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

const getCaloriesBurnedFromCookie = (dateKey) => {
  const cookieKey = `caloriesBurned_${dateKey}`;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${cookieKey}=`);
  if (parts.length === 2) return parseInt(parts.pop().split(';').shift()) || 0;
  return 0;
};

const NutritionCalendar = () => {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMonthData(); }, [currentDate, currentUser]);

  const loadMonthData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const data = {};

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        try {
          const nutritionData = await firebaseService.getDailyNutrition(currentUser.uid, dateKey);
          const caloriesBurned = getCaloriesBurnedFromCookie(dateKey);
          if ((nutritionData && nutritionData.foods && nutritionData.foods.length > 0) || caloriesBurned > 0) {
            data[dateKey] = { ...nutritionData, caloriesBurned };
          }
        } catch (error) { }
      }
      setMonthData(data);
    } catch (error) { } finally { setLoading(false); }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear(); const month = date.getMonth();
    const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0);
    const days = []; const startOffset = firstDay.getDay();
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) days.push(new Date(year, month, day));
    return days;
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const handleDateClick = (date) => {
    if (!date) return;
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(dateKey); setSelectedDayData(monthData[dateKey] || null);
  };

  const getCaloriesForDate = (date) => {
    if (!date) return null;
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return monthData[dateKey]?.totals?.calories || 0;
  };

  const isToday = (date) => {
    if (!date) return false;
    return date.toDateString() === new Date().toDateString();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6">
          <CalendarIcon className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-4xl font-heading font-bold mb-4 tracking-tight">Daily Activity Log</h1>
        <p className="text-muted max-w-2xl mx-auto text-lg">Overview of your daily food intake and activity</p>
      </div>

      <div className="flex flex-col items-center gap-10 w-full max-w-3xl mx-auto">

        {/* Calendar View */}
        <div className="w-full">
          <div className="glass-panel p-3 sm:p-6">

            <div className="flex items-center justify-between mb-8 px-1 sm:px-2">
              <button onClick={handlePrevMonth} className="w-10 h-10 rounded-full border border-border/10 flex items-center justify-center hover:bg-foreground/5 transition-colors">
                <ChevronLeft className="w-5 h-5 text-muted" />
              </button>
              <h2 className="text-xl font-heading font-bold uppercase tracking-wider">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button onClick={handleNextMonth} className="w-10 h-10 rounded-full border border-border/10 flex items-center justify-center hover:bg-foreground/5 transition-colors">
                <ChevronRight className="w-5 h-5 text-muted" />
              </button>
            </div>

            {loading ? (
              <div className="h-[400px] flex flex-col items-center justify-center">
                <Activity className="w-8 h-8 text-accent animate-pulse mb-4" />
                <span className="text-sm font-mono text-muted">Retrieving temporal logs...</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted pb-2 sm:pb-4">
                    {day}
                  </div>
                ))}

                {days.map((date, index) => {
                  const dateKey = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null;
                  const calories = date ? getCaloriesForDate(date) : null;
                  const hasData = dateKey ? monthData[dateKey] : false;
                  const isSelected = selectedDate === dateKey;
                  const today = isToday(date);

                  return (
                    <button
                      key={index}
                      disabled={!date}
                      onClick={() => handleDateClick(date)}
                      className={cn(
                        "aspect-square p-1 sm:p-2 rounded-lg sm:rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer relative overflow-hidden group",
                        !date ? "border-transparent cursor-default" : "border-border/5 hover:border-border/20 bg-surface/30",
                        hasData && "bg-surface/80 border-border/10",
                        isSelected && "ring-2 ring-accent border-accent bg-accent/10",
                        today && !isSelected && "border-blue-500/50"
                      )}
                    >
                      {today && <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 sm:w-8 h-1 bg-blue-500 rounded-full"></div>}

                      <div className={cn("text-xs sm:text-lg font-heading font-semibold", hasData ? "text-foreground" : "text-muted", isSelected && "text-accent")}>
                        {date ? date.getDate() : ''}
                      </div>

                      {hasData && calories > 0 && (
                        <div className={cn("text-[8px] sm:text-[10px] uppercase font-bold tracking-tighter sm:tracking-wider mt-0.5 sm:mt-1 w-full text-center truncate", isSelected ? "text-accent" : "text-emerald-400")}>
                          {calories}<span className="hidden sm:inline"> cal</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Date Analytics */}
        <div className="w-full">
          {selectedDayData && selectedDate ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
              <div className="border-b border-border/5 pb-4 mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-1 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" /> Selected Log
                </h3>
                <div className="text-2xl font-heading font-bold">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
              </div>

              <div className="space-y-6">
                {/* Macros */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface/80 p-3 rounded-xl border border-border/5">
                    <div className="flex items-center gap-2 mb-1"><Flame className="w-4 h-4 text-emerald-400" /><span className="text-xs text-muted uppercase">Intake</span></div>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-xl font-bold leading-none">{selectedDayData.totals?.calories || 0}</span>
                      <span className="text-xs text-muted font-normal">kcal</span>
                    </div>
                  </div>
                  <div className="bg-surface/80 p-3 rounded-xl border border-border/5">
                    <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-orange-400" /><span className="text-xs text-muted uppercase">Output</span></div>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-xl font-bold leading-none">{selectedDayData.caloriesBurned || 0}</span>
                      <span className="text-xs text-muted font-normal">kcal</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface/50 rounded-xl border border-border/5 p-4 flex justify-between">
                  <div className="text-center w-1/3">
                    <Beef className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                    <div className="text-xs text-muted uppercase mb-1">Pro</div>
                    <div className="font-bold text-sm">{selectedDayData.totals?.protein || 0}g</div>
                  </div>
                  <div className="text-center w-1/3">
                    <Wheat className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <div className="text-xs text-muted uppercase mb-1">Carb</div>
                    <div className="font-bold text-sm">{selectedDayData.totals?.carbohydrates || 0}g</div>
                  </div>
                  <div className="text-center w-1/3">
                    <Droplets className="w-4 h-4 text-lime-400 mx-auto mb-1" />
                    <div className="text-xs text-muted uppercase mb-1">Fat</div>
                    <div className="font-bold text-sm">{selectedDayData.totals?.fat || 0}g</div>
                  </div>
                </div>

                {/* Food List */}
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><Utensils className="w-4 h-4" /> Input Log</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {selectedDayData.foods && selectedDayData.foods.length > 0 ? (
                      selectedDayData.foods.map((food, index) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-surface/30 border border-border/5 hover:border-border/10 transition-colors gap-3">
                          <span className="text-sm font-medium capitalize truncate">{food.description || food.name}</span>
                          <span className="text-sm font-mono text-muted shrink-0 whitespace-nowrap">{food.calories || food.nutrition?.calories || 0} kcal</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-4 text-sm text-muted bg-surface/30 rounded-lg border border-dashed border-border/10">
                        No nutritional inputs logged on this day.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-panel p-10 flex flex-col items-center justify-center text-center w-full min-h-[200px]">
              <div className="w-16 h-16 rounded-full border border-dashed border-border/20 flex items-center justify-center mb-6">
                <CalendarIcon className="w-6 h-6 text-muted" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">No Date Selected</h3>
              <p className="text-sm text-muted">Select a date from the calendar to view your recorded data</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default NutritionCalendar;
