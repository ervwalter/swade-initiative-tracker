import React, { useEffect, useRef, useState, useCallback } from "react";
import { 
  ListItem,
  Box,
  Typography,
  useTheme,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  TextField
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckIcon from '@mui/icons-material/Check';
import { FaHeart, FaHeartBroken, FaEye, FaEyeSlash, FaBan, FaLongArrowAltRight, FaHandPaper, FaLevelDownAlt } from 'react-icons/fa';
import OBR from "@owlbear-rodeo/sdk";

import { ParticipantRow as ParticipantRowType } from "../store/types";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { cardsLookup, selectActiveParticipant, selectPhase, selectPrivacyMode } from "../store/selectors";
import { removeParticipant, setHold, loseHold, insertActNow, setInactive, setRevealed, setParticipantType, renameParticipant, setModalResult } from "../store/swadeSlice";
import { RED_JOKER_ID, BLACK_JOKER_ID } from "../utils/cardIds";
import { getPluginId } from "../getPluginId";
import { useUndo } from "../hooks/useUndo";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { ActionCard } from "./ActionCard";

interface ParticipantRowProps {
  participant: ParticipantRowType;
  role?: "GM" | "PLAYER";
  isJokerAtTop: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}

export const ParticipantRow = ({ participant, role, isJokerAtTop, editingId, setEditingId }: ParticipantRowProps) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const activeParticipant = useAppSelector(selectActiveParticipant);
  const phase = useAppSelector(selectPhase);
  const privacyEnabled = useAppSelector(selectPrivacyMode);
  const modalResult = useAppSelector(state => state.swade.modalResult);
  const ref = useRef<HTMLLIElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [editedName, setEditedName] = useState(participant.name);
  const { captureCheckpoint, performUndo } = useUndo();
  
  const isActive = activeParticipant?.id === participant.id;
  const isEditing = editingId === participant.id;

  // Auto-scroll when this participant becomes active
  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [isActive]);

  // Update edited name when participant name changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditedName(participant.name);
    }
  }, [participant.name, isEditing]);

  // Watch for modal result changes to trigger undo when cancelled
  useEffect(() => {
    console.log('[ParticipantRow] modalResult changed to:', modalResult);
    if (modalResult === 'cancelled') {
      console.log('[ParticipantRow] Modal was cancelled, triggering undo...');
      performUndo();
      console.log('[ParticipantRow] Undo completed, clearing modalResult flag');
      dispatch(setModalResult(undefined)); // Clear flag
    } else if (modalResult === 'confirmed') {
      console.log('[ParticipantRow] Card selection completed normally, clearing modalResult flag');
      dispatch(setModalResult(undefined)); // Clear flag
    }
  }, [modalResult, performUndo, dispatch]);
  const currentCard = participant.currentCardId ? cardsLookup[participant.currentCardId] : null;
  const isJoker = participant.currentCardId === RED_JOKER_ID || participant.currentCardId === BLACK_JOKER_ID;
  const inRound = phase === 'in_round';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleRemove = () => {
    captureCheckpoint(`Remove: ${participant.name}`);
    dispatch(removeParticipant(participant.id));
    handleMenuClose();
  };

  const handleChangeType = (newType: 'PC' | 'NPC' | 'GROUP') => {
    captureCheckpoint(`Change ${participant.name} to ${newType}`);
    dispatch(setParticipantType({ id: participant.id, type: newType }));
    handleMenuClose();
  };

  const handleToggleHold = () => {
    const action = participant.onHold ? 'Remove Hold' : 'Hold';
    captureCheckpoint(`${action}: ${participant.name}`);
    dispatch(setHold({ id: participant.id, value: !participant.onHold }));
  };

  const handleLoseHold = () => {
    captureCheckpoint(`Lose Hold: ${participant.name}`);
    dispatch(loseHold(participant.id));
  };

  const handleActBefore = () => {
    captureCheckpoint(`Act Now Before: ${participant.name}`);
    dispatch(insertActNow({ id: participant.id, placement: 'before' }));
  };

  const handleActAfter = () => {
    captureCheckpoint(`Act Now After: ${participant.name}`);
    dispatch(insertActNow({ id: participant.id, placement: 'after' }));
  };

  const handleToggleRevealed = () => {
    const action = participant.revealed ? 'Hide' : 'Reveal';
    captureCheckpoint(`${action}: ${participant.name}`);
    dispatch(setRevealed({ id: participant.id, value: !participant.revealed }));
  };

  const handleToggleInactive = () => {
    const action = participant.inactive ? 'Activate' : 'Deactivate';
    captureCheckpoint(`${action}: ${participant.name}`);
    dispatch(setInactive({ id: participant.id, value: !participant.inactive }));
  };

  const handleCardClick = () => {
    // Only GM can modify cards
    if (role !== "GM") return;

    if (currentCard || participant.candidateIds.length > 0) {
      // Clear any previous modal result
      console.log('[ParticipantRow] Clearing modalResult and opening Card Chooser modal');
      dispatch(setModalResult(undefined));
      captureCheckpoint(`Manage Cards: ${participant.name}`);

      OBR.modal.open({
        id: getPluginId("card-chooser"),
        url: `/card-chooser?participantId=${participant.id}`,
        width: 500,
        height: 250,
        hideBackdrop: false
      });
    }
  };

  const autoSave = useCallback(() => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== participant.name) {
      captureCheckpoint(`Rename: ${participant.name} → ${trimmedName}`);
      dispatch(renameParticipant({ id: participant.id, name: trimmedName }));
    }
  }, [editedName, participant.name, participant.id, captureCheckpoint, dispatch]);


  const handleNameClick = () => {
    if (role !== "GM") return;
    setEditingId(participant.id);
    setEditedName(participant.name);
  };

  const handleNameSave = () => {
    autoSave();
    setEditingId(null);
  };

  const handleNameKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleNameSave();
    }
  };



  return (
    <ListItem 
      ref={ref}
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
        justifyContent: 'flex-end',
        zIndex: 1
      }}>
        {/* Menu button - only visible on hover, to the left of card */}
        {role === "GM" && (
          <>
            <Tooltip title="Options">
              <IconButton
                className="remove-button"
                onClick={handleMenuOpen}
                size="small"
                sx={{ 
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  color: 'text.secondary',
                  "&:hover": { 
                    color: "primary.main"
                  }
                }}
              >
                <MoreVertIcon sx={{ fontSize: '1.25rem' }} />
              </IconButton>
            </Tooltip>
            
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
            >
              <MenuItem onClick={() => handleChangeType('PC')} dense>
                <ListItemIcon>
                  {participant.type === 'PC' ? <CheckIcon /> : null}
                </ListItemIcon>
                PC
              </MenuItem>
              <MenuItem onClick={() => handleChangeType('NPC')} dense>
                <ListItemIcon>
                  {participant.type === 'NPC' ? <CheckIcon /> : null}
                </ListItemIcon>
                NPC
              </MenuItem>
              <MenuItem onClick={() => handleChangeType('GROUP')} dense>
                <ListItemIcon>
                  {participant.type === 'GROUP' ? <CheckIcon /> : null}
                </ListItemIcon>
                Extra
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleRemove} dense>
                <ListItemIcon>
                  <DeleteIcon />
                </ListItemIcon>
                Remove
              </MenuItem>
            </Menu>
          </>
        )}
        
        {/* Card/Hold display */}
        {participant.onHold ? (
          <Box sx={{ 
            width: '50px',
            minWidth: '50px',
            height: '28px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <FaHandPaper style={{ fontSize: '1.2rem', color: theme.palette.text.primary, opacity: 1 }} />
          </Box>
        ) : currentCard ? (
          <ActionCard
            cardId={participant.currentCardId!}
            onClick={handleCardClick}
            sx={{
              cursor: role === "GM" ? 'pointer' : 'default',
            }}
          />
        ) : null}
      </Box>

      {/* Avatar on far left */}
      <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
        <ParticipantAvatar 
          imageUrl={participant.imageUrl}
          name={participant.name}
          type={participant.type}
        />
      </Box>

      {/* Main content area - leave space for card on right */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        pr: (participant.onHold || currentCard) ? 10 : (role === "GM" ? 4 : 2)
        // 10 = space for 60px element + gap + menu button
        // 4 = space for menu button on hover (GM only)
        // 2 = minimal padding (players)
      }}>
        {/* Row 1: Name */}
        <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', minHeight: '28px' }}>
          {isEditing ? (
            <>
              <TextField
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={() => {
                  autoSave();
                  setEditingId(null);
                }}
                autoFocus
                variant="standard"
                size="small"
                sx={{
                  flex: 1,
                  '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
                  '& .MuiInput-underline:hover:before': { borderBottomColor: 'primary.main' },
                  '& .MuiInputBase-input': {
                    fontWeight: isActive ? 'bold' : 'normal',
                    fontSize: '1rem',
                    px: 0.5,
                    py: 0,
                    height: '24px',
                    lineHeight: '24px'
                  },
                  '& .MuiInputBase-root': {
                    mt: 0
                  }
                }}
                onFocus={(e) => e.target.select()}
              />
              <IconButton
                size="small"
                onClick={handleNameSave}
                sx={{ ml: 0.5, color: 'success.main' }}
              >
                <CheckIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </>
          ) : (
            <Typography 
              variant="body1" 
              onClick={handleNameClick}
              sx={{ 
                fontWeight: isActive ? 'bold' : 'normal',
                textDecoration: participant.inactive ? 'line-through' : 'none',
                opacity: participant.inactive ? 0.6 : 1,
                userSelect: 'none',
                cursor: role === "GM" ? 'pointer' : 'default',
                flex: 1,
                px: 0.5,
                borderRadius: 1,
                '&:hover': role === "GM" ? {
                  backgroundColor: 'action.hover'
                } : {}
              }}
            >
              {participant.name}
            </Typography>
          )}
        </Box>

        {/* Row 2: Action buttons */}
        {role === "GM" && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Visibility toggle - only show when privacy mode is enabled */}
            {privacyEnabled && (
              <Tooltip title={participant.revealed ? "Hide from Players" : "Reveal to Players"}>
                <Box
                  onClick={handleToggleRevealed}
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                  {participant.revealed ? (
                    <FaEye style={{ fontSize: '1rem', color: theme.palette.text.secondary, opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                  ) : (
                    <FaEyeSlash style={{ fontSize: '1rem', color: theme.palette.text.secondary, opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                  )}
                </Box>
              </Tooltip>
            )}
            
            {/* Incapacitated toggle - always visible */}
            <Tooltip title={participant.inactive ? "Mark as Active" : "Mark as Incapacitated"}>
              <Box
                onClick={handleToggleInactive}
                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                {participant.inactive ? (
                  <FaHeartBroken style={{ fontSize: '1rem', color: theme.palette.text.secondary, opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                ) : (
                  <FaHeart style={{ fontSize: '1rem', color: theme.palette.text.secondary, opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                )}
              </Box>
            </Tooltip>
            
            {/* Hold toggle - when active and in round, or always for Jokers */}
            {(isActive || isJoker) && inRound && (
              <Tooltip title={participant.onHold ? "Clear Hold" : "Go on Hold"}>
                <Box
                  onClick={handleToggleHold}
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <FaHandPaper style={{ fontSize: '1rem', color: theme.palette.text.secondary, opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                </Box>
              </Tooltip>
            )}
            
            {/* Lose Turn - only when held and not active and in round */}
            {participant.onHold && !isActive && inRound && (
              <Tooltip title="Lose Turn (Shaken/Stunned)">
                <Box
                  onClick={handleLoseHold}
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <FaBan style={{ fontSize: '1rem', color: theme.palette.text.secondary, opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                </Box>
              </Tooltip>
            )}
            
            {/* Act Now buttons - for held participants or Jokers at the top when not active and in round */}
            {((participant.onHold || isJokerAtTop) && !isActive && inRound) && (
              <>
                <Tooltip title="Act Now">
                  <Box
                    onClick={handleActBefore}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <FaLongArrowAltRight style={{ fontSize: '1rem', color: theme.palette.text.secondary, opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                  </Box>
                </Tooltip>
                <Tooltip title="Act After Current Combatant">
                  <Box
                    onClick={handleActAfter}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <FaLevelDownAlt style={{ fontSize: '1rem', color: theme.palette.text.secondary, opacity: 0.5, transition: "opacity 0.2s, color 0.2s", cursor: 'pointer' }} />
                  </Box>
                </Tooltip>
              </>
            )}
          </Box>
        )}
      </Box>
    </ListItem>
  );
};
