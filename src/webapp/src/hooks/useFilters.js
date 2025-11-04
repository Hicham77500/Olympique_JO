import { useState, useCallback } from 'react';

// État initial des filtres
const initialFilters = {
  years: {
    min: 1896,
    max: 2024,
    selected: [1896, 2024] // Range sélectionné
  },
  seasons: [], // ["Summer", "Winter"] ou [] pour tous
  countries: [], // ["USA", "France"] multi-select
  medalTypes: [], // ["Gold", "Silver", "Bronze"] ou [] pour tous
  medalCount: {
    min: 0,
    max: 100,
    selected: [0, 100] // Range de nombre de médailles
  },
  sports: [], // ["Athletics", "Swimming"] optionnel
  gender: '', // "M", "F" ou "" pour tous
  searchTerm: '' // Recherche texte libre
};

export const useFilters = () => {
  const [filters, setFilters] = useState(initialFilters);

  // Mettre à jour un filtre spécifique
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Mettre à jour un sous-filtre (ex: years.selected)
  const updateNestedFilter = useCallback((parentKey, childKey, value) => {
    setFilters(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [childKey]: value
      }
    }));
  }, []);

  // Réinitialiser tous les filtres
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = useCallback(() => {
    const current = filters;
    const initial = initialFilters;
    
    return (
      current.years.selected[0] !== initial.years.selected[0] ||
      current.years.selected[1] !== initial.years.selected[1] ||
      current.seasons.length > 0 ||
      current.countries.length > 0 ||
      current.medalTypes.length > 0 ||
      current.medalCount.selected[0] !== initial.medalCount.selected[0] ||
      current.medalCount.selected[1] !== initial.medalCount.selected[1] ||
      current.sports.length > 0 ||
      current.gender !== '' ||
      current.searchTerm !== ''
    );
  }, [filters]);

  // Compter le nombre de filtres actifs
  const activeFiltersCount = useCallback(() => {
    let count = 0;
    
    if (filters.years.selected[0] !== initialFilters.years.selected[0] ||
        filters.years.selected[1] !== initialFilters.years.selected[1]) count++;
    if (filters.seasons.length > 0) count++;
    if (filters.countries.length > 0) count++;
    if (filters.medalTypes.length > 0) count++;
    if (filters.medalCount.selected[0] !== initialFilters.medalCount.selected[0] ||
        filters.medalCount.selected[1] !== initialFilters.medalCount.selected[1]) count++;
    if (filters.sports.length > 0) count++;
    if (filters.gender !== '') count++;
    if (filters.searchTerm !== '') count++;
    
    return count;
  }, [filters]);

  // Convertir les filtres au format API
  const getApiFilters = useCallback(() => {
    const apiFilters = {};
    
    // Années
    if (filters.years.selected[0] !== initialFilters.years.selected[0] ||
        filters.years.selected[1] !== initialFilters.years.selected[1]) {
      apiFilters.yearMin = filters.years.selected[0];
      apiFilters.yearMax = filters.years.selected[1];
    }
    
    // Saisons
    if (filters.seasons.length > 0) {
      apiFilters.seasons = filters.seasons;
    }
    
    // Pays
    if (filters.countries.length > 0) {
      apiFilters.countries = filters.countries;
    }
    
    // Types de médailles
    if (filters.medalTypes.length > 0) {
      apiFilters.medalTypes = filters.medalTypes;
    }
    
    // Nombre de médailles
    if (filters.medalCount.selected[0] !== initialFilters.medalCount.selected[0] ||
        filters.medalCount.selected[1] !== initialFilters.medalCount.selected[1]) {
      apiFilters.medalCountMin = filters.medalCount.selected[0];
      apiFilters.medalCountMax = filters.medalCount.selected[1];
    }
    
    // Sports
    if (filters.sports.length > 0) {
      apiFilters.sports = filters.sports;
    }
    
    // Genre
    if (filters.gender !== '') {
      apiFilters.gender = filters.gender;
    }
    
    // Recherche
    if (filters.searchTerm !== '') {
      apiFilters.search = filters.searchTerm;
    }
    
    return apiFilters;
  }, [filters]);

  return {
    filters,
    updateFilter,
    updateNestedFilter,
    resetFilters,
    hasActiveFilters: hasActiveFilters(),
    activeFiltersCount: activeFiltersCount(),
    getApiFilters
  };
};

export default useFilters;