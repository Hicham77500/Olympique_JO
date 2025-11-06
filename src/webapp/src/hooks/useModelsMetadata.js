import { useQuery } from 'react-query';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const fetchModelsMetadata = async () => {
  const url = `${API_BASE_URL}/models`;
  console.debug('[useModelsMetadata] Fetching models', { url });
  try {
    const response = await axios.get(url);
    console.debug('[useModelsMetadata] Models fetched', {
      models: Array.isArray(response.data?.models) ? response.data.models.length : 0,
      scores: Array.isArray(response.data?.availableScores) ? response.data.availableScores.length : 0
    });
    return response.data;
  } catch (error) {
    console.error('[useModelsMetadata] Échec models', {
      url,
      message: error?.message,
      response: error?.response?.data
    });
    throw error;
  }
};

export const useModelsMetadata = () => {
  const query = useQuery({
    queryKey: ['models', 'metadata'],
    queryFn: fetchModelsMetadata,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2
  });

  return {
    models: query.data?.models || [],
    availableScores: query.data?.availableScores || [],
    count: query.data?.count ?? (Array.isArray(query.data?.models) ? query.data.models.length : 0),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch
  };
};

export default useModelsMetadata;
