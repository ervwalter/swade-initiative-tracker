import React from "react";
import { 
  ListItem, 
  ListItemText, 
  Box,
  Chip,
  Typography,
  useTheme
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import { FaHeart, FaHeartBroken, FaEye, FaEyeSlash, FaBan, FaLongArrowAltRight, FaHandPaper, FaLevelDownAlt } from 'react-icons/fa';

import { ParticipantRow as ParticipantRowType } from "../store/types";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { cardsLookup, selectActiveParticipant, selectPhase } from "../store/selectors";
import { removeParticipant, setHold, loseHold, insertActNow, setInactive, setRevealed } from "../store/swadeSlice";
import { RED_JOKER_ID, BLACK_JOKER_ID } from "../deck/cardIds";

interface ParticipantRowProps {
  participant: ParticipantRowType;
  role?: "GM" | "PLAYER";
  isJokerAtTop: boolean;
}

export function ParticipantRow({ participant, role, isJokerAtTop }: ParticipantRowProps) {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const activeParticipant = useAppSelector(selectActiveParticipant);
  const phase = useAppSelector(selectPhase);
  
  const isActive = activeParticipant?.id === participant.id;
  const currentCard = participant.currentCardId ? cardsLookup[participant.currentCardId] : null;
  const isJoker = participant.currentCardId === RED_JOKER_ID || participant.currentCardId === BLACK_JOKER_ID;
  const inRound = phase === 'in_round';

  const handleRemove = () => {
    dispatch(removeParticipant(participant.id));
  };

  const handleToggleHold = () => {
    dispatch(setHold({ id: participant.id, value: !participant.onHold }));
  };

  const handleLoseHold = () => {
    dispatch(loseHold(participant.id));
  };

  const handleActBefore = () => {
    dispatch(insertActNow({ id: participant.id, placement: 'before' }));
  };

  const handleActAfter = () => {
    dispatch(insertActNow({ id: participant.id, placement: 'after' }));
  };

  const handleToggleRevealed = () => {
    dispatch(setRevealed({ id: participant.id, value: !participant.revealed }));
  };

  const handleToggleInactive = () => {
    dispatch(setInactive({ id: participant.id, value: !participant.inactive }));
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
        borderLeftStyle: 'solid',
        py: 1,
        position: 'relative',
        '&:hover .remove-button': {
          opacity: 1
        }
      }}
    >
      {/* Card/Hold display and remove button - spans both rows on the right */}
      <Box sx={{ 
        position: 'absolute',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: '60px',
        justifyContent: 'flex-end',
        zIndex: 1
      }}>
        {/* Remove button - only visible on hover, to the left of card */}
        {role === "GM" && (
          <Box
            className="remove-button"
            onClick={handleRemove}
            title="Remove Participant"
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
              cursor: 'pointer'
            }}
          >
            <DeleteIcon 
              sx={{
                fontSize: '1.25rem',
                color: 'text.secondary',
                "&:hover": { 
                  color: "error.main"
                }
              }}
            />
          </Box>
        )}
        
        {/* Card/Hold display */}
        {participant.onHold ? (
          <FaHandPaper style={{ fontSize: '1.5rem', color: theme.palette.text.primary, opacity: 1 }} />
        ) : currentCard ? (
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
          <Box sx={{ width: '50px', height: '28px' }} />
        )}
      </Box>

      {/* Main content area - leave space for card on right */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        pr: 8 // Leave space for card area
      }}>
        {/* Row 1: Name */}
        <Box sx={{ mb: 0.5 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: isActive ? 'bold' : 'normal',
              textDecoration: participant.inactive ? 'line-through' : 'none',
              opacity: participant.inactive ? 0.6 : 1
            }}
          >
            {participant.name}
          </Typography>
        </Box>

        {/* Row 2: Action buttons */}
        {role === "GM" && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Visibility toggle - always visible */}
            <Box
              onClick={handleToggleRevealed}
              title={participant.revealed ? "Hide from Players" : "Reveal to Players"}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              {participant.revealed ? (
                <FaEye style={{ fontSize: '1rem', opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
              ) : (
                <FaEyeSlash style={{ fontSize: '1rem', opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
              )}
            </Box>
            
            {/* Incapacitated toggle - always visible */}
            <Box
              onClick={handleToggleInactive}
              title={participant.inactive ? "Mark as Active" : "Mark as Incapacitated"}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              {participant.inactive ? (
                <FaHeartBroken style={{ fontSize: '1rem', opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
              ) : (
                <FaHeart style={{ fontSize: '1rem', opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
              )}
            </Box>
            
            {/* Hold toggle - when active and in round, or always for Jokers */}
            {(isActive || isJoker) && inRound && (
              <Box
                onClick={handleToggleHold}
                title={participant.onHold ? "Clear Hold" : "Go on Hold"}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <FaHandPaper style={{ fontSize: '1rem', opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
              </Box>
            )}
            
            {/* Lose Turn - only when held and not active and in round */}
            {participant.onHold && !isActive && inRound && (
              <Box
                onClick={handleLoseHold}
                title="Lose Turn (Shaken/Stunned)"
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <FaBan style={{ fontSize: '1rem', opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
              </Box>
            )}
            
            {/* Act Now buttons - for held participants or Jokers at the top when not active and in round */}
            {((participant.onHold || isJokerAtTop) && !isActive && inRound) && (
              <>
                <Box
                  onClick={handleActBefore}
                  title="Act Now"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <FaLongArrowAltRight style={{ fontSize: '1rem', opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                </Box>
                <Box
                  onClick={handleActAfter}
                  title="Act After Current Combatant"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <FaLevelDownAlt style={{ fontSize: '1rem', opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    </ListItem>
  );
}
