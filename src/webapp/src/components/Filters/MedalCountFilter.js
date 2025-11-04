import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const MedalCountFilter = ({ countRange, onChange, disabled = false }) => {
  const handleRangeChange = (values) => {
    onChange(values);
  };

  const formatCount = (count) => {
    if (count === 0) return '0';
    if (count >= 100) return '100+';
    return count.toString();
  };

  return (
    <div className="filter-group">
      <label className="filter-label">
        🏅 Nombre de Médailles
        <span className="filter-range">
          {formatCount(countRange.selected[0])} - {formatCount(countRange.selected[1])}
        </span>
      </label>
      
      <div className="medal-count-filter-container">
        <Slider
          range
          min={countRange.min}
          max={countRange.max}
          value={countRange.selected}
          onChange={handleRangeChange}
          disabled={disabled}
          marks={{
            [countRange.min]: formatCount(countRange.min),
            25: '25',
            50: '50',
            75: '75',
            [countRange.max]: formatCount(countRange.max)
          }}
          step={1}
          className="medal-count-slider"
          trackStyle={[{ backgroundColor: '#facc15' }]}
          handleStyle={[
            { borderColor: '#facc15', backgroundColor: '#facc15' },
            { borderColor: '#facc15', backgroundColor: '#facc15' }
          ]}
          railStyle={{ backgroundColor: '#e5e7eb' }}
        />
        
        <div className="count-inputs">
          <div className="count-input-group">
            <label>Min :</label>
            <input
              type="number"
              min={countRange.min}
              max={countRange.max}
              value={countRange.selected[0]}
              onChange={(e) => {
                const newMin = parseInt(e.target.value) || 0;
                if (newMin <= countRange.selected[1]) {
                  onChange([newMin, countRange.selected[1]]);
                }
              }}
              disabled={disabled}
              className="count-input"
            />
          </div>
          
          <div className="count-input-group">
            <label>Max :</label>
            <input
              type="number"
              min={countRange.min}
              max={countRange.max}
              value={countRange.selected[1]}
              onChange={(e) => {
                const newMax = parseInt(e.target.value) || 0;
                if (newMax >= countRange.selected[0]) {
                  onChange([countRange.selected[0], newMax]);
                }
              }}
              disabled={disabled}
              className="count-input"
            />
          </div>
        </div>
      </div>

      {/* Raccourcis pour plages communes */}
      <div className="count-shortcuts">
        <button
          className="shortcut-btn"
          onClick={() => onChange([1, 5])}
          disabled={disabled}
        >
          1-5 médailles
        </button>
        <button
          className="shortcut-btn"
          onClick={() => onChange([6, 15])}
          disabled={disabled}
        >
          6-15 médailles
        </button>
        <button
          className="shortcut-btn"
          onClick={() => onChange([16, 50])}
          disabled={disabled}
        >
          16-50 médailles
        </button>
        <button
          className="shortcut-btn"
          onClick={() => onChange([51, 100])}
          disabled={disabled}
        >
          50+ médailles
        </button>
      </div>
      
      <div className="filter-summary">
        {countRange.selected[0] === countRange.min && countRange.selected[1] === countRange.max
          ? "Tous les nombres de médailles"
          : countRange.selected[0] === countRange.selected[1]
          ? `Exactement ${formatCount(countRange.selected[0])} médaille${countRange.selected[0] > 1 ? 's' : ''}`
          : `Entre ${formatCount(countRange.selected[0])} et ${formatCount(countRange.selected[1])} médailles`
        }
      </div>
    </div>
  );
};

export default MedalCountFilter;