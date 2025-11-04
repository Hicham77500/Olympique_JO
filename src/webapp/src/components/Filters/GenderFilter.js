import React from 'react';

const GenderFilter = ({ selectedGender, onChange, disabled = false }) => {
  const genderOptions = [
    { value: '', label: 'Tous les genres', icon: '👥' },
    { value: 'M', label: 'Hommes', icon: '👨' },
    { value: 'F', label: 'Femmes', icon: '👩' }
  ];

  const handleGenderChange = (genderValue) => {
    onChange(genderValue);
  };

  return (
    <div className="filter-group">
      <label className="filter-label">
        👥 Genre des Athlètes
      </label>
      
      <div className="gender-filter-container">
        {genderOptions.map(option => (
          <button
            key={option.value}
            className={`gender-option ${selectedGender === option.value ? 'selected' : ''}`}
            onClick={() => handleGenderChange(option.value)}
            disabled={disabled}
          >
            <span className="gender-icon">{option.icon}</span>
            <span className="gender-label">{option.label}</span>
            {selectedGender === option.value && <span className="check-icon">✓</span>}
          </button>
        ))}
      </div>

      <div className="filter-summary">
        {genderOptions.find(opt => opt.value === selectedGender)?.label || 'Tous les genres'}
      </div>
    </div>
  );
};

export default GenderFilter;