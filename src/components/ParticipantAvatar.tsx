import React, { useState, useMemo } from 'react';
import { Avatar, useTheme } from '@mui/material';
import { IoMdPerson } from 'react-icons/io';
import type { ParticipantType } from '../store/types';

interface ParticipantAvatarProps {
  imageUrl?: string;
  name: string;
  type: ParticipantType;
  size?: number;
}

/**
 * Avatar component for participants that shows token images or default icon
 * with colored borders based on participant type
 */
export function ParticipantAvatar({ 
  imageUrl, 
  name, 
  type, 
  size = 32 
}: ParticipantAvatarProps) {
  const theme = useTheme();
  const [hasImageError, setHasImageError] = useState(false);

  // Validate image URL - reject empty strings or invalid URLs
  const validImageUrl = imageUrl && imageUrl.trim() && !hasImageError ? imageUrl : undefined;

  // Memoize border color calculation to avoid recalculating on every render
  const borderColor = useMemo(() => {
    switch (type) {
      case 'PC':
        return theme.palette.success.main; // Green
      case 'NPC':
        return theme.palette.info.main; // Blue
      case 'GROUP':
        return theme.palette.text.disabled; // Disabled text color (lighter than secondary, darker than divider)
      default:
        return theme.palette.text.disabled;
    }
  }, [type, theme.palette]);

  const handleImageError = () => {
    setHasImageError(true);
  };

  return (
    <Avatar
      src={validImageUrl}
      alt={`${name} avatar`}
      onError={handleImageError}
      sx={{
        width: size,
        height: size,
        bgcolor: 'background.paper',
        boxShadow: `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${borderColor}`,
        '& img': {
          objectFit: 'cover'
        }
      }}
    >
      {!validImageUrl && (
        <IoMdPerson 
          size={size * 0.7} // Icon slightly smaller than container
          color={theme.palette.text.secondary}
        />
      )}
    </Avatar>
  );
}