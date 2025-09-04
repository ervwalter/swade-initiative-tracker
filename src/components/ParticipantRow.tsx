import React from "react";
import { 
  ListItem, 
  ListItemText, 
  IconButton,
  Box,
  Chip,
  Typography
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

import { ParticipantRow as ParticipantRowType } from "../store/types";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { cardsLookup, selectActiveParticipant } from "../store/selectors";
import { removeParticipant } from "../store/swadeSlice";

interface ParticipantRowProps {
  participant: ParticipantRowType;
  role?: "GM" | "PLAYER";
}

export function ParticipantRow({ participant, role }: ParticipantRowProps) {
  const dispatch = useAppDispatch();
  const activeParticipant = useAppSelector(selectActiveParticipant);
  
  const isActive = activeParticipant?.id === participant.id;
  const currentCard = participant.currentCardId ? cardsLookup[participant.currentCardId] : null;

  const handleRemove = () => {
    dispatch(removeParticipant(participant.id));
  };

  const getCardStyle = (cardId: string) => {
    const card = cardsLookup[cardId];
    if (!card) return { color: 'black', bgcolor: 'white' };
    
    if (card.rank === 'JOKER') {
      return {
        color: card.jokerColor === 'BLACK' ? 'black' : 'red',
        bgcolor: 'white',
        border: '1px solid #ddd'
      };
    }
    
    // Regular cards - red for hearts/diamonds, black for spades/clubs
    const isRed = card.suit === 'H' || card.suit === 'D';
    return {
      color: isRed ? 'red' : 'black',
      bgcolor: 'white',
      border: '1px solid #ddd'
    };
  };

  return (
    <ListItem 
      sx={{ 
        bgcolor: isActive ? 'action.selected' : 'transparent',
        borderLeft: 3,
        borderColor: isActive ? 'primary.main' : 'transparent',
        borderLeftStyle: 'solid'
      }}
    >
      <ListItemText 
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: isActive ? 'bold' : 'normal' }}>
              {participant.name}
            </Typography>
            {participant.inactive && (
              <Chip label="Inactive" size="small" variant="outlined" color="default" />
            )}
            {participant.onHold && (
              <Chip label="Hold" size="small" variant="outlined" color="warning" />
            )}
          </Box>
        }
      />
      
      {/* Card display - right aligned */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {currentCard ? (
          <Chip 
            label={currentCard.label}
            size="small"
            sx={{
              ...getCardStyle(participant.currentCardId!),
              fontWeight: 'bold',
              minWidth: '50px',
              height: '28px',
              '& .MuiChip-label': {
                px: 1,
                fontSize: '1.2rem'
              }
            }}
          />
        ) : (
          <Box sx={{ width: '50px', height: '28px' }} /> // Placeholder to maintain alignment
        )}
      </Box>
      {role === "GM" && (
        <Box sx={{ ml: 1 }}>
          <IconButton
            size="small"
            onClick={handleRemove}
            sx={{ 
              color: "text.secondary",
              "&:hover": { color: "error.main" }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </ListItem>
  );
}
