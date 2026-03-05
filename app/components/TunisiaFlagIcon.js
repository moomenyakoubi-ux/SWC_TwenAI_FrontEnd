import React from 'react';
import Svg, { Circle, Path, Polygon, G } from 'react-native-svg';

/**
 * Icona della bandiera della Tunisia a forma di cerchio
 * Caratteristiche:
 * - Cerchio rosso esterno
 * - Cerchio bianco interno (più piccolo)
 * - Mezza luna rossa a sinistra
 * - Stella a 5 punte rossa a destra
 * 
 * @param {number} size - Dimensione dell'icona (default: 24)
 * @param {string} color - Colore del bordo (opzionale)
 */
const TunisiaFlagIcon = ({ size = 24, color }) => {
  // Scala l'icona per riempire meglio lo spazio
  const scale = 1.15;
  const viewSize = size * scale;
  const center = viewSize / 2;
  const radius = (size / 2) - 1;
  
  // Colori bandiera Tunisia
  const redColor = '#E70013';    // Rosso tunisino
  const whiteColor = '#FFFFFF';  // Bianco

  // Dimensioni più grandi per i simboli
  const whiteCircleRadius = radius * 0.55;
  const symbolSize = radius * 0.35; // Simboli più grandi
  const spacing = radius * 0.12;    // Spazio tra mezzaluna e stella

  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      style={{ margin: -((scale - 1) * size) / 2 }}
    >
      <G transform={`translate(${(viewSize - size) / 2}, ${(viewSize - size) / 2})`}>
        {/* Cerchio rosso esterno (sfondo) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill={redColor}
          stroke={color || redColor}
          strokeWidth={1}
        />
        
        {/* Cerchio bianco interno */}
        <Circle
          cx={center}
          cy={center}
          r={whiteCircleRadius}
          fill={whiteColor}
        />
        
        {/* Gruppo mezzaluna + stella - centrato nel cerchio bianco */}
        <G>
          {/* Mezzaluna rossa - a sinistra */}
          <Path
            d={`
              M ${center - spacing - symbolSize * 0.2} ${center - symbolSize}
              A ${symbolSize} ${symbolSize} 0 1 1 ${center - spacing - symbolSize * 0.2} ${center + symbolSize}
              A ${symbolSize * 0.75} ${symbolSize * 0.75} 0 1 0 ${center - spacing - symbolSize * 0.2} ${center - symbolSize}
              Z
            `}
            fill={redColor}
          />
          
          {/* Stella a 5 punte rossa - a destra */}
          <Polygon
            points={`
              ${center + spacing + symbolSize * 0.5},${center - symbolSize * 0.95}
              ${center + spacing + symbolSize * 0.75},${center - symbolSize * 0.35}
              ${center + spacing + symbolSize * 1.25},${center - symbolSize * 0.35}
              ${center + spacing + symbolSize * 0.85},${center}
              ${center + spacing + symbolSize * 1.0},${center + symbolSize * 0.6}
              ${center + spacing + symbolSize * 0.5},${center + symbolSize * 0.35}
              ${center + spacing},${center + symbolSize * 0.6}
              ${center + spacing + symbolSize * 0.15},${center}
              ${center + spacing - symbolSize * 0.25},${center - symbolSize * 0.35}
              ${center + spacing + symbolSize * 0.25},${center - symbolSize * 0.35}
            `}
            fill={redColor}
          />
        </G>
      </G>
    </Svg>
  );
};

export default TunisiaFlagIcon;
