import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import './ChartsStyles.css';

const MedalDistributionChart = ({ data, isLoading, filters }) => {
  const formatData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];
    
    return rawData.map(item => ({
      medal: item.medal || 'Inconnu',
      count: parseInt(item.count) || 0,
      percentage: 0 // Calculé après
    }));
  };

  const chartData = formatData(data);
  
  // Calculer les pourcentages
  const totalMedals = chartData.reduce((sum, item) => sum + item.count, 0);
  chartData.forEach(item => {
    item.percentage = totalMedals > 0 ? ((item.count / totalMedals) * 100).toFixed(1) : 0;
  });

  const COLORS = {
    'GOLD': '#FFD700',
    'SILVER': '#C0C0C0', 
    'BRONZE': '#CD7F32'
  };

  const RADIAN = Math.PI / 180;
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Ne pas afficher les labels pour les très petites valeurs

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
        textShadow="1px 1px 2px rgba(0,0,0,0.7)"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{data.medal}</p>
          <div className="tooltip-content">
            <div className="tooltip-item">
              <span 
                className="tooltip-color" 
                style={{ backgroundColor: COLORS[data.medal] || '#999' }}
              ></span>
              <span>Médailles: {data.count}</span>
            </div>
            <div className="tooltip-item">
              <span>Pourcentage: {data.percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => {
    return (
      <ul className="pie-legend">
        {payload.map((entry, index) => (
          <li key={`item-${index}`} className="legend-item">
            <span 
              className="legend-color" 
              style={{ backgroundColor: entry.color }}
            ></span>
            <span className="legend-text">
              {entry.value} ({entry.payload.count})
            </span>
          </li>
        ))}
      </ul>
    );
  };

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>Distribution des médailles</h3>
        </div>
        <div className="chart-loading">
          <div className="loading-skeleton chart-skeleton-pie"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0 || totalMedals === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>Distribution des médailles</h3>
        </div>
        <div className="chart-empty">
          <div className="empty-icon">🏅</div>
          <p>Aucune donnée disponible pour ces filtres</p>
          <small>Essayez de modifier vos critères de recherche</small>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Distribution des médailles</h3>
        <div className="chart-info">
          <span className="chart-count">{totalMedals} médailles</span>
          {filters && Object.keys(filters).length > 0 && (
            <span className="chart-filtered">Filtré</span>
          )}
        </div>
      </div>
      
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="count"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.medal] || '#999'} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              content={<CustomLegend />}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="chart-footer">
        <div className="chart-stats">
          {chartData.map((item, index) => (
            <div key={index} className="stat-item">
              <span className="stat-value" style={{ color: COLORS[item.medal] || '#999' }}>
                {item.count}
              </span>
              <span className="stat-label">{item.medal}</span>
            </div>
          ))}
          <div className="stat-item">
            <span className="stat-value">{totalMedals}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedalDistributionChart;