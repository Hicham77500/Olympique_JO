import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ChartsStyles.css';

const CountryMedalsChart = ({ data, isLoading, filters }) => {
  const formatData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];
    
    return rawData.map(item => ({
      country: item.country || 'Inconnu',
      Gold: parseInt(item.gold) || 0,
      Silver: parseInt(item.silver) || 0,
      Bronze: parseInt(item.bronze) || 0,
      total: parseInt(item.total) || 0
    }));
  };

  const chartData = formatData(data);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          <div className="tooltip-content">
            <div className="tooltip-item gold">
              <span className="tooltip-color"></span>
              <span>Or: {data.Gold}</span>
            </div>
            <div className="tooltip-item silver">
              <span className="tooltip-color"></span>
              <span>Argent: {data.Silver}</span>
            </div>
            <div className="tooltip-item bronze">
              <span className="tooltip-color"></span>
              <span>Bronze: {data.Bronze}</span>
            </div>
            <div className="tooltip-total">
              <strong>Total: {data.total}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>Médailles par pays</h3>
        </div>
        <div className="chart-loading">
          <div className="loading-skeleton chart-skeleton"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>Médailles par pays</h3>
        </div>
        <div className="chart-empty">
          <div className="empty-icon">📊</div>
          <p>Aucune donnée disponible pour ces filtres</p>
          <small>Essayez de modifier vos critères de recherche</small>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Médailles par pays</h3>
        <div className="chart-info">
          <span className="chart-count">{chartData.length} pays</span>
          {filters && Object.keys(filters).length > 0 && (
            <span className="chart-filtered">Filtré</span>
          )}
        </div>
      </div>
      
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="country" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Nombre de médailles', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            <Bar 
              dataKey="Gold" 
              stackId="medals" 
              fill="#FFD700" 
              name="Or"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="Silver" 
              stackId="medals" 
              fill="#C0C0C0" 
              name="Argent"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="Bronze" 
              stackId="medals" 
              fill="#CD7F32" 
              name="Bronze"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="chart-footer">
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-value">
              {chartData.reduce((sum, item) => sum + item.total, 0)}
            </span>
            <span className="stat-label">Total médailles</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {chartData.reduce((sum, item) => sum + item.Gold, 0)}
            </span>
            <span className="stat-label">Médailles d'or</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {Math.round(chartData.reduce((sum, item) => sum + item.total, 0) / chartData.length)}
            </span>
            <span className="stat-label">Moyenne par pays</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountryMedalsChart;