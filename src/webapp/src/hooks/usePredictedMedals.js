import { useQuery } from 'react-query';
import axios from 'axios';
import { useDebounce } from './useDebounce';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const buildSearchParams = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.append(key, value.join(','));
      }
      return;
    }

    params.append(key, value);
  });

  return params.toString();
};

const fetchPredictedMedals = async (filters) => {
  const queryString = buildSearchParams({
    ...filters,
    includeActual: true
  });

  const url = queryString
    ? `${API_BASE_URL}/predicted_medals?${queryString}`
    : `${API_BASE_URL}/predicted_medals?includeActual=true`;
  console.debug('[usePredictedMedals] Fetching predictions', { url });

  try {
    const response = await axios.get(url);
    console.debug('[usePredictedMedals] Réponse reçue', { count: Array.isArray(response.data) ? response.data.length : 0 });
    return response.data;
  } catch (error) {
    console.error('[usePredictedMedals] Échec de récupération', {
      url,
      message: error?.message,
      response: error?.response?.data
    });
    throw error;
  }
};

export const usePredictedMedals = (filters = {}, enabled = true) => {
  const debouncedFilters = useDebounce(filters, 300);

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['predictedMedals', debouncedFilters],
    queryFn: () => fetchPredictedMedals(debouncedFilters),
    enabled,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
    retry: 2
  });

  return {
    predictions: data || [],
    isLoading,
    error,
    refetch
  };
};

export default usePredictedMedals;
