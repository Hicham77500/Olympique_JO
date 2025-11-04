import React, { useMemo } from 'react';
import Select from 'react-select';
import { useFilterOptions } from '../../hooks/useOlympicData';

const CountryFilter = ({ selectedCountries, onChange, disabled = false }) => {
  const { countries, isLoading } = useFilterOptions();

  // Convertir les pays en format react-select
  const countryOptions = useMemo(() => {
    if (!countries || countries.length === 0) return [];
    
    return countries.map(country => ({
      value: country,
      label: country,
      // Ajouter des drapeaux ou des codes si disponibles
      flag: getCountryFlag(country)
    }));
  }, [countries]);

  // Convertir les pays sélectionnés en format react-select
  const selectedOptions = useMemo(() => {
    return selectedCountries.map(country => ({
      value: country,
      label: country,
      flag: getCountryFlag(country)
    }));
  }, [selectedCountries]);

  const handleChange = (selectedOptions) => {
    const values = selectedOptions ? selectedOptions.map(option => option.value) : [];
    onChange(values);
  };

  // Fonction utilitaire pour obtenir l'emoji du drapeau (simple mapping)
  function getCountryFlag(countryName) {
    const flagMap = {
      'USA': '🇺🇸',
      'France': '🇫🇷',
      'Germany': '🇩🇪',
      'China': '🇨🇳',
      'Russia': '🇷🇺',
      'Japan': '🇯🇵',
      'Great Britain': '🇬🇧',
      'Italy': '🇮🇹',
      'Spain': '🇪🇸',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺',
      'Brazil': '🇧🇷',
      'Netherlands': '🇳🇱',
      'Sweden': '🇸🇪',
      'Norway': '🇳🇴',
      'Switzerland': '🇨🇭',
      'Austria': '🇦🇹',
      'Belgium': '🇧🇪',
      'Denmark': '🇩🇰',
      'Finland': '🇫🇮',
      'Poland': '🇵🇱',
      'Greece': '🇬🇷',
      'South Korea': '🇰🇷',
      'India': '🇮🇳',
      'Mexico': '🇲🇽',
      'Argentina': '🇦🇷',
      'South Africa': '🇿🇦',
      'New Zealand': '🇳🇿'
    };
    return flagMap[countryName] || '🏳️';
  }

  // Style personnalisé pour react-select
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '42px',
      borderColor: state.isFocused ? '#1d4ed8' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 1px #1d4ed8' : 'none',
      '&:hover': {
        borderColor: '#1d4ed8'
      }
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#dbeafe',
      borderRadius: '6px'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#1e40af',
      fontWeight: '500'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#1e40af',
      ':hover': {
        backgroundColor: '#bfdbfe',
        color: '#1e3a8a'
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9ca3af'
    }),
    loadingMessage: (provided) => ({
      ...provided,
      color: '#6b7280'
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#6b7280'
    })
  };

  // Composant personnalisé pour les options
  const formatOptionLabel = ({ label, flag }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '16px' }}>{flag}</span>
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
        🌍 Pays
        {selectedCountries.length > 0 && (
          <span className="filter-count">({selectedCountries.length} sélectionnés)</span>
        )}
      </label>
      
      <div className="country-filter-container">
        <Select
          isMulti
          isSearchable
          isClearable
          value={selectedOptions}
          onChange={handleChange}
          options={countryOptions}
          placeholder={isLoading ? "Chargement des pays..." : "Rechercher et sélectionner des pays..."}
          noOptionsMessage={() => "Aucun pays trouvé"}
          loadingMessage={() => "Chargement..."}
          isLoading={isLoading}
          isDisabled={disabled}
          styles={customStyles}
          formatOptionLabel={formatOptionLabel}
          filterOption={filterOption}
          className="country-select"
          classNamePrefix="country-select"
          maxMenuHeight={200}
          closeMenuOnSelect={false}
          hideSelectedOptions={false}
          components={{
            // Composant personnalisé pour le placeholder
            Placeholder: ({ children, ...props }) => (
              <div {...props}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🔍 {children}
                </span>
              </div>
            )
          }}
        />
      </div>

      <div className="filter-summary">
        {selectedCountries.length === 0
          ? "Tous les pays"
          : selectedCountries.length === 1
          ? `1 pays sélectionné : ${selectedCountries[0]}`
          : `${selectedCountries.length} pays sélectionnés`
        }
      </div>

      {/* Raccourcis pour sélections rapides */}
      <div className="country-shortcuts">
        <button
          className="shortcut-btn"
          onClick={() => onChange(['USA', 'China', 'Great Britain', 'Russia', 'Germany'])}
          disabled={disabled}
        >
          Top 5 Pays
        </button>
        <button
          className="shortcut-btn"
          onClick={() => onChange(['France', 'Germany', 'Italy', 'Spain', 'Great Britain', 'Netherlands'])}
          disabled={disabled}
        >
          Europe
        </button>
        <button
          className="shortcut-btn"
          onClick={() => onChange([])}
          disabled={disabled || selectedCountries.length === 0}
        >
          Effacer
        </button>
      </div>
    </div>
  );
};

export default CountryFilter;