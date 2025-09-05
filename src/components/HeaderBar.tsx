import React, { useState } from "react";
import { 
  Divider, 
  Typography, 
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from "@mui/material";
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import OBR from "@owlbear-rodeo/sdk";

import { useAppSelector, useAppDispatch } from "../store/hooks";
import { 
  selectRound, 
  selectPhase, 
  selectDeckCounts,
  selectPrivacyMode 
} from "../store/selectors";
import { reset, setPrivacy } from "../store/swadeSlice";
import { clearEncounterState } from "../store/roomState";
import { Phase } from "../store/types";
import { getPluginId } from "../getPluginId";

function getRoundDisplay(round: number, phase: Phase): string {
  if (phase === 'setup') return "Not Started";
  return `Round ${round}`;
}

function formatDeckStatus(counts: { remaining: number; inPlay: number; discard: number; total: number }): string {
  return `Deck: ${counts.remaining}R • ${counts.inPlay}P • ${counts.discard}D`;
}

interface HeaderBarProps {
  role?: "GM" | "PLAYER";
}

export function HeaderBar({ role }: HeaderBarProps) {
  const dispatch = useAppDispatch();
  const round = useAppSelector(selectRound);
  const phase = useAppSelector(selectPhase);
  const deckCounts = useAppSelector(selectDeckCounts);
  const privacyEnabled = useAppSelector(selectPrivacyMode);
  
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);

  const roundDisplay = getRoundDisplay(round, phase);
  const deckStatus = formatDeckStatus(deckCounts);

  const handleAddParticipant = () => {
    OBR.popover.open({
      id: getPluginId("add-participant"),
      url: "/add-participant",
      width: 400,
      height: 180
    });
  };

  const handleTogglePrivacy = () => {
    dispatch(setPrivacy(!privacyEnabled));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset the entire initiative tracker? This will remove all participants and restart from scratch.")) {
      try {
        // Reset local Redux state
        dispatch(reset());
        
        // Clear OBR metadata entirely
        await clearEncounterState();
        
        handleMenuClose();
      } catch (error) {
        console.error('Failed to clear OBR metadata:', error);
        alert('Reset failed. Could not clear the room metadata.');
      }
    }
  };

  return (
    <>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontSize: "1.125rem",
              fontWeight: "bold",
              color: "text.primary"
            }}
          >
            Initiative
          </Typography>
          {role === "GM" && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={privacyEnabled ? "Hide NPCs by default from players" : "Show all combatants to players"}>
                <IconButton
                  onClick={handleTogglePrivacy}
                  size="small"
                  sx={{ color: "text.primary" }}
                >
                  {privacyEnabled ? (
                    <FaEyeSlash style={{ fontSize: '1rem' }} />
                  ) : (
                    <FaEye style={{ fontSize: '1rem' }} />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Add Combatant">
                <IconButton
                  onClick={handleAddParticipant}
                  size="small"
                  sx={{ color: "primary.main" }}
                >
                  <PersonAddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="More Options">
                <IconButton
                  onClick={handleMenuOpen}
                  size="small"
                  sx={{ color: "text.secondary" }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "baseline" }}>
          <Typography 
            variant="subtitle1" 
            color="text.primary"
            sx={{ fontWeight: 500 }}
          >
            {roundDisplay}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {deckStatus}
          </Typography>
        </Box>
      </Box>
      
      {/* GM Menu */}
      {role === "GM" && (
        <Menu
          anchorEl={menuAnchor}
          open={menuOpen}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleReset}>
            <ListItemIcon>
              <RestartAltIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Reset Initiative Tracker" />
          </MenuItem>
        </Menu>
      )}
      
      <Divider variant="middle" />
    </>
  );
}