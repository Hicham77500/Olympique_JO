import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ResultsTable.css';

const ResultsTable = ({ 
  data = [], 
  isLoading = false, 
  pagination = { limit: 50, offset: 0, total: 0 },
  onPaginationChange,
  filters = {},
  onRowClick
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Configuration des colonnes
  const columns = [
    {
      key: 'name',
      label: 'Athlète',
      sortable: true,
      width: '200px',
      render: (value, row) => (
        <div className="athlete-cell">
          <div className="athlete-name">{value}</div>
          <div className="athlete-details">
            {row.age && <span className="age">{row.age} ans</span>}
            {row.gender && <span className="gender">{row.gender}</span>}
          </div>
        </div>
      )
    },
    {
      key: 'nationality',
      label: 'Pays',
      sortable: true,
      width: '120px',
      render: (value) => (
        <div className="country-cell">
          <span className="country-flag">
            {getCountryFlag(value)}
          </span>
          <span className="country-name">{value}</span>
        </div>
      )
    },
    {
      key: 'year',
      label: 'Année',
      sortable: true,
      width: '80px',
      render: (value, row) => (
        <div className="year-cell">
          <span className="year">{value}</span>
          {row.season && <span className="season">{row.season}</span>}
        </div>
      )
    },
    {
      key: 'city',
      label: 'Ville',
      sortable: true,
      width: '120px'
    },
    {
      key: 'sport',
      label: 'Sport',
      sortable: true,
      width: '150px',
      render: (value) => (
        <div className="sport-cell">
          <span className="sport-icon">{getSportIcon(value)}</span>
          <span className="sport-name">{value}</span>
        </div>
      )
    },
    {
      key: 'event',
      label: 'Épreuve',
      sortable: false,
      width: '200px',
      render: (value) => (
        <div className="event-cell" title={value}>
          {value}
        </div>
      )
    },
    {
      key: 'medal',
      label: 'Médaille',
      sortable: true,
      width: '100px',
      render: (value) => (
        <div className="medal-cell">
          <span className={`medal-badge medal-${value?.toLowerCase()}`}>
            {getMedalIcon(value)}
            {value}
          </span>
        </div>
      )
    }
  ];

  // Tri des données
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Gestion du tri
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Gestion de l'expansion des lignes
  const toggleRowExpansion = (rowId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  // Calcul de la pagination
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  const handlePageChange = (newPage) => {
    if (onPaginationChange) {
      onPaginationChange({
        ...pagination,
        offset: (newPage - 1) * pagination.limit
      });
    }
  };

  // Fonctions utilitaires
  function getCountryFlag(country) {
    const flagMap = {
      'USA': '🇺🇸', 'United States': '🇺🇸',
      'France': '🇫🇷', 'FRA': '🇫🇷',
      'Germany': '🇩🇪', 'GER': '🇩🇪',
      'China': '🇨🇳', 'CHN': '🇨🇳',
      'Japan': '🇯🇵', 'JPN': '🇯🇵',
      'Great Britain': '🇬🇧', 'GBR': '🇬🇧',
      'Australia': '🇦🇺', 'AUS': '🇦🇺',
      'Italy': '🇮🇹', 'ITA': '🇮🇹',
      'Canada': '🇨🇦', 'CAN': '🇨🇦',
      'Russia': '🇷🇺', 'RUS': '🇷🇺'
    };
    return flagMap[country] || '🏳️';
  }

  function getSportIcon(sport) {
    const sportIcons = {
      'Swimming': '🏊‍♀️',
      'Athletics': '🏃‍♂️',
      'Gymnastics': '🤸‍♀️',
      'Cycling': '🚴‍♂️',
      'Basketball': '🏀',
      'Football': '⚽',
      'Tennis': '🎾',
      'Boxing': '🥊',
      'Rowing': '🚣‍♂️',
      'Sailing': '⛵',
      'Weightlifting': '🏋️‍♂️',
      'Wrestling': '🤼‍♂️',
      'Shooting': '🎯',
      'Archery': '🏹',
      'Fencing': '🤺'
    };
    return sportIcons[sport] || '🏆';
  }

  function getMedalIcon(medal) {
    const medalIcons = {
      'GOLD': '🥇',
      'SILVER': '🥈',
      'BRONZE': '🥉'
    };
    return medalIcons[medal] || '🏅';
  }

  if (isLoading) {
    return (
      <div className="results-table-container">
        <div className="table-header">
          <h3>Résultats olympiques</h3>
          <div className="table-info">
            <span className="loading-indicator">Chargement...</span>
          </div>
        </div>
        <div className="table-loading">
          {[...Array(10)].map((_, index) => (
            <div key={index} className="table-row-skeleton">
              {columns.map((col, colIndex) => (
                <div 
                  key={colIndex} 
                  className="table-cell-skeleton"
                  style={{ width: col.width }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="results-table-container">
        <div className="table-header">
          <h3>Résultats olympiques</h3>
        </div>
        <div className="table-empty">
          <div className="empty-icon">📊</div>
          <p>Aucun résultat trouvé</p>
          <small>Essayez de modifier vos filtres pour voir plus de données</small>
        </div>
      </div>
    );
  }

  return (
    <div className="results-table-container">
      <div className="table-header">
        <h3>Résultats olympiques</h3>
        <div className="table-info">
          <span className="results-count">
            {data.length} résultats
            {pagination.total > pagination.limit && (
              <span className="total-count"> sur {pagination.total}</span>
            )}
          </span>
          {filters && Object.keys(filters).length > 0 && (
            <span className="filtered-indicator">Filtré</span>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={`table-header-cell ${column.sortable ? 'sortable' : ''} ${
                    sortConfig.key === column.key ? `sorted-${sortConfig.direction}` : ''
                  }`}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="header-content">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="sort-indicator">
                        <span className="sort-arrow sort-asc">▲</span>
                        <span className="sort-arrow sort-desc">▼</span>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              <th className="expand-column"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedData.map((row, index) => (
                <motion.tr
                  key={row.id || index}
                  className={`table-row ${expandedRows.has(row.id) ? 'expanded' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="table-cell">
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </td>
                  ))}
                  <td className="expand-cell">
                    <button
                      className="expand-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRowExpansion(row.id);
                      }}
                      aria-label={expandedRows.has(row.id) ? 'Réduire' : 'Développer'}
                    >
                      <motion.span
                        animate={{ rotate: expandedRows.has(row.id) ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        ▼
                      </motion.span>
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination">
          <div className="pagination-info">
            <span>
              Page {currentPage} sur {totalPages}
            </span>
            <span className="pagination-total">
              ({pagination.total} résultats au total)
            </span>
          </div>
          
          <div className="pagination-controls">
            <button
              className="pagination-button"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              aria-label="Première page"
            >
              ⏮
            </button>
            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Page précédente"
            >
              ◀
            </button>
            
            {/* Pages numériques */}
            {(() => {
              const pages = [];
              const startPage = Math.max(1, currentPage - 2);
              const endPage = Math.min(totalPages, currentPage + 2);
              
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    className={`pagination-button ${i === currentPage ? 'active' : ''}`}
                    onClick={() => handlePageChange(i)}
                  >
                    {i}
                  </button>
                );
              }
              
              return pages;
            })()}
            
            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Page suivante"
            >
              ▶
            </button>
            <button
              className="pagination-button"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Dernière page"
            >
              ⏭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;