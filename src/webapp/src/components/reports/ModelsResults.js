import React from 'react';
import useModelsMetadata from '../../hooks/useModelsMetadata';
import './ModelsResults.css';

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value;
    }
    return value.toFixed(value < 1 ? 3 : 2);
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const formatLabel = (key) => key
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (match) => match.toUpperCase());

const ModelsResults = () => {
  const {
    models,
    availableScores,
    isLoading,
    isFetching,
    error,
    refetch
  } = useModelsMetadata();

  const hasModels = Array.isArray(models) && models.length > 0;

  return (
    <div className="models-panel">
      <div className="models-panel-header">
        <div>
          <h3>🤖 Résultats des modèles entraînés</h3>
          <p>Consultez les performances clés, les hyperparamètres et les visualisations associées à chaque modèle.</p>
        </div>
        <button type="button" className="models-refresh" onClick={refetch} disabled={isFetching}>
          {isFetching ? 'Chargement...' : '🔄 Actualiser'}
        </button>
      </div>

      {isLoading && (
        <div className="models-empty-state">Chargement des informations modèles...</div>
      )}

      {error && (
        <div className="models-error">
          <p>Impossible de charger les métadonnées des modèles.</p>
          <pre>{String(error?.response?.data?.details || error?.message)}</pre>
        </div>
      )}

      {!isLoading && !error && !hasModels && (
        <div className="models-empty-state">
          Aucun modèle déclaré. Déposez un fichier <code>models_metadata.json</code> ou exécutez le pipeline de scoring pour alimenter cette section.
        </div>
      )}

      {hasModels && (
        <div className="models-grid">
          {models.map((model) => (
            <article key={model.modelName} className="model-card">
              {model.image ? (
                <div className="model-figure">
                  <img src={model.image} alt={`Visualisation ${model.modelName}`} loading="lazy" />
                </div>
              ) : (
                <div className="model-figure placeholder">
                  <span role="img" aria-label="Modèle">📉</span>
                </div>
              )}

              <div className="model-content">
                <header className="model-header">
                  <h4>{model.modelName}</h4>
                  <span className={`model-task task-${model.task || 'na'}`}>
                    {formatLabel(model.task || 'non défini')}
                  </span>
                </header>

                {model.description && (
                  <p className="model-description">{model.description}</p>
                )}

                <div className="model-section">
                  <h5>Métriques principales</h5>
                  {Object.keys(model.metrics || {}).length === 0 ? (
                    <p className="model-note">Aucune métrique communiquée.</p>
                  ) : (
                    <dl className="model-key-values">
                      {Object.entries(model.metrics).map(([metricKey, metricValue]) => (
                        <div key={metricKey}>
                          <dt>{formatLabel(metricKey)}</dt>
                          <dd>{formatValue(metricValue)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                <div className="model-section">
                  <h5>Hyperparamètres retenus</h5>
                  {Object.keys(model.bestParams || {}).length === 0 ? (
                    <p className="model-note">Non communiqué.</p>
                  ) : (
                    <dl className="model-key-values">
                      {Object.entries(model.bestParams).map(([paramKey, paramValue]) => (
                        <div key={paramKey}>
                          <dt>{formatLabel(paramKey)}</dt>
                          <dd>{formatValue(paramValue)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                {Array.isArray(model.scores) && model.scores.length > 0 && (
                  <div className="model-section">
                    <h5>Sources &amp; scorecards</h5>
                    <ul className="model-links">
                      {model.scores.map((file) => (
                        <li key={file.filename}>
                          <a href={file.url} target="_blank" rel="noreferrer">
                            {file.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {Array.isArray(availableScores) && availableScores.length > 0 && (
        <footer className="models-footer">
          <p>
            Autres fichiers de scores disponibles :
            {' '}
            {availableScores.map((file, index) => (
              <React.Fragment key={file.filename}>
                <a href={file.url} target="_blank" rel="noreferrer">{file.filename}</a>
                {index < availableScores.length - 1 ? ', ' : ''}
              </React.Fragment>
            ))}
          </p>
        </footer>
      )}
    </div>
  );
};

export default ModelsResults;
