import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './PredictedMedals.css';

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return Number(value).toLocaleString('fr-FR', {
    maximumFractionDigits: 1
  });
};

export const PredictedMedals = ({
  data = [],
  isLoading = false,
  isFetching = false,
  error = null,
  pagination = null,
  onPageChange
}) => {
  const [showActual, setShowActual] = useState(true);
  const cardRef = useRef(null);
  const hasMountedRef = useRef(false);

  const rows = useMemo(() => {
    return (data || []).map((item) => {
      const predicted = Number(item.predicted_value ?? item.predictedMedals ?? item.predicted_medals_total ?? 0);
      const actual = item.actual_medals !== undefined ? Number(item.actual_medals) : null;
      const diff = actual !== null ? predicted - actual : null;

      return {
        country: item.country || item.country_name,
        slugGame: item.slug_game,
        model: item.model_name,
        target: item.target,
        predicted,
        actual,
        diff,
        createdAt: item.created_at
      };
    });
  }, [data]);

  const paginationInfo = useMemo(() => {
    const rawPageSize = pagination?.pageSize ?? pagination?.limit ?? (rows.length > 0 ? rows.length : 10);
    const pageSize = rawPageSize > 0 ? rawPageSize : 10;
    const totalItems = typeof pagination?.total === 'number' ? pagination.total : rows.length;
    const totalPagesFromPayload = typeof pagination?.totalPages === 'number' && pagination.totalPages > 0
      ? pagination.totalPages
      : (totalItems > 0 ? Math.max(1, Math.ceil(totalItems / pageSize)) : 0);
    const currentPage = pagination?.page && pagination.page >= 1
      ? pagination.page
      : (totalItems > 0 ? 1 : 1);

    return {
      page: currentPage,
      pageSize,
      total: totalItems,
      totalPages: totalPagesFromPayload
    };
  }, [pagination, rows.length]);

  const {
    page: currentPage,
    pageSize,
    total: totalItems,
    totalPages
  } = paginationInfo;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }
  }, [currentPage]);

  const lastPage = totalPages > 0
    ? totalPages
    : (totalItems > 0 ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  const disableNavigation = (isFetching && !isLoading) || totalItems === 0;

  const handlePageChange = (targetPage) => {
    if (typeof onPageChange !== 'function' || totalItems === 0) {
      return;
    }

    const boundedPage = Math.min(Math.max(targetPage, 1), lastPage);

    if (boundedPage !== currentPage) {
      onPageChange(boundedPage);
    }
  };

  if (isLoading) {
    return (
      <div className="predictions-card loading" ref={cardRef}>
        <div className="predictions-header">
          <h3>🔮 Prédictions de médailles</h3>
        </div>
        <p>Chargement des prédictions...</p>
      </div>
    );
  }

  if (error) {
    const errorDetails = error?.response?.data?.details || error?.response?.data?.error || error.message;
    return (
      <div className="predictions-card error" ref={cardRef}>
        <div className="predictions-header">
          <h3>🔮 Prédictions de médailles</h3>
        </div>
        <p>Impossible de charger les prédictions. Vérifiez l'API.</p>
        {errorDetails && (
          <pre className="predictions-error-details">{String(errorDetails)}</pre>
        )}
      </div>
    );
  }

  return (
    <div className="predictions-card" ref={cardRef}>
      <div className="predictions-header">
        <div>
          <h3>🔮 Prédictions de médailles</h3>
          <p className="subtitle">Anticipez les performances futures et comparez-les aux données historiques.</p>
        </div>
        <div className="predictions-toggles">
          <span className="prediction-badge">Prévision</span>
          <label className="toggle-actual">
            <input
              type="checkbox"
              checked={showActual}
              onChange={() => setShowActual((prev) => !prev)}
            />
            <span>Afficher le réalisé</span>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="predictions-empty">
          <p>Aucune prédiction disponible pour les filtres actuels.</p>
        </div>
      ) : (
        <>
          <div className="predictions-summary">
            <div className="predictions-summary-range">
              {startIndex === 0
                ? 'Aucune entrée'
                : `${startIndex.toLocaleString('fr-FR')} – ${endIndex.toLocaleString('fr-FR')} sur ${totalItems.toLocaleString('fr-FR')}`}
            </div>
            <div className="predictions-summary-status">
              <span>Page {currentPage} / {lastPage}</span>
              {isFetching && !isLoading && (
                <span className="predictions-refreshing">Mise à jour…</span>
              )}
            </div>
          </div>

          <div className="predictions-table-wrapper">
            <table className="predictions-table">
              <thead>
                <tr>
                  <th>Pays</th>
                  <th>Édition</th>
                  <th>Modèle</th>
                  <th>Prédiction</th>
                  {showActual && <th>Réalisé</th>}
                  {showActual && <th>Écart</th>}
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.country}-${row.slugGame}-${row.model}`}>
                    <td>
                      <span className="country-name">{row.country}</span>
                      <span className="target-tag">{row.target}</span>
                    </td>
                    <td>{row.slugGame}</td>
                    <td>{row.model}</td>
                    <td>
                      <span className="predicted-value">{formatNumber(row.predicted)}</span>
                    </td>
                    {showActual && (
                      <td>
                        <span className="actual-value">{formatNumber(row.actual)}</span>
                      </td>
                    )}
                    {showActual && (
                      <td>
                        {row.diff === null ? (
                          '—'
                        ) : (
                          <span className={row.diff >= 0 ? 'diff-positive' : 'diff-negative'}>
                            {row.diff >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(row.diff))}
                          </span>
                        )}
                      </td>
                    )}
                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleString('fr-FR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalItems > 0 && (
            <div className="predictions-pagination">
              <div className="predictions-pagination-info">
                {pageSize > 0 && (
                  <span>
                    Affichage de {pageSize < totalItems ? pageSize : rows.length} entrées par page
                  </span>
                )}
              </div>
              <div className="predictions-pagination-controls">
                <button
                  className="predictions-pagination-button"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage <= 1 || disableNavigation}
                  aria-label="Première page"
                >
                  ⏮
                </button>
                <button
                  className="predictions-pagination-button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || disableNavigation}
                  aria-label="Page précédente"
                >
                  ◀
                </button>

                {(() => {
                  const buttons = [];
                  const maxButtons = 5;
                  const initialStart = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                  const initialEnd = Math.min(lastPage, initialStart + maxButtons - 1);
                  const startPage = Math.max(1, initialEnd - maxButtons + 1);
                  const endPage = Math.min(lastPage, startPage + maxButtons - 1);

                  for (let page = startPage; page <= endPage; page += 1) {
                    buttons.push(
                      <button
                        key={page}
                        className={`predictions-pagination-button ${page === currentPage ? 'active' : ''}`}
                        onClick={() => handlePageChange(page)}
                        disabled={disableNavigation && page !== currentPage}
                        aria-label={`Aller à la page ${page}`}
                      >
                        {page}
                      </button>
                    );
                  }

                  return buttons;
                })()}

                <button
                  className="predictions-pagination-button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= lastPage || disableNavigation}
                  aria-label="Page suivante"
                >
                  ▶
                </button>
                <button
                  className="predictions-pagination-button"
                  onClick={() => handlePageChange(lastPage)}
                  disabled={currentPage >= lastPage || disableNavigation}
                  aria-label="Dernière page"
                >
                  ⏭
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

PredictedMedals.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  isFetching: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object
  ]),
  pagination: PropTypes.shape({
    page: PropTypes.number,
    pageSize: PropTypes.number,
    limit: PropTypes.number,
    total: PropTypes.number,
    totalPages: PropTypes.number
  }),
  onPageChange: PropTypes.func
};

export default PredictedMedals;
