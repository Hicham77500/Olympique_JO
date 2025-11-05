# Journal de bord méthodologique

## Objectifs pédagogiques
- Documenter chaque étape de la chaîne data → modèle.
- Justifier les choix techniques (features, modèles, métriques).
- Capitaliser sur les difficultés et pistes d'amélioration.

## Structure suggérée
1. **Exploration (Notebook 01)**
   - Jeux de données utilisés, anomalies détectées.
   - Graphiques clés enregistrés dans `reports/figures`.
2. **Préparation (Notebook 02)**
   - Étapes de nettoyage et de fusion.
   - Colonnes créées, choix d'imputation.
3. **Clustering (Notebook 03)**
   - Variables retenues, meilleure valeur de `k`.
   - Interprétation des clusters.
4. **Classification (Notebook 04)**
   - Baselines, hyperparamètres testés.
   - Scores finaux, biais potentiels.
5. **Prédiction de médailles (Notebook 05)**
   - Modèles de régression entraînés.
   - Scénarios envisagés pour Paris 2024.

## Bonnes pratiques
- Fixer `random_state` pour la reproductibilité.
- Versionner les jeux traités dans `data/processed`.
- Sauvegarder les modèles et métriques dans `models/` et `reports/`.
- Mettre à jour régulièrement ce document après chaque session de travail.

## Insertion des prédictions en BDD
- Commande à lancer (adapter les identifiants MySQL) :
   ```bash
   python -m src.models.save_predictions_to_db --host <host> --user <user> --password <password> --database olympics
   ```
- Vérifications immédiates :
   ```sql
   SELECT COUNT(*) FROM medal_predictions;
   SELECT * FROM medal_predictions LIMIT 5;
   ```
- Consigner ici la date/heure de la dernière insertion validée et les résultats des requêtes de contrôle.

## Exposition API des prédictions
- Endpoint ajouté : `GET /api/predicted_medals`
   - Paramètres optionnels : `country`, `slug_game`, `target`, `model`, `limit`, `offset`.
   - Réponse JSON type :
      ```json
      [
         {
            "country": "France",
            "slug_game": "paris-2024",
            "model_name": "random_forest",
            "target": "medals_total",
            "predicted_value": 45.2,
            "actual_medals": 39,
            "created_at": "2025-11-05T13:20:00Z"
         }
      ]
      ```
- Tests d'intégration : exécuter `npm run test` dans `src/api` (requiert les variables d'environnement MySQL configurées). Les tests sont ignorés automatiquement si la connexion BDD est absente.
- Documenter ici la date du dernier run de tests et les résultats observés.

## Visualisation frontend des prédictions
- Hook React Query : `usePredictedMedals` (fichier `src/webapp/src/hooks/usePredictedMedals.js`) interroge l'endpoint avec les filtres actifs (pays, plage d'années) et joint les données réelles si disponibles (`includeActual=true`).
- Tableau "🔮 Prédictions de médailles" (composant `PredictedMedals`) intégré à la vue d'ensemble : affichage des colonnes pays/édition/modèle/valeur prédite, badge prévision, bascule pour comparer au réalisé et delta.
- Les chargements sont gérés via l'état global (spinner partagé) et les erreurs affichent un panneau dédié.
- Tests UI recommandés : vérifier l'affichage avec filtres (ex. `France` + `2000-2024`), contrôler le toggle réalisé/prédit, confirmer la présence d'une valeur lorsque la BDD contient des lignes dans `medal_predictions`.

## Journal d'exécution et preuves
- Documenter chaque run dans le tableau suivant pour retracer les opérations clés.
   | Étape | Commande / Action | Date & heure (UTC+1) | Résultat / Commentaire |
   |-------|-------------------|----------------------|-------------------------|
   | Chargement BDD | `python -m src.models.save_predictions_to_db ...` | JJ/MM/AAAA HH:MM | `COUNT(*)=XXXX`, `LIMIT 5` OK |
   | Test API | `curl http://localhost:3001/api/predicted_medals?country=France&includeActual=true` | JJ/MM/AAAA HH:MM | 200 OK, 50 lignes, `predicted_value` présent |
   | Test Postman | Collection `Olympics Predictions` → requête `GET /api/predicted_medals` | JJ/MM/AAAA HH:MM | Capture PNG `docs/screenshots/postman_predicted_medals.png` |
   | UI Dashboard | Filtre `France` + années `2000-2024`, bascule réalisé/prédit | JJ/MM/AAAA HH:MM | Screenshot `docs/screenshots/ui_predicted_medals.png` |

- Stocker les captures d'écran dans `docs/screenshots/` avec un nom explicite (`ui_predicted_medals_2025-11-05T1320.png`, etc.).
- Ajouter, si possible, un log de test utilisateur rapide :
   ```text
   [JJ/MM/AAAA HH:MM] Utilisateur test : affichage des prédictions OK, bascule réalisé -> prévision OK, comparaison France 2020 lisible.
   ```
- Mentionner toute anomalie ou régression observée (ex : écart négatif incohérent, lenteur API) et ouvrir une issue GitHub si nécessaire.
