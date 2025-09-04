import React from "react";
import { 
  Divider, 
  Typography, 
  Box,
  IconButton 
} from "@mui/material";
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import OBR from "@owlbear-rodeo/sdk";

import { useAppSelector } from "../store/hooks";
import { 
  selectRound, 
  selectPhase, 
  selectDeckCounts 
} from "../store/selectors";
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
  const round = useAppSelector(selectRound);
  const phase = useAppSelector(selectPhase);
  const deckCounts = useAppSelector(selectDeckCounts);

  const roundDisplay = getRoundDisplay(round, phase);
  const deckStatus = formatDeckStatus(deckCounts);

  const handleAddParticipant = () => {
    OBR.popover.open({
      id: getPluginId("add-participant"),
      url: "/add-participant",
      width: 286,
      height: 217
    });
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
            Initiative Tracker
          </Typography>
          {role === "GM" && (
            <IconButton
              onClick={handleAddParticipant}
              size="small"
              sx={{ color: "primary.main" }}
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
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
      <Divider variant="middle" />
    </>
  );
}