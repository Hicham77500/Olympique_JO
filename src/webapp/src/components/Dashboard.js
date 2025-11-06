import React, { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { motion } from 'framer-motion';

// Hooks personnalisés
import { useFilters } from '../hooks/useFilters';
import { useOlympicData } from '../hooks/useOlympicData';
import { usePredictedMedals } from '../hooks/usePredictedMedals';

// Composants
import FilterPanel from './Filters/FilterPanel';
import StatsCards from './Stats/StatsCards';
import CountryMedalsChart from './charts/CountryMedalsChart';
import YearEvolutionChart from './charts/YearEvolutionChart';
import MedalDistributionChart from './charts/MedalDistributionChart';
import ResultsTable from './table/ResultsTable';
import PredictedMedals from './predictions/PredictedMedals';
import ModelsResults from './reports/ModelsResults';

// Styles
import './Dashboard.css';

// Configuration React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const DashboardContent = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(true);
  
  // Hooks pour la gestion des filtres et données
  const { 
    filters, 
    updateFilter, 
    updateNestedFilter,
    resetFilters, 
    getApiFilters,
    hasActiveFilters,
    activeFiltersCount
  } = useFilters();

  // React Query client (for manual invalidation if needed)
  const rqClient = useQueryClient();

  const apiFilters = useMemo(() => getApiFilters(), [getApiFilters]);

  // État local pour la pagination
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0
  });

  const [predictionsPagination, setPredictionsPagination] = useState({
    limit: 10,
    page: 1
  });

  const {
    stats: quickStats,
    results,
    aggregations,
    pagination: serverPagination,
    isLoading: isLoadingData,
    isLoadingStats,
    refetch: refetchData
  } = useOlympicData(apiFilters, pagination);

  const filteredData = {
    results: results || [],
    aggregations: aggregations || {},
    stats: quickStats || {},
    pagination: serverPagination || pagination
  };

  const predictionsFilterSignature = useMemo(() => JSON.stringify({
    countries: filters?.countries || [],
    years: filters?.years?.selected || []
  }), [filters?.countries, filters?.years?.selected]);

  const predictedQueryParams = useMemo(() => {
    const params = {
      limit: predictionsPagination.limit,
      includeActual: true,
      page: predictionsPagination.page
    };

    if (filters?.countries?.length > 0) {
      params.country = filters.countries;
    }

    if (filters?.years?.selected?.length === 2) {
      const [minYear, maxYear] = filters.years.selected;
      params.yearMin = minYear;
      params.yearMax = maxYear;
    }

    return params;
  }, [filters, predictionsPagination]);

  const {
    predictions,
    total: predictionsTotal,
    page: currentPredictionsPage,
    totalPages: predictionsTotalPages,
    pageSize: predictionsPageSize,
    isLoading: isLoadingPredictions,
    isFetching: isFetchingPredictions,
    error: predictionsError
  } = usePredictedMedals(predictedQueryParams);

  // Les requêtes sont automatiquement relancées lorsque les filtres changent (via react-query)

  // Revenir automatiquement à la première page lorsqu'un filtre est modifié
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      offset: 0
    }));
  }, [apiFilters]);

  useEffect(() => {
    setPredictionsPagination((prev) => ({
      ...prev,
      page: 1
    }));
  }, [predictionsFilterSignature]);

  useEffect(() => {
    if (currentPredictionsPage >= 1 && currentPredictionsPage !== predictionsPagination.page) {
      setPredictionsPagination((prev) => ({
        ...prev,
        page: currentPredictionsPage
      }));
    }
  }, [currentPredictionsPage, predictionsPagination.page]);

  // Gestion des onglets
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'charts', label: 'Graphiques', icon: '📈' },
    { id: 'ml-reports', label: 'Figures & Scores ML/IA', icon: '🤖' },
    { id: 'table', label: 'Données détaillées', icon: '📋' }
  ];

  // Gestion de la pagination
  const handlePaginationChange = (newPagination) => {
    setPagination(newPagination);
  };

  const handlePredictionsPageChange = (newPage) => {
    setPredictionsPagination((prev) => ({
      ...prev,
      page: newPage
    }));
  };

  // Gestion du clic sur une ligne du tableau
  const handleRowClick = (row) => {
    console.log('Ligne cliquée:', row);
    // Vous pouvez ajouter ici une modal ou une vue détaillée
  };

  // Animation des conteneurs
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const dashboardClassName = `dashboard ${isFiltersPanelOpen ? 'filters-open' : ''}`;
  const mainContentClassName = 'main-content';

  return (
    <div className={dashboardClassName}>
      {/* En-tête du dashboard */}
      <motion.header 
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-content">
          <div className="header-title">
            <h1>🏆 Olympic Data Analytics</h1>
            <p>Explorez les données olympiques avec des filtres interactifs</p>
          </div>
          
          <div className="header-controls">
            <button
              className={`filter-toggle ${isFiltersPanelOpen ? 'active' : ''}`}
              onClick={() => setIsFiltersPanelOpen(!isFiltersPanelOpen)}
              aria-label="Basculer le panneau de filtres"
              aria-pressed={isFiltersPanelOpen}
            >
              🎛️ Filtres
              {hasActiveFilters && <span className="active-filters-indicator"></span>}
            </button>
            
            <button
              className="refresh-button"
              onClick={() => {
                // Forcer un rafraîchissement manuel des données et statistiques
                refetchData();
                rqClient.invalidateQueries('quickStats');
              }}
              aria-label="Actualiser les données"
            >
              🔄 Actualiser
            </button>
          </div>
        </div>

        {/* Navigation par onglets */}
        <nav className="dashboard-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </motion.header>

      {/* Contenu principal */}
      <div className="dashboard-content">
        {/* Panneau de filtres */}
        <motion.aside 
          className="filters-sidebar"
          initial={false}
          animate={{ 
            x: isFiltersPanelOpen ? 0 : -360,
            opacity: isFiltersPanelOpen ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          aria-hidden={!isFiltersPanelOpen}
          style={{ pointerEvents: isFiltersPanelOpen ? 'auto' : 'none' }}
        >
          {isFiltersPanelOpen && (
            <FilterPanel
              filters={filters}
              onFilterChange={updateFilter}
              onNestedFilterChange={updateNestedFilter}
              onResetFilters={resetFilters}
              isLoading={isLoadingStats || isLoadingData}
              activeFiltersCount={activeFiltersCount}
            />
          )}
        </motion.aside>

        {/* Zone de contenu principale */}
        <motion.main 
          className={mainContentClassName}
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Statistiques rapides - toujours visibles */}
          <motion.div variants={itemVariants}>
            <StatsCards 
              stats={quickStats} 
              isLoading={isLoadingStats}
              filters={filters}
            />
          </motion.div>

          {/* Contenu selon l'onglet actif */}
          {activeTab === 'overview' && (
            <motion.div className="overview-grid" variants={containerVariants}>
              <motion.div variants={itemVariants} className="chart-item">
                <CountryMedalsChart
                  data={filteredData?.aggregations?.byCountry}
                  isLoading={isLoadingData}
                  filters={filters}
                />
              </motion.div>
              
              <motion.div variants={itemVariants} className="chart-item">
                <MedalDistributionChart
                  data={filteredData?.aggregations?.byMedal}
                  isLoading={isLoadingData}
                  filters={filters}
                />
              </motion.div>
              
              <motion.div variants={itemVariants} className="chart-item span-2">
                <YearEvolutionChart
                  data={filteredData?.aggregations?.byYear}
                  isLoading={isLoadingData}
                  filters={filters}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="chart-item span-2">
                <PredictedMedals
                  data={predictions}
                  isLoading={isLoadingPredictions}
                  isFetching={isFetchingPredictions}
                  error={predictionsError}
                  pagination={{
                    page: currentPredictionsPage || predictionsPagination.page,
                    pageSize: predictionsPageSize || predictionsPagination.limit,
                    total: predictionsTotal,
                    totalPages: predictionsTotalPages
                  }}
                  onPageChange={handlePredictionsPageChange}
                />
              </motion.div>
              
              <motion.div variants={itemVariants} className="table-preview span-2">
                <div className="preview-header">
                  <h3>Aperçu des résultats</h3>
                  <button 
                    className="view-all-button"
                    onClick={() => setActiveTab('table')}
                  >
                    Voir tout →
                  </button>
                </div>
                <ResultsTable
                  data={filteredData?.results?.slice(0, 10) || []}
                  isLoading={isLoadingData}
                  pagination={{ limit: 10, offset: 0, total: filteredData?.stats?.totalMedals || 0 }}
                  filters={filters}
                  onRowClick={handleRowClick}
                />
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'charts' && (
            <motion.div className="charts-grid" variants={containerVariants}>
              <motion.div variants={itemVariants} className="chart-full">
                <CountryMedalsChart
                  data={filteredData?.aggregations?.byCountry}
                  isLoading={isLoadingData}
                  filters={filters}
                />
              </motion.div>
              
              <motion.div variants={itemVariants} className="chart-half">
                <YearEvolutionChart
                  data={filteredData?.aggregations?.byYear}
                  isLoading={isLoadingData}
                  filters={filters}
                />
              </motion.div>
              
              <motion.div variants={itemVariants} className="chart-half">
                <MedalDistributionChart
                  data={filteredData?.aggregations?.byMedal}
                  isLoading={isLoadingData}
                  filters={filters}
                />
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'ml-reports' && (
            <motion.div className="ml-reports-content" variants={containerVariants}>
              <motion.div variants={itemVariants}>
                <ModelsResults />
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'table' && (
            <motion.div variants={itemVariants}>
              <ResultsTable
                data={filteredData?.results || []}
                isLoading={isLoadingData}
                pagination={{
                  ...pagination,
                  total: filteredData?.pagination?.total ?? filteredData?.stats?.totalMedals ?? 0
                }}
                onPaginationChange={handlePaginationChange}
                filters={filters}
                onRowClick={handleRowClick}
              />
            </motion.div>
          )}
        </motion.main>
      </div>

      {/* Indicateur de chargement global */}
      {(isLoadingStats || isLoadingData || isLoadingPredictions) && (
        <motion.div 
          className="global-loading-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="loading-spinner"></div>
          <span>Chargement des données...</span>
        </motion.div>
      )}
    </div>
  );
};

// Composant principal avec le provider React Query
const Dashboard = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export default Dashboard;