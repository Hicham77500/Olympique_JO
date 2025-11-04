import React from 'react';
import YearFilter from './YearFilter';
import SeasonFilter from './SeasonFilter';
import CountryFilter from './CountryFilter';
import MedalFilter from './MedalFilter';
import MedalCountFilter from './MedalCountFilter';
import SportFilter from './SportFilter';
import GenderFilter from './GenderFilter';
import SearchFilter from './SearchFilter';
import './FilterPanel.css';

const FilterPanel = ({ 
  filters, 
  onFilterChange, 
  onNestedFilterChange,
  onResetFilters,
  isLoading,
  activeFiltersCount 
}) => {
  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <h2>🔍 Filtres de Recherche</h2>
        <div className="filter-actions">
          {activeFiltersCount > 0 && (
            <span className="active-filters-badge">
              {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            className="btn-reset-filters"
            onClick={onResetFilters}
            disabled={isLoading || activeFiltersCount === 0}
          >
            🗑️ Effacer tous les filtres
          </button>
        </div>
      </div>

      <div className="filters-grid">
        {/* Recherche textuelle */}
        <SearchFilter
          value={filters.searchTerm}
          onChange={(value) => onFilterChange('searchTerm', value)}
          disabled={isLoading}
        />

        {/* Filtre par années */}
        <YearFilter
          yearRange={filters.years}
          onChange={(range) => onNestedFilterChange('years', 'selected', range)}
          disabled={isLoading}
        />

        {/* Filtre par saisons */}
        <SeasonFilter
          selectedSeasons={filters.seasons}
          onChange={(seasons) => onFilterChange('seasons', seasons)}
          disabled={isLoading}
        />

        {/* Filtre par pays */}
        <CountryFilter
          selectedCountries={filters.countries}
          onChange={(countries) => onFilterChange('countries', countries)}
          disabled={isLoading}
        />

        {/* Filtre par genre */}
        <GenderFilter
          selectedGender={filters.gender}
          onChange={(gender) => onFilterChange('gender', gender)}
          disabled={isLoading}
        />

        {/* Filtre par type de médaille */}
        <MedalFilter
          selectedMedals={filters.medalTypes}
          onChange={(medals) => onFilterChange('medalTypes', medals)}
          disabled={isLoading}
        />

        {/* Filtre par nombre de médailles */}
        <MedalCountFilter
          countRange={filters.medalCount}
          onChange={(range) => onNestedFilterChange('medalCount', 'selected', range)}
          disabled={isLoading}
        />

        {/* Filtre par sports */}
        <SportFilter
          selectedSports={filters.sports}
          onChange={(sports) => onFilterChange('sports', sports)}
          disabled={isLoading}
        />
      </div>

      {isLoading && (
        <div className="filter-loading">
          <div className="loading-spinner"></div>
          <span>Mise à jour des résultats...</span>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;