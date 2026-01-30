import React, { useState, useEffect } from 'react';
import './NutritionCalendar.css';
import firebaseService from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';

// Cookie helper for calories burned
const getCaloriesBurnedFromCookie = (dateKey) => {
  const cookieKey = `caloriesBurned_${dateKey}`;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${cookieKey}=`);
  if (parts.length === 2) {
    return parseInt(parts.pop().split(';').shift()) || 0;
  }
  return 0;
};

const NutritionCalendar = () => {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthData();
  }, [currentDate, currentUser]);

  const loadMonthData = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Get all days in the month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const data = {};

      // Load nutrition data for each day
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        try {
          const nutritionData = await firebaseService.getDailyNutrition(currentUser.uid, dateKey);
          const caloriesBurned = getCaloriesBurnedFromCookie(dateKey);
          
          if ((nutritionData && nutritionData.foods && nutritionData.foods.length > 0) || caloriesBurned > 0) {
            data[dateKey] = {
              ...nutritionData,
              caloriesBurned: caloriesBurned
            };
          }
        } catch (error) {
          console.error(`Error loading data for ${dateKey}:`, error);
        }
      }

      setMonthData(data);
    } catch (error) {
      console.error('Error loading month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startOffset = firstDay.getDay(); // 0 = Sunday
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (date) => {
    if (!date) return;
    
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(dateKey);
    setSelectedDayData(monthData[dateKey] || null);
  };

  const getCaloriesForDate = (date) => {
    if (!date) return null;
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const data = monthData[dateKey];
    return data?.totals?.calories || 0;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const days = getDaysInMonth(currentDate);

  return (
    <div className="nutrition-calendar">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="nav-btn">←</button>
        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <button onClick={handleNextMonth} className="nav-btn">→</button>
      </div>

      {loading ? (
        <div className="calendar-loading">Loading calendar data...</div>
      ) : (
        <>
          <div className="calendar-grid">
            <div className="calendar-day-header">Sun</div>
            <div className="calendar-day-header">Mon</div>
            <div className="calendar-day-header">Tue</div>
            <div className="calendar-day-header">Wed</div>
            <div className="calendar-day-header">Thu</div>
            <div className="calendar-day-header">Fri</div>
            <div className="calendar-day-header">Sat</div>

            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="calendar-day empty"></div>;
              }

              const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const calories = getCaloriesForDate(date);
              const hasData = monthData[dateKey];
              const isSelected = selectedDate === dateKey;
              const todayClass = isToday(date) ? 'today' : '';

              return (
                <div
                  key={dateKey}
                  className={`calendar-day ${hasData ? 'has-data' : ''} ${isSelected ? 'selected' : ''} ${todayClass}`}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="day-number">{date.getDate()}</div>
                  {hasData && (
                    <div className="day-calories">{calories} cal</div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedDayData && (
            <div className="day-details">
              <h3>📅 {selectedDate}</h3>
              
              <div className="day-summary">
                <div className="macro-item">
                  <span className="macro-label">🔥 Calories:</span>
                  <span className="macro-value">{selectedDayData.totals?.calories || 0}</span>
                </div>
                <div className="macro-item">
                  <span className="macro-label">💪 Protein:</span>
                  <span className="macro-value">{selectedDayData.totals?.protein || 0}g</span>
                </div>
                <div className="macro-item">
                  <span className="macro-label">🍞 Carbs:</span>
                  <span className="macro-value">{selectedDayData.totals?.carbohydrates || 0}g</span>
                </div>
                <div className="macro-item">
                  <span className="macro-label">🥑 Fat:</span>
                  <span className="macro-value">{selectedDayData.totals?.fat || 0}g</span>
                </div>
                {selectedDayData.caloriesBurned > 0 && (
                  <div className="macro-item workout">
                    <span className="macro-label">🏋️ Calories Burned:</span>
                    <span className="macro-value">{selectedDayData.caloriesBurned}</span>
                  </div>
                )}
              </div>

              <h4>Foods Eaten:</h4>
              <div className="foods-list">
                {selectedDayData.foods && selectedDayData.foods.length > 0 ? (
                  selectedDayData.foods.map((food, index) => (
                    <div key={index} className="food-item">
                      <span className="food-name">{food.name}</span>
                      <span className="food-calories">{food.calories} cal</span>
                    </div>
                  ))
                ) : (
                  <div className="no-foods">No foods logged this day</div>
                )}
              </div>
            </div>
          )}

          {!selectedDate && (
            <div className="calendar-hint">
              Click on any date to see what you ate that day
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NutritionCalendar;
