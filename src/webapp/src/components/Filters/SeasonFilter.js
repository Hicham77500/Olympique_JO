import React from 'react';

const SeasonFilter = ({ selectedSeasons, onChange, disabled = false }) => {
  const seasons = [
    { value: 'Summer', label: '🌞 Été', color: '#facc15' },
    { value: 'Winter', label: '❄️ Hiver', color: '#3b82f6' }
  ];

  const handleSeasonToggle = (seasonValue) => {
    const newSeasons = selectedSeasons.includes(seasonValue)
      ? selectedSeasons.filter(s => s !== seasonValue)
      : [...selectedSeasons, seasonValue];
    
    onChange(newSeasons);
  };

  const isAllSelected = selectedSeasons.length === 0;
  const isSeasonSelected = (seasonValue) => selectedSeasons.includes(seasonValue);

  return (
    <div className="filter-group">
      <label className="filter-label">
        🗓️ Saisons Olympiques
      </label>
      
      <div className="season-filter-container">
        {/* Option "Toutes les saisons" */}
        <button
          className={`season-option ${isAllSelected ? 'selected' : ''}`}
          onClick={() => onChange([])}
          disabled={disabled}
        >
          <span className="season-icon">🏅</span>
          <span className="season-label">Toutes les saisons</span>
          {isAllSelected && <span className="check-icon">✓</span>}
        </button>

        {/* Options individuelles */}
        {seasons.map(season => (
          <button
            key={season.value}
            className={`season-option ${isSeasonSelected(season.value) ? 'selected' : ''}`}
            onClick={() => handleSeasonToggle(season.value)}
            disabled={disabled}
            style={{
              '--season-color': season.color
            }}
          >
            <span className="season-icon">{season.label.split(' ')[0]}</span>
            <span className="season-label">{season.label.split(' ')[1]}</span>
            {isSeasonSelected(season.value) && <span className="check-icon">✓</span>}
          </button>
        ))}
      </div>

      <div className="filter-summary">
        {isAllSelected
          ? "Toutes les saisons"
          : `${selectedSeasons.length} saison${selectedSeasons.length > 1 ? 's' : ''} sélectionnée${selectedSeasons.length > 1 ? 's' : ''}`
        }
      </div>
    </div>
  );
};

export default SeasonFilter;