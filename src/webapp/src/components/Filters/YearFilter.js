import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const YearFilter = ({ yearRange, onChange, disabled = false }) => {
  const handleRangeChange = (values) => {
    onChange(values);
  };

  const formatYear = (year) => year.toString();

  return (
    <div className="filter-group">
      <label className="filter-label">
        📅 Années Olympiques
        <span className="filter-range">
          {yearRange.selected[0]} - {yearRange.selected[1]}
        </span>
      </label>
      
      <div className="year-filter-container">
        <Slider
          range
          min={yearRange.min}
          max={yearRange.max}
          value={yearRange.selected}
          onChange={handleRangeChange}
          disabled={disabled}
          marks={{
            [yearRange.min]: formatYear(yearRange.min),
            1936: '1936',
            1972: '1972',
            2000: '2000',
            [yearRange.max]: formatYear(yearRange.max)
          }}
          step={4} // Tous les 4 ans (cycles olympiques)
          className="year-slider"
          trackStyle={[{ backgroundColor: '#1d4ed8' }]}
          handleStyle={[
            { borderColor: '#1d4ed8', backgroundColor: '#1d4ed8' },
            { borderColor: '#1d4ed8', backgroundColor: '#1d4ed8' }
          ]}
          railStyle={{ backgroundColor: '#e5e7eb' }}
        />
        
        <div className="year-inputs">
          <div className="year-input-group">
            <label>De :</label>
            <input
              type="number"
              min={yearRange.min}
              max={yearRange.max}
              step={4}
              value={yearRange.selected[0]}
              onChange={(e) => {
                const newMin = parseInt(e.target.value);
                if (newMin <= yearRange.selected[1]) {
                  onChange([newMin, yearRange.selected[1]]);
                }
              }}
              disabled={disabled}
              className="year-input"
            />
          </div>
          
          <div className="year-input-group">
            <label>À :</label>
            <input
              type="number"
              min={yearRange.min}
              max={yearRange.max}
              step={4}
              value={yearRange.selected[1]}
              onChange={(e) => {
                const newMax = parseInt(e.target.value);
                if (newMax >= yearRange.selected[0]) {
                  onChange([yearRange.selected[0], newMax]);
                }
              }}
              disabled={disabled}
              className="year-input"
            />
          </div>
        </div>
      </div>
      
      <div className="filter-summary">
        {yearRange.selected[0] === yearRange.min && yearRange.selected[1] === yearRange.max
          ? "Toutes les années"
          : `${Math.floor((yearRange.selected[1] - yearRange.selected[0]) / 4) + 1} éditions olympiques`
        }
      </div>
    </div>
  );
};

export default YearFilter;