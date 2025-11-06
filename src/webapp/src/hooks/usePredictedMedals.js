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

const normalizePredictionsResponse = (payload) => {
  if (Array.isArray(payload)) {
    const predictions = payload;
    return {
      predictions,
      total: predictions.length,
      page: predictions.length > 0 ? 1 : 0,
      totalPages: predictions.length > 0 ? 1 : 0,
      pageSize: predictions.length
    };
  }

  if (payload && typeof payload === 'object') {
    const predictions = Array.isArray(payload.predictions) ? payload.predictions : [];
    const total = typeof payload.total === 'number' ? payload.total : predictions.length;
    const page = typeof payload.page === 'number' ? payload.page : (predictions.length > 0 ? 1 : 0);
    const totalPages = typeof payload.totalPages === 'number' ? payload.totalPages : (predictions.length > 0 ? 1 : 0);
    const pageSize = typeof payload.pageSize === 'number' ? payload.pageSize : predictions.length;

    return {
      predictions,
      total,
      page,
      totalPages,
      pageSize
    };
  }

  return {
    predictions: [],
    total: 0,
    page: 0,
    totalPages: 0,
    pageSize: 0
  };
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
    const normalized = normalizePredictionsResponse(response.data);
    console.debug('[usePredictedMedals] Réponse reçue', {
      count: normalized.predictions.length,
      total: normalized.total,
      page: normalized.page,
      totalPages: normalized.totalPages
    });
    return normalized;
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
    isFetching,
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
    predictions: data?.predictions || [],
    total: data?.total ?? 0,
    page: data?.page ?? 0,
    totalPages: data?.totalPages ?? 0,
    pageSize: data?.pageSize ?? 0,
    isLoading,
    isFetching,
    error,
    refetch,
    pagination: data
  };
};

export default usePredictedMedals;
