import React from 'react';
import { Chip, useTheme } from '@mui/material';
import { getBaseCardStyle } from '../utils/cardStyles';
import { cardsLookup } from '../store/selectors';

interface ActionCardProps {
  cardId: string;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
  sx?: object;
}

/**
 * Reusable ActionCard component that displays SWADE action cards consistently
 * across the application with proper styling and interaction handling
 */
export function ActionCard({ 
  cardId, 
  onClick, 
  disabled = false,
  selected = false,
  className,
  sx = {}
}: ActionCardProps) {
  const theme = useTheme();
  const card = cardsLookup[cardId];
  
  if (!card) {
    console.warn(`[ActionCard] Unknown card ID: ${cardId}`);
    return null;
  }

  return (
    <Chip
      label={card.label}
      size="small"
      onClick={onClick}
      disabled={disabled}
      className={className}
      sx={{
        ...getBaseCardStyle(cardId, theme),
        outline: selected ? '3px solid' : 'none',
        outlineColor: selected ? 'error.main' : 'transparent',
        outlineOffset: '2px',
        opacity: disabled ? 0.5 : 1,
        ...sx // Allow style overrides
      }}
    />
  );
}