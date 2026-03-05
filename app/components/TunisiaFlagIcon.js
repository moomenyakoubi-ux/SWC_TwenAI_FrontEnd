import React from 'react';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

/**
 * Icona della bandiera della Tunisia a forma di cerchio
 * @param {number} size - Dimensione dell'icona (default: 24)
 * @param {string} color - Colore del bordo (opzionale)
 */
const TunisiaFlagIcon = ({ size = 24, color }) => {
  const center = size / 2;
  const radius = size / 2 - 1;
  
  // Colori bandiera Tunisia
  const redColor = '#E70013';    // Rosso tunisino
  const whiteColor = '#FFFFFF';  // Bianco

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Cerchio rosso esterno (sfondo) */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill={redColor}
        stroke={color || redColor}
        strokeWidth={1}
      />
      
      {/* Cerchio bianco interno (centro) */}
      <Circle
        cx={center}
        cy={center}
        r={radius * 0.42}
        fill={whiteColor}
      />
      
      {/* Mezzaluna rossa */}
      <Path
        d={`
          M ${center} ${center - radius * 0.22}
          A ${radius * 0.18} ${radius * 0.18} 0 1 1 ${center} ${center + radius * 0.14}
          A ${radius * 0.14} ${radius * 0.14} 0 1 0 ${center} ${center - radius * 0.22}
          Z
        `}
        fill={redColor}
      />
      
      {/* Stella a 5 punte rossa */}
      <Polygon
        points={`
          ${center},${center - radius * 0.08}
          ${center + radius * 0.025},${center - radius * 0.025}
          ${center + radius * 0.08},${center - radius * 0.025}
          ${center + radius * 0.035},${center + radius * 0.015}
          ${center + radius * 0.05},${center + radius * 0.07}
          ${center},${center + radius * 0.04}
          ${center - radius * 0.05},${center + radius * 0.07}
          ${center - radius * 0.035},${center + radius * 0.015}
          ${center - radius * 0.08},${center - radius * 0.025}
          ${center - radius * 0.025},${center - radius * 0.025}
        `}
        fill={redColor}
      />
    </Svg>
  );
};

export default TunisiaFlagIcon;
