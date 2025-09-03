import React from "react";
import { 
  Divider, 
  Typography, 
  Box 
} from "@mui/material";

import { useAppSelector } from "../store/hooks";
import { 
  selectRound, 
  selectPhase, 
  selectDeckCounts 
} from "../store/selectors";
import { Phase } from "../state/types";

function getRoundDisplay(round: number, phase: Phase): string {
  if (phase === 'setup') return "Not Started";
  return `Round ${round}`;
}

function formatDeckStatus(counts: { remaining: number; inPlay: number; discard: number; total: number }): string {
  return `Deck: ${counts.remaining}R • ${counts.inPlay}P • ${counts.discard}D`;
}

export function HeaderBar() {
  const round = useAppSelector(selectRound);
  const phase = useAppSelector(selectPhase);
  const deckCounts = useAppSelector(selectDeckCounts);

  const roundDisplay = getRoundDisplay(round, phase);
  const deckStatus = formatDeckStatus(deckCounts);

  return (
    <>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: "1.125rem",
            fontWeight: "bold",
            color: "text.primary",
            mb: 0.5
          }}
        >
          SWADE Initiative
        </Typography>
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