# Livrable - Projet Olympique JO

## Auteur et contexte
- Auteur : Hicham (projet individuel)
- Objectif : analyse et prediction des performances olympiques 1896-2024
- Pile technique : Python (pandas, scikit-learn), Node.js/Express, React, MySQL
- Livrables : scripts data, API REST, dashboard web, rapports et notebooks

## Liens utiles
- Depot GitHub : https://github.com/Hicham77500/Olympique_JO
- Trello : non applicable (projet individuel)
- Webapp : execution locale http://localhost:3000 (pas encore de mise en ligne)
- API : http://localhost:3001/api
- Support de presentation : a produire

## Contenu du depot
- `README.md` : procedures d'installation (API, frontend, mode demo)
- Notebooks bruts : `notebooks/01_exploration.ipynb` a `05_prediction_medals.ipynb`, `exploration.ipynb`, `import.ipynb`
- Nettoyage et ingestion : `src/data_prep/`, `src/convert_*`, `config/data_paths.yaml`
- Modeles et scripts ML : `src/models/train_medal_predictor.py`, `src/models/train_clustering.py`, `src/models/save_predictions_to_db.py`
- API Express : `src/api/app.js`, `src/api/database.js`, configuration `.env`
- Frontend React : `webapp/` (React Query, Recharts, filtres dynamiques)
- Donnees : `data/` (brut, demo, processed), `csv/`, `data/processed/`
- Artefacts : `models/*.joblib`, `reports/*.csv`, `reports/figures/*.png`, `reports/summary.md`

## Lancement rapide (Windows PowerShell)
```powershell
# 1. Cloner le depot
cd <chemin_de_travail>
git clone https://github.com/Hicham77500/Olympique_JO.git
cd Olympique_JO

# 2. Installer les dependances Node
cd src\api
npm ci
cd ..\webapp
npm ci
cd ..\..

# 3. (Optionnel) Environnement Python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 4. Variables d'environnement
#   src\api\.env : PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE, DEMO_MODE
#   src\webapp\.env : REACT_APP_API_URL, PORT

# 5a. Mode complet (MySQL)
mysql -h <HOST> -u <USER> -p < sql\init_db.sql
python src\load_data_to_mysql.py
cd src\api
npm start
# nouveau terminal
cd src\webapp
npm start

# 5b. Mode demo (sans MySQL)
#   DEMO_MODE=true dans src\api\.env pour servir data/demo/*.json
cd src\api
npm start
# nouveau terminal
cd src\webapp
npm start
```
- Dashboard : http://localhost:3000
- API : http://localhost:3001/api
- Notebooks : `jupyter notebook` puis ouverture des fichiers du dossier `notebooks/`

## Jeu de donnees et contraintes
- Formats heterogenes (CSV, JSON, XML, HTML) convertis via `src/convert_*`
- Valeurs manquantes sur la nationalite, la date de naissance ou le type de medal
- Doublons potentiels sur les couples athlete-evenement selon les sources
- Noms de pays et editions non homogenes (ex. URSS vs Russie)
- Editions manquantes durant les guerres conservees telles quelles pour respecter l'historique

## Nettoyage et preparation
Pipeline implemente dans `src/data_prep/preprocess.py` et detaille dans `02_preprocessing.ipynb` :
1. Chargement des sources via `config/data_paths.yaml`
2. Explosion des listes d'athletes et rapprochement avec leurs profils (jointure sur `athlete_url`, `slug_game`)
3. Fusion des resultats, profils et medailles avec harmonisation des colonnes ville/pays
4. Creation de la cible `medal_flag` et conversion des types numeriques
5. Imputation mediane/mode pour les valeurs manquantes critiques
6. Aggregation par pays et edition (`data/processed/country_year_summary.csv`)
7. Export des jeux intermediaires dans `data/processed/`

## Modelisation
### Classification (prediction de medal_flag)
- Pipeline scikit-learn : preprocessus numerique/categoriel + RandomForestClassifier
- Recherche d'hyperparametres via GridSearchCV (voir `config/model_params.yaml`)
- Donnees : `data/processed/olympic_full.csv`
- Scores (`reports/classification_metrics.csv`) : accuracy 0.982, f1 classe positive 0.973
- Modele sauvegarde : `models/rf_classifier_medal.joblib`
- Figure : `reports/figures/classification_confusion_matrix.png`

### Regression (nombre total de medailles)
- Features derivees de `country_year_summary.csv`
- RandomForestRegressor vs LinearRegression (`reports/medal_regression_scores.csv`)
- Performances : MAE 6.10 / RMSE 17.67 pour RandomForest
- Predictions exportees : `reports/medal_predictions.csv`
- Insertion optionnelle en base : `src/models/save_predictions_to_db.py`

### Clustering des pays
- Standardisation puis KMeans (k par defaut = 4) avec evaluation coude et silhouette
- Projection PCA 2D pour interpretation visuelle
- Artefacts : `data/processed/country_year_clusters.csv`, `models/kmeans_clusters.joblib`
- Figures : `reports/figures/clustering_elbow_silhouette.png`, `reports/figures/clustering_pca.png`

## API REST (`src/api/app.js`)
- Express + mysql2, CORS actif, logs de requetes
- Mode DEMO_MODE=true : lecture dans `data/demo/*.json` sans connexion MySQL
- Routes principales : `GET /api`, `/api/athletes`, `/api/hosts`, `/api/medals`, `/api/results`, `/api/predicted_medals`, `/api/filters`, `/api/stats`, `/api/stats/quick`, `POST /api/data/filtered`, `/api/reports/figures`, `/api/reports/scores`
- Gestion des limites, pagination, filtrage multi-criteres et fallback CSV pour `medal_predictions`

## Frontend React (`webapp/`)
- React 18, React Query, React Select, Recharts, Axios
- Dashboard responsive : cartes, graphiques, tuiles de KPIs, tableau de resultats
- Filtres cumulables (pays, sports, saisons, intervalle d'annees, type de medaille, genre, recherche texte)
- Compatible mode demo (meme contrat API)

## Notebooks disponibles
- `01_exploration.ipynb` : analyse exploratoire et statistiques descriptives
- `02_preprocessing.ipynb` : pipeline de nettoyage detaille
- `03_clustering.ipynb` : choix du nombre de clusters et interpretation
- `04_classification.ipynb` : entrainement, metriques et importance des variables
- `05_prediction_medals.ipynb` : regression, evaluation et export des predictions
- `exploration.ipynb`, `import.ipynb` : essais supplementaires et validations

## Artefacts et rapports
- Modeles : `models/rf_classifier_medal.joblib`, `models/reg_medals_total_random_forest.joblib`, `models/kmeans_clusters.joblib`
- Rapports : `reports/classification_metrics.csv`, `reports/medal_regression_scores.csv`, `reports/medal_predictions.csv`
- Figures : dossier `reports/figures/` (matrice de confusion, coude, PCA, feature importance)
- Synthese : `reports/summary.md`

## Prochaines etapes recommandees
1. Deployer l'API (Railway, Render) et le frontend (Vercel, Netlify) avec base MySQL geree
2. Industrialiser via Docker Compose (API, frontend, MySQL) et scripts de seed
3. Ajouter des tests unitaires/integration et automatiser via CI/CD
4. Produire un support de presentation et, si besoin, ouvrir un tableau de suivi (Trello ou GitHub Projects)
