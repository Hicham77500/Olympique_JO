import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './ChartsStyles.css';

const YearEvolutionChart = ({ data, isLoading, filters }) => {
  const formatData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];
    
    return rawData.map(item => ({
      year: parseInt(item.year),
      medals: parseInt(item.medals) || 0
    })).sort((a, b) => a.year - b.year);
  };

  const chartData = formatData(data);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{`Année ${label}`}</p>
          <div className="tooltip-content">
            <div className="tooltip-item primary">
              <span className="tooltip-color"></span>
              <span>Médailles: {data.medals}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const getGradientId = () => `yearEvolutionGradient-${Math.random().toString(36).substr(2, 9)}`;

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>Évolution des médailles par année</h3>
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
          <h3>Évolution des médailles par année</h3>
        </div>
        <div className="chart-empty">
          <div className="empty-icon">📈</div>
          <p>Aucune donnée disponible pour ces filtres</p>
          <small>Essayez de modifier vos critères de recherche</small>
        </div>
      </div>
    );
  }

  const gradientId = getGradientId();

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Évolution des médailles par année</h3>
        <div className="chart-info">
          <span className="chart-count">{chartData.length} années</span>
          {filters && Object.keys(filters).length > 0 && (
            <span className="chart-filtered">Filtré</span>
          )}
        </div>
      </div>
      
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toString()}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Nombre de médailles', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="medals"
              stroke="#3B82F6"
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="chart-footer">
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-value">
              {chartData.reduce((sum, item) => sum + item.medals, 0)}
            </span>
            <span className="stat-label">Total médailles</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {Math.max(...chartData.map(item => item.medals))}
            </span>
            <span className="stat-label">Record annuel</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {Math.round(chartData.reduce((sum, item) => sum + item.medals, 0) / chartData.length)}
            </span>
            <span className="stat-label">Moyenne par année</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {`${Math.min(...chartData.map(item => item.year))} - ${Math.max(...chartData.map(item => item.year))}`}
            </span>
            <span className="stat-label">Période</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearEvolutionChart;