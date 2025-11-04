import { useState } from 'react';

/**
 * Hook pour persister des données dans localStorage
 * @param {string} key - Clé de stockage
 * @param {*} initialValue - Valeur initiale
 * @returns {[*, Function]} [value, setValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // Récupérer la valeur du localStorage ou utiliser la valeur initiale
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Erreur lors de la lecture de localStorage pour "${key}":`, error);
      return initialValue;
    }
  });

  // Fonction pour mettre à jour la valeur
  const setValue = (value) => {
    try {
      // Permettre à value d'être une fonction pour la même API que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Sauvegarder dans l'état
      setStoredValue(valueToStore);
      
      // Sauvegarder dans localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Erreur lors de l'écriture dans localStorage pour "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

/**
 * Hook pour persister les filtres dans localStorage
 */
export const usePersistedFilters = (initialFilters) => {
  const [filters, setFilters] = useLocalStorage('olympicDashboardFilters', initialFilters);

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setFilters(initialFilters);
  };

  // Fonction pour mettre à jour un filtre
  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters
  };
};

export default useLocalStorage;