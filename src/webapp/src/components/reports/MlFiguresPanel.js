import React, { useMemo, useState } from 'react';
import useReportsAssets from '../../hooks/useReportsAssets';
import './MlFiguresPanel.css';

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) {
    return '—';
  }
  const units = ['octets', 'Ko', 'Mo', 'Go'];
  const index = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDate = (date) => {
  if (!date) {
    return '—';
  }
  return new Date(date).toLocaleString('fr-FR');
};

const MlFiguresPanel = () => {
  const {
    figures,
    scores,
    isLoading,
    error,
    refetch
  } = useReportsAssets();
  const [selectedFigure, setSelectedFigure] = useState(null);

  const hasFigures = Array.isArray(figures) && figures.length > 0;
  const hasScores = Array.isArray(scores) && scores.length > 0;

  const scoreRows = useMemo(() => {
    const MAX_ROWS = 20;
    return (scores || []).map((file) => ({
      ...file,
      headers: file.headers || [],
      rows: (file.rows || []).slice(0, MAX_ROWS),
      totalRows: Array.isArray(file.rows) ? file.rows.length : 0,
      hasMore: Array.isArray(file.rows) && file.rows.length > MAX_ROWS
    }));
  }, [scores]);

  return (
    <div className="ml-panel">
      <div className="ml-panel-header">
        <div>
          <h3>📊 Figures &amp; Scores ML/IA</h3>
          <p>Visualisez les artefacts générés par les pipelines de Machine Learning et les métriques associées.</p>
        </div>
        <button type="button" className="ml-refresh" onClick={refetch}>
          🔄 Actualiser
        </button>
      </div>

      {isLoading && (
        <div className="ml-empty-state">Chargement des figures et scores...</div>
      )}

      {error && (
        <div className="ml-error">
          <p>Impossible de charger les artefacts.</p>
          <pre>{String(error?.response?.data?.details || error?.message)}</pre>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <section className="ml-section">
            <header className="ml-section-header">
              <h4>📈 Visualisations enregistrées</h4>
              <span>{hasFigures ? `${figures.length} fichier(s)` : 'Aucune figure détectée.'}</span>
            </header>
            {hasFigures ? (
              <div className="ml-figures-grid">
                {figures.map((figure) => (
                  <article key={figure.filename} className="ml-figure-card">
                    <div className="ml-figure-preview" role="button" tabIndex={0} onClick={() => setSelectedFigure(figure)} onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setSelectedFigure(figure);
                      }
                    }}>
                      <img src={figure.url} alt={figure.label || figure.filename} loading="lazy" />
                    </div>
                    <div className="ml-figure-meta">
                      <h5>{figure.label || figure.filename}</h5>
                      <p>{figure.filename}</p>
                      <p>{formatBytes(figure.size)} · {formatDate(figure.modifiedAt)}</p>
                      <a className="ml-link" href={figure.url} target="_blank" rel="noreferrer">
                        Ouvrir dans un nouvel onglet
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ml-empty-state">
                Placez vos fichiers .png dans <code>reports/figures</code> pour les afficher ici.
              </div>
            )}
          </section>

          <section className="ml-section">
            <header className="ml-section-header">
              <h4>📑 Scores &amp; métriques</h4>
              <span>{hasScores ? `${scores.length} fichier(s)` : 'Aucune métrique disponible.'}</span>
            </header>
            {hasScores ? (
              <div className="ml-scores-list">
                {scoreRows.map((file) => (
                  <article key={file.filename} className="ml-score-card">
                    <div className="ml-score-header">
                      <div>
                        <h5>{file.filename}</h5>
                        <p>{formatBytes(file.size)} · {formatDate(file.modifiedAt)}</p>
                      </div>
                      <a className="ml-link" href={file.url} target="_blank" rel="noreferrer" download>
                        Télécharger le CSV
                      </a>
                    </div>
                    {file.rows.length === 0 ? (
                      <div className="ml-empty-state">Fichier vide ou non lisible.</div>
                    ) : (
                      <div className="ml-table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              {file.headers && file.headers.map((header) => (
                                <th key={header}>{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {file.rows.map((row, rowIndex) => (
                              <tr key={`${file.filename}-${rowIndex}`}>
                                {file.headers && file.headers.map((header) => (
                                  <td key={`${file.filename}-${rowIndex}-${header}`}>
                                    {row[header] || '—'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {file.hasMore && (
                          <div className="ml-note">Affichage des {file.rows.length} premières lignes sur {file.totalRows}.</div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="ml-empty-state">
                Déposez vos fichiers de scores (ex: <code>medal_regression_scores.csv</code>) dans <code>reports/</code>.
              </div>
            )}
          </section>
        </>
      )}

      {selectedFigure && (
        <div className="ml-lightbox" role="dialog" aria-modal="true" onClick={() => setSelectedFigure(null)}>
          <div className="ml-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="ml-lightbox-close" onClick={() => setSelectedFigure(null)} aria-label="Fermer la prévisualisation">
              ✖
            </button>
            <img src={selectedFigure.url} alt={selectedFigure.label || selectedFigure.filename} />
            <div className="ml-lightbox-meta">
              <h5>{selectedFigure.label || selectedFigure.filename}</h5>
              <p>{selectedFigure.filename}</p>
              <p>{formatBytes(selectedFigure.size)} · {formatDate(selectedFigure.modifiedAt)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MlFiguresPanel;
