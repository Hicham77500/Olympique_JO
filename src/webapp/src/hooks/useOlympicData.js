import { useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { useDebounce } from './useDebounce';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Service API pour récupérer les données filtrées
const fetchOlympicData = async (apiFilters) => {
  const response = await axios.post(`${API_BASE_URL}/data/filtered`, {
    filters: apiFilters,
    aggregations: ['byCountry', 'byYear', 'byMedal', 'bySport']
  });
  return response.data;
};

// Service API pour récupérer les statistiques rapides
const fetchQuickStats = async (apiFilters) => {
  const params = new URLSearchParams();
  Object.entries(apiFilters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      params.append(key, value.join(','));
    } else {
      params.append(key, value);
    }
  });
  
  const response = await axios.get(`${API_BASE_URL}/stats/quick?${params}`);
  return response.data;
};

// Service API pour récupérer les options de filtres
const fetchFilterOptions = async () => {
  const response = await axios.get(`${API_BASE_URL}/filters`);
  return response.data;
};

/**
 * Hook principal pour les données olympiques
 * @param {Object} filters - Filtres à appliquer
 * @param {boolean} enabled - Si la requête doit être activée
 * @returns {Object} Données, état de chargement, erreurs
 */
export const useOlympicData = (filters, enabled = true) => {
  // Débouncer les filtres pour éviter trop de requêtes
  const debouncedFilters = useDebounce(filters, 300);
  
  // Requête principale pour les données complètes
  const {
    data: olympicData,
    isLoading: isLoadingData,
    error: dataError,
    refetch: refetchData
  } = useQuery({
    queryKey: ['olympicData', debouncedFilters],
    queryFn: () => fetchOlympicData(debouncedFilters),
    enabled: enabled && !!debouncedFilters,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: 1000
  });
  
  // Requête pour les statistiques rapides (plus légère)
  const {
    data: quickStats,
    isLoading: isLoadingStats,
    error: statsError
  } = useQuery({
    queryKey: ['quickStats', debouncedFilters],
    queryFn: () => fetchQuickStats(debouncedFilters),
    enabled: enabled && !!debouncedFilters,
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });

  return {
    // Données
    stats: olympicData?.stats || quickStats,
    results: olympicData?.results || [],
    aggregations: olympicData?.aggregations || {},
    pagination: olympicData?.pagination || {},
    
    // États de chargement
    isLoading: isLoadingData,
    isLoadingStats,
    
    // Erreurs
    error: dataError || statsError,
    
    // Fonctions
    refetch: refetchData
  };
};

/**
 * Hook pour récupérer les options de filtres
 * @returns {Object} Options disponibles pour les filtres
 */
export const useFilterOptions = () => {
  const {
    data: filterOptions,
    isLoading,
    error
  } = useQuery({
    queryKey: ['filterOptions'],
    queryFn: fetchFilterOptions,
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60, // 1 heure
    retry: 2
  });

  return {
    years: filterOptions?.years || [],
    seasons: filterOptions?.seasons || [],
    countries: filterOptions?.countries || [],
    sports: filterOptions?.sports || [],
    medalTypes: filterOptions?.medalTypes || [],
    isLoading,
    error
  };
};

/**
 * Hook pour précharger les données
 * @param {Object} queryClient - Client React Query
 */
export const usePrefetchOlympicData = () => {
  const queryClient = useQueryClient();
  
  const prefetchData = (filters) => {
    queryClient.prefetchQuery({
      queryKey: ['olympicData', filters],
      queryFn: () => fetchOlympicData(filters),
      staleTime: 1000 * 60 * 5
    });
  };
  
  const prefetchStats = (filters) => {
    queryClient.prefetchQuery({
      queryKey: ['quickStats', filters],
      queryFn: () => fetchQuickStats(filters),
      staleTime: 1000 * 60 * 2
    });
  };
  
  return {
    prefetchData,
    prefetchStats
  };
};

/**
 * Hook pour invalidation de cache
 */
export const useInvalidateOlympicData = () => {
  const queryClient = useQueryClient();
  
  const invalidateAll = () => {
    queryClient.invalidateQueries(['olympicData']);
    queryClient.invalidateQueries(['quickStats']);
  };
  
  const invalidateData = () => {
    queryClient.invalidateQueries(['olympicData']);
  };
  
  const invalidateStats = () => {
    queryClient.invalidateQueries(['quickStats']);
  };
  
  return {
    invalidateAll,
    invalidateData,
    invalidateStats
  };
};

export default useOlympicData;