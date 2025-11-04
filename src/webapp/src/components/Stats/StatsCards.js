import React from 'react';
import StatsCard from './StatsCard';
import { motion } from 'framer-motion';

const StatsCards = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="stats-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stats-card skeleton">
            <div className="skeleton-line large"></div>
            <div className="skeleton-line medium"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-grid">
        <div className="stats-error">
          ⚠️ Aucune statistique disponible
        </div>
      </div>
    );
  }

  const cardsData = [
    {
      id: 'athletes',
      title: 'Athlètes',
      value: stats.totalAthletes || 0,
      icon: '🏃‍♂️',
      color: '#3b82f6',
      format: 'number',
      description: 'Nombre total d\'athlètes'
    },
    {
      id: 'medals',
      title: 'Médailles',
      value: stats.totalMedals || 0,
      icon: '🏅',
      color: '#facc15',
      format: 'number',
      description: 'Nombre total de médailles',
      breakdown: stats.medalDistribution && {
        'Or': stats.medalDistribution.Gold || 0,
        'Argent': stats.medalDistribution.Silver || 0,
        'Bronze': stats.medalDistribution.Bronze || 0
      }
    },
    {
      id: 'countries',
      title: 'Pays',
      value: stats.totalCountries || 0,
      icon: '🌍',
      color: '#16a34a',
      format: 'number',
      description: 'Nombre de pays participants'
    },
    {
      id: 'sports',
      title: 'Sports',
      value: stats.totalSports || 0,
      icon: '⚽',
      color: '#dc2626',
      format: 'number',
      description: 'Nombre de sports différents'
    }
  ];

  return (
    <motion.div 
      className="stats-grid"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {cardsData.map((cardData, index) => (
        <motion.div
          key={cardData.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <StatsCard {...cardData} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StatsCards;