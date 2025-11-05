# Journal des tests de non-régression

Utiliser ce journal pour tracer chaque campagne de smoke test après une mise à jour (API, UI, pipelines). Compléter les dates, commandes et résultats.

## Plan de tests minimal

| Catégorie | Cas | Commande / Action | Résultat attendu |
|-----------|-----|-------------------|------------------|
| API legacy | `GET /api/athletes` | `curl "http://localhost:3001/api/athletes?limit=20"` | 200 OK, 20 enregistrements |
| API legacy | `GET /api/results` | `curl "http://localhost:3001/api/results?sport=Athletics&limit=10"` | 200 OK, structure JSON inchangée |
| API stats | `GET /api/stats` | `curl http://localhost:3001/api/stats` | 200 OK, totaux numériques |
| Export | Script traitement | `python -m src.run_all` | Pipeline complet sans erreur |
| Frontend | Dashboard legacy | Navigation onglets `Vue d'ensemble / Graphiques / Données détaillées` | Chargement sans erreur, graphiques présents |
| Frontend | Filtres | Appliquer filtre `Pays = France`, `Année = 2000-2024` | Données cohérentes, tables mises à jour |
| Frontend | Tableau prédictions | Bascule Prévision/Réalisé | Affichage des valeurs et delta |

## Historique des campagnes

Compléter pour chaque run :

| Date & heure (UTC+1) | Environnement | Tests exécutés | Résultat | Notes /
Correctifs |
|----------------------|--------------|----------------|----------|----------------|
| JJ/MM/AAAA HH:MM | Local dev | API athletes / results / stats | ✅ | Aucune anomalie |
| JJ/MM/AAAA HH:MM | Local dev | run_all + Dashboard | ⚠️ | Latence sur /api/results > 5s |

Ajouter une ligne par incident rencontré en indiquant la résolution (commit, issue, rollback, etc.)."