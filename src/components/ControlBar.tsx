import React from "react";
import { 
  Box,
  Button,
  Divider,
  Paper 
} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

import { useAppSelector, useAppDispatch } from "../store/hooks";
import { 
  selectRound, 
  selectPhase,
  selectParticipantCount
} from "../store/selectors";
import { dealRound, endRound } from "../store/swadeSlice";

interface ControlBarProps {
  role?: "GM" | "PLAYER";
}

export function ControlBar({ role }: ControlBarProps) {
  const dispatch = useAppDispatch();
  const round = useAppSelector(selectRound);
  const phase = useAppSelector(selectPhase);
  const participantCount = useAppSelector(selectParticipantCount);

  const handleDealRound = () => {
    dispatch(dealRound());
  };

  const handleEndRound = () => {
    dispatch(endRound());
  };

  // Only show controls to GM
  if (role !== "GM") {
    return null;
  }

  const isSetup = round === 0;
  const canDeal = phase === 'setup' || phase === 'between_rounds';
  const canEnd = phase === 'in_round';
  const hasParticipants = participantCount > 0;

  return (
    <Paper 
      elevation={3}
      sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderRadius: 0,
        borderTop: 1,
        borderColor: 'divider'
      }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", alignItems: "center" }}>
          {canDeal && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleDealRound}
              disabled={!hasParticipants}
              size="small"
            >
              {isSetup ? "Start" : "Deal"}
            </Button>
          )}
          
          {canEnd && (
            <Button
              variant="contained"
              startIcon={<StopIcon />}
              onClick={handleEndRound}
              size="small"
            >
              End Round
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}