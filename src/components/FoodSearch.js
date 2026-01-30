import React, { useState } from 'react';
import { nutritionAPI } from '../services/api';
import './FoodSearch.css';

function FoodSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await nutritionAPI.searchFoods(searchQuery, 30);
      setSearchResults(response.data.data);
      if (response.data.data.length === 0) {
        setError('No foods found. Try a different search term.');
      }
    } catch (err) {
      setError('Failed to search foods. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const selectFood = (food) => {
    setSelectedFood(food);
  };

  const closeModal = () => {
    setSelectedFood(null);
  };

  const formatNutrientValue = (nutrient) => {
    if (!nutrient) return 'N/A';
    return `${nutrient.amount.toFixed(2)} ${nutrient.unit}`;
  };

  return (
    <div className="container food-search-container">
      {/* Hero Search Section */}
      <div className="search-hero">
        <div className="search-hero-content">
          <h1 className="search-hero-title">
            <span className="hero-icon">🔍</span>
            Food Database
          </h1>
          <p className="search-hero-subtitle">
            Explore nutritional information for 8,000+ foods
          </p>
        </div>

        <div className="search-bar-container">
          <div className="search-icon-wrapper">
            <span className="search-icon">🔍</span>
          </div>
          <input
            type="text"
            className="search-input-modern"
            placeholder="Search for any food... (e.g., chicken breast, banana, quinoa)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="btn-search"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Searching...
              </>
            ) : (
              <>
                <span>Search</span>
                <span className="search-arrow">→</span>
              </>
            )}
          </button>
        </div>

        {error && <div className="search-error">{error}</div>}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && !loading && (
        <div className="results-section">
          <div className="results-header-modern">
            <h2 className="results-count">
              <span className="count-badge">{searchResults.length}</span>
              Results for "<span className="query-text">{searchQuery}</span>"
            </h2>
          </div>

          <div className="food-grid-modern">
            {searchResults.map((food) => (
              <div 
                key={food.fdcId} 
                className="food-card-modern"
                onClick={() => selectFood(food)}
              >
                <div className="food-card-content">
                  <div className="food-icon-large">🍽️</div>
                  <h3 className="food-name-modern">{food.description}</h3>
                  <div className="food-category-badge">
                    {food.category}
                  </div>
                  <div className="food-quick-stats">
                    <div className="quick-stat">
                      <span className="stat-icon">🔥</span>
                      <span className="stat-value">
                        {food.nutrients['Energy']?.amount.toFixed(0) || 'N/A'}
                      </span>
                      <span className="stat-unit">cal</span>
                    </div>
                    <div className="quick-stat">
                      <span className="stat-icon">🥩</span>
                      <span className="stat-value">
                        {food.nutrients['Protein']?.amount.toFixed(1) || 'N/A'}
                      </span>
                      <span className="stat-unit">g</span>
                    </div>
                  </div>
                </div>
                <div className="food-card-footer">
                  <span className="view-details-text">View Details</span>
                  <span className="arrow-icon">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food Detail Modal */}
      {selectedFood && (
        <div className="food-modal-overlay" onClick={closeModal}>
          <div className="food-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-modern">
              <div className="modal-header-content">
                <div className="modal-food-icon">🍽️</div>
                <div>
                  <h2 className="modal-title-modern">{selectedFood.description}</h2>
                  <p className="modal-category-modern">{selectedFood.category}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <span>×</span>
              </button>
            </div>

            {selectedFood.servingSize && (
              <div className="modal-serving-info">
                <span className="serving-icon">📏</span>
                <span className="serving-text">
                  Serving Size: <strong>{selectedFood.servingSize} {selectedFood.servingSizeUnit}</strong>
                </span>
              </div>
            )}

            <div className="modal-body-modern">
              <h3 className="section-title-modern">Primary Nutrients</h3>
              <div className="primary-nutrients-grid">
                <div className="primary-nutrient-card calories">
                  <div className="nutrient-icon-large">🔥</div>
                  <div className="nutrient-info">
                    <div className="nutrient-label-large">Calories</div>
                    <div className="nutrient-value-large">
                      {selectedFood.nutrients['Energy']?.amount.toFixed(0) || 'N/A'}
                    </div>
                    <div className="nutrient-unit-large">kcal</div>
                  </div>
                </div>

                <div className="primary-nutrient-card protein">
                  <div className="nutrient-icon-large">🥩</div>
                  <div className="nutrient-info">
                    <div className="nutrient-label-large">Protein</div>
                    <div className="nutrient-value-large">
                      {selectedFood.nutrients['Protein']?.amount.toFixed(1) || 'N/A'}
                    </div>
                    <div className="nutrient-unit-large">g</div>
                  </div>
                </div>

                <div className="primary-nutrient-card carbs">
                  <div className="nutrient-icon-large">🍚</div>
                  <div className="nutrient-info">
                    <div className="nutrient-label-large">Carbs</div>
                    <div className="nutrient-value-large">
                      {selectedFood.nutrients['Carbohydrate, by difference']?.amount.toFixed(1) || 'N/A'}
                    </div>
                    <div className="nutrient-unit-large">g</div>
                  </div>
                </div>

                <div className="primary-nutrient-card fats">
                  <div className="nutrient-icon-large">🥑</div>
                  <div className="nutrient-info">
                    <div className="nutrient-label-large">Fat</div>
                    <div className="nutrient-value-large">
                      {selectedFood.nutrients['Total lipid (fat)']?.amount.toFixed(1) || 'N/A'}
                    </div>
                    <div className="nutrient-unit-large">g</div>
                  </div>
                </div>
              </div>

              <h3 className="section-title-modern">Detailed Nutrients</h3>
              <div className="detailed-nutrients-list">
                {Object.entries(selectedFood.nutrients)
                  .filter(([name]) => !['Energy', 'Protein', 'Carbohydrate, by difference', 'Total lipid (fat)'].includes(name))
                  .slice(0, 12)
                  .map(([name, data]) => (
                    <div key={name} className="detailed-nutrient-row">
                      <span className="nutrient-name-detailed">{name}</span>
                      <span className="nutrient-value-detailed">{formatNutrientValue(data)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FoodSearch;
