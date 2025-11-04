import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const StatsCard = ({ 
  title, 
  value, 
  icon, 
  color, 
  format = 'number', 
  description, 
  breakdown 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatValue = (val) => {
    if (format === 'number') {
      return val.toLocaleString();
    }
    if (format === 'percentage') {
      return `${val.toFixed(1)}%`;
    }
    if (format === 'currency') {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(val);
    }
    return val.toString();
  };

  const handleCardClick = () => {
    if (breakdown) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <motion.div 
      className={`stats-card ${breakdown ? 'expandable' : ''} ${isExpanded ? 'expanded' : ''}`}
      style={{ '--card-color': color }}
      onClick={handleCardClick}
      whileHover={{ scale: breakdown ? 1.02 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="stats-card-header">
        <div className="stats-icon" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
        <div className="stats-content">
          <motion.div 
            className="stats-value"
            key={value}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {formatValue(value)}
          </motion.div>
          <div className="stats-title">{title}</div>
        </div>
        {breakdown && (
          <div className="expand-indicator">
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
          </div>
        )}
      </div>

      <div className="stats-description">
        {description}
      </div>

      <AnimatePresence>
        {isExpanded && breakdown && (
          <motion.div
            className="stats-breakdown"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="breakdown-title">Répartition :</div>
            {Object.entries(breakdown).map(([label, count]) => (
              <div key={label} className="breakdown-item">
                <span className="breakdown-label">
                  {label === 'Or' && '🥇'}
                  {label === 'Argent' && '🥈'}
                  {label === 'Bronze' && '🥉'}
                  {label}
                </span>
                <span className="breakdown-value">{formatValue(count)}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicateur de tendance (optionnel) */}
      <div className="stats-trend">
        {/* Ici on pourrait ajouter des flèches de tendance si on a des données historiques */}
      </div>
    </motion.div>
  );
};

export default StatsCard;