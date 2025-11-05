import React, { useMemo, useState } from 'react';
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

export const PredictedMedals = ({ data = [], isLoading = false, error = null }) => {
  const [showActual, setShowActual] = useState(true);

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

  if (isLoading) {
    return (
      <div className="predictions-card loading">
        <div className="predictions-header">
          <h3>🔮 Prédictions de médailles</h3>
        </div>
        <p>Chargement des prédictions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="predictions-card error">
        <div className="predictions-header">
          <h3>🔮 Prédictions de médailles</h3>
        </div>
        <p>Impossible de charger les prédictions. Vérifiez l'API.</p>
      </div>
    );
  }

  return (
    <div className="predictions-card">
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
      )}
    </div>
  );
};

PredictedMedals.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object
  ])
};

export default PredictedMedals;
