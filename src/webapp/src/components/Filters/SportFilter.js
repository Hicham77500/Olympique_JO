import React, { useMemo } from 'react';
import Select from 'react-select';
import { useFilterOptions } from '../../hooks/useOlympicData';

const SportFilter = ({ selectedSports, onChange, disabled = false }) => {
  const { sports, isLoading } = useFilterOptions();

  // Convertir les sports en format react-select
  const sportOptions = useMemo(() => {
    if (!sports || sports.length === 0) return [];
    
    return sports.map(sport => ({
      value: sport,
      label: sport,
      icon: getSportIcon(sport)
    }));
  }, [sports]);

  // Convertir les sports sélectionnés en format react-select
  const selectedOptions = useMemo(() => {
    return selectedSports.map(sport => ({
      value: sport,
      label: sport,
      icon: getSportIcon(sport)
    }));
  }, [selectedSports]);

  const handleChange = (selectedOptions) => {
    const values = selectedOptions ? selectedOptions.map(option => option.value) : [];
    onChange(values);
  };

  // Fonction utilitaire pour obtenir l'icône du sport
  function getSportIcon(sportName) {
    const iconMap = {
      'Athletics': '🏃',
      'Swimming': '🏊',
      'Gymnastics': '🤸',
      'Basketball': '🏀',
      'Football': '⚽',
      'Tennis': '🎾',
      'Boxing': '🥊',
      'Wrestling': '🤼',
      'Weightlifting': '🏋️',
      'Cycling': '🚴',
      'Rowing': '🚣',
      'Sailing': '⛵',
      'Shooting': '🎯',
      'Archery': '🏹',
      'Fencing': '🤺',
      'Judo': '🥋',
      'Taekwondo': '🥋',
      'Volleyball': '🏐',
      'Handball': '🤾',
      'Hockey': '🏑',
      'Golf': '⛳',
      'Rugby': '🏉',
      'Baseball': '⚾',
      'Softball': '🥎',
      'Badminton': '🏸',
      'Table Tennis': '🏓',
      'Equestrian': '🏇',
      'Triathlon': '🏊‍♂️🚴‍♂️🏃‍♂️',
      'Modern Pentathlon': '🤺🏇🏊‍♂️🏃‍♂️🎯',
      'Canoe': '🛶',
      'Diving': '🤿',
      'Water Polo': '🤽',
      'Synchronized Swimming': '🤽‍♀️',
      'Alpine Skiing': '⛷️',
      'Cross Country Skiing': '🎿',
      'Ski Jumping': '🎿',
      'Nordic Combined': '🎿',
      'Biathlon': '🎿🎯',
      'Freestyle Skiing': '🎿',
      'Snowboarding': '🏂',
      'Figure Skating': '⛸️',
      'Speed Skating': '⛸️',
      'Short Track Speed Skating': '⛸️',
      'Ice Hockey': '🏒',
      'Curling': '🥌',
      'Bobsleigh': '🛷',
      'Luge': '🛷',
      'Skeleton': '🛷'
    };
    return iconMap[sportName] || '🏅';
  }

  // Style personnalisé pour react-select
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '42px',
      borderColor: state.isFocused ? '#16a34a' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 1px #16a34a' : 'none',
      '&:hover': {
        borderColor: '#16a34a'
      }
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#dcfce7',
      borderRadius: '6px'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#166534',
      fontWeight: '500'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#166534',
      ':hover': {
        backgroundColor: '#bbf7d0',
        color: '#14532d'
      }
    })
  };

  // Composant personnalisé pour les options
  const formatOptionLabel = ({ label, icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );

  // Fonction de filtrage personnalisée
  const filterOption = (option, inputValue) => {
    return option.label.toLowerCase().includes(inputValue.toLowerCase());
  };

  return (
    <div className="filter-group">
      <label className="filter-label">
        🏅 Sports
        {selectedSports.length > 0 && (
          <span className="filter-count">({selectedSports.length} sélectionnés)</span>
        )}
      </label>
      
      <div className="sport-filter-container">
        <Select
          isMulti
          isSearchable
          isClearable
          value={selectedOptions}
          onChange={handleChange}
          options={sportOptions}
          placeholder={isLoading ? "Chargement des sports..." : "Rechercher et sélectionner des sports..."}
          noOptionsMessage={() => "Aucun sport trouvé"}
          loadingMessage={() => "Chargement..."}
          isLoading={isLoading}
          isDisabled={disabled}
          styles={customStyles}
          formatOptionLabel={formatOptionLabel}
          filterOption={filterOption}
          className="sport-select"
          classNamePrefix="sport-select"
          maxMenuHeight={200}
          closeMenuOnSelect={false}
          hideSelectedOptions={false}
        />
      </div>

      <div className="filter-summary">
        {selectedSports.length === 0
          ? "Tous les sports"
          : selectedSports.length === 1
          ? `1 sport sélectionné : ${selectedSports[0]}`
          : `${selectedSports.length} sports sélectionnés`
        }
      </div>

      {/* Raccourcis pour sélections rapides */}
      <div className="sport-shortcuts">
        <button
          className="shortcut-btn"
          onClick={() => onChange(['Athletics', 'Swimming', 'Gymnastics'])}
          disabled={disabled}
        >
          Sports populaires
        </button>
        <button
          className="shortcut-btn"
          onClick={() => onChange(['Alpine Skiing', 'Figure Skating', 'Ice Hockey', 'Speed Skating'])}
          disabled={disabled}
        >
          Sports d'hiver
        </button>
        <button
          className="shortcut-btn"
          onClick={() => onChange(['Basketball', 'Football', 'Tennis', 'Volleyball'])}
          disabled={disabled}
        >
          Sports d'équipe
        </button>
        <button
          className="shortcut-btn"
          onClick={() => onChange([])}
          disabled={disabled || selectedSports.length === 0}
        >
          Effacer
        </button>
      </div>
    </div>
  );
};

export default SportFilter;