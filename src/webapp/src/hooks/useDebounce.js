import { useState, useEffect } from 'react';

/**
 * Hook pour débouncer une valeur
 * @param {*} value - La valeur à débouncer
 * @param {number} delay - Le délai en millisecondes
 * @returns {*} La valeur débouncée
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;