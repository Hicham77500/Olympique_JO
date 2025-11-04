import React, { useState, useEffect } from 'react';

const SearchFilter = ({ value, onChange, disabled = false }) => {
  const [localValue, setLocalValue] = useState(value);

  // Synchroniser avec la valeur externe
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Débouncer les changements de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  const handleInputChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="filter-group">
      <label className="filter-label">
        🔍 Recherche Textuelle
      </label>
      
      <div className="search-filter-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={localValue}
            onChange={handleInputChange}
            placeholder="Rechercher un athlète, pays, sport, ville..."
            disabled={disabled}
            className="search-input"
          />
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="clear-search-btn"
              title="Effacer la recherche"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="filter-summary">
        {value ? `Recherche : "${value}"` : "Aucune recherche active"}
      </div>

      {/* Suggestions de recherche */}
      <div className="search-suggestions">
        <span className="suggestions-label">Suggestions :</span>
        <div className="suggestion-tags">
          <button
            className="suggestion-tag"
            onClick={() => {
              setLocalValue('Michael Phelps');
              onChange('Michael Phelps');
            }}
            disabled={disabled}
          >
            Michael Phelps
          </button>
          <button
            className="suggestion-tag"
            onClick={() => {
              setLocalValue('Swimming');
              onChange('Swimming');
            }}
            disabled={disabled}
          >
            Swimming
          </button>
          <button
            className="suggestion-tag"
            onClick={() => {
              setLocalValue('London');
              onChange('London');
            }}
            disabled={disabled}
          >
            London
          </button>
          <button
            className="suggestion-tag"
            onClick={() => {
              setLocalValue('2024');
              onChange('2024');
            }}
            disabled={disabled}
          >
            2024
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchFilter;