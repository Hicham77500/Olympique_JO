import React from 'react';

const MedalFilter = ({ selectedMedals, onChange, disabled = false }) => {
  const medals = [
    { value: 'GOLD', label: 'Or', icon: '🥇', color: '#FFD700' },
    { value: 'SILVER', label: 'Argent', icon: '🥈', color: '#C0C0C0' },
    { value: 'BRONZE', label: 'Bronze', icon: '🥉', color: '#CD7F32' }
  ];

  const handleMedalToggle = (medalValue) => {
    const newMedals = selectedMedals.includes(medalValue)
      ? selectedMedals.filter(m => m !== medalValue)
      : [...selectedMedals, medalValue];
    
    onChange(newMedals);
  };

  const isAllSelected = selectedMedals.length === 0;
  const isMedalSelected = (medalValue) => selectedMedals.includes(medalValue);

  const handleSelectAll = () => {
    onChange([]);
  };

  const handleSelectAllMedals = () => {
    onChange(medals.map(m => m.value));
  };

  return (
    <div className="filter-group">
      <label className="filter-label">
        🏆 Types de Médailles
        {selectedMedals.length > 0 && (
          <span className="filter-count">({selectedMedals.length} sélectionnés)</span>
        )}
      </label>
      
      <div className="medal-filter-container">
        {/* Options de médailles */}
        <div className="medal-options">
          {medals.map(medal => (
            <button
              key={medal.value}
              className={`medal-option ${isMedalSelected(medal.value) ? 'selected' : ''}`}
              onClick={() => handleMedalToggle(medal.value)}
              disabled={disabled}
              style={{
                '--medal-color': medal.color
              }}
            >
              <span className="medal-icon">{medal.icon}</span>
              <span className="medal-label">{medal.label}</span>
              {isMedalSelected(medal.value) && <span className="check-icon">✓</span>}
            </button>
          ))}
        </div>

        {/* Actions rapides */}
        <div className="medal-actions">
          <button
            className={`action-btn ${isAllSelected ? 'active' : ''}`}
            onClick={handleSelectAll}
            disabled={disabled}
          >
            Toutes les médailles
          </button>
          <button
            className={`action-btn ${selectedMedals.length === 3 ? 'active' : ''}`}
            onClick={handleSelectAllMedals}
            disabled={disabled}
          >
            Or + Argent + Bronze
          </button>
        </div>
      </div>

      <div className="filter-summary">
        {isAllSelected
          ? "Toutes les médailles"
          : selectedMedals.length === 1
          ? `Médailles ${medals.find(m => m.value === selectedMedals[0])?.label}`
          : `${selectedMedals.length} types de médailles`
        }
      </div>

      {/* Statistiques rapides (si disponibles) */}
      <div className="medal-stats">
        {selectedMedals.map(medalType => {
          const medal = medals.find(m => m.value === medalType);
          return medal ? (
            <div key={medalType} className="medal-stat">
              <span className="medal-icon-small">{medal.icon}</span>
              <span className="medal-name">{medal.label}</span>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
};

export default MedalFilter;