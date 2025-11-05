import { useQuery } from 'react-query';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const fetchFigures = async () => {
  const url = `${API_BASE_URL}/reports/figures`;
  console.debug('[useReportsAssets] Fetching figures', { url });
  try {
    const response = await axios.get(url);
    console.debug('[useReportsAssets] Figures fetched', { count: Array.isArray(response.data) ? response.data.length : 0 });
    return response.data;
  } catch (error) {
    console.error('[useReportsAssets] Échec figures', {
      url,
      message: error?.message,
      response: error?.response?.data
    });
    throw error;
  }
};

const fetchScores = async () => {
  const url = `${API_BASE_URL}/reports/scores`;
  console.debug('[useReportsAssets] Fetching scores', { url });
  try {
    const response = await axios.get(url);
    console.debug('[useReportsAssets] Scores fetched', { files: Array.isArray(response.data) ? response.data.length : 0 });
    return response.data;
  } catch (error) {
    console.error('[useReportsAssets] Échec scores', {
      url,
      message: error?.message,
      response: error?.response?.data
    });
    throw error;
  }
};

export const useReportsAssets = () => {
  const figuresQuery = useQuery({
    queryKey: ['reports', 'figures'],
    queryFn: fetchFigures,
    staleTime: 1000 * 60 * 10,
    cacheTime: 1000 * 60 * 15
  });

  const scoresQuery = useQuery({
    queryKey: ['reports', 'scores'],
    queryFn: fetchScores,
    staleTime: 1000 * 60 * 10,
    cacheTime: 1000 * 60 * 15
  });

  const isLoading = figuresQuery.isLoading || scoresQuery.isLoading;
  const error = figuresQuery.error || scoresQuery.error;

  const refetch = async () => {
    await Promise.all([figuresQuery.refetch(), scoresQuery.refetch()]);
  };

  return {
    figures: figuresQuery.data || [],
    scores: scoresQuery.data || [],
    isLoading,
    error,
    refetch
  };
};

export default useReportsAssets;
