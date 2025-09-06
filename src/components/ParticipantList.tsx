import React, { forwardRef } from "react";
import { 
  Box, 
  List, 
  Typography
} from "@mui/material";
import GroupAddIcon from '@mui/icons-material/GroupAdd';

import { useAppSelector } from "../store/hooks";
import { selectVisibleParticipants } from "../store/selectors";
import { RED_JOKER_ID, BLACK_JOKER_ID } from "../utils/cardIds";
import { ParticipantRow } from "./ParticipantRow";

interface ParticipantListProps {
  role?: "GM" | "PLAYER";
}

export const ParticipantList = forwardRef<HTMLUListElement, ParticipantListProps>(({ role }, ref) => {
  const participants = useAppSelector(state => selectVisibleParticipants(state, role));

  if (participants.length === 0) {
    return (
      <Box 
        sx={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          minHeight: "100%",
          py: 4,
          px: 3 
        }}
      >
        <GroupAddIcon 
          sx={{ 
            fontSize: 48, 
            color: "text.disabled", 
            mb: 2 
          }} 
        />
        <Typography 
          variant="body1" 
          color="text.secondary" 
          align="center"
        >
          No combatants added
        </Typography>
        <Typography 
          variant="caption" 
          color="text.disabled" 
          align="center"
          sx={{ mt: 0.5 }}
        >
          Add combatants to start initiative
        </Typography>
      </Box>
    );
  }

  return (
    <List ref={ref} sx={{ overflow: 'auto', flex: 1, scrollbarGutter: 'stable' }}>
      {participants.map((participant, index) => {
        // Calculate if this Joker is "at the top" (no non-Jokers before them)
        const isJoker = participant.currentCardId === RED_JOKER_ID || participant.currentCardId === BLACK_JOKER_ID;
        const hasNonJokersAhead = participants.slice(0, index).some(p => 
          p.currentCardId !== RED_JOKER_ID && p.currentCardId !== BLACK_JOKER_ID
        );
        const isJokerAtTop = isJoker && !hasNonJokersAhead;
        
        return (
          <ParticipantRow 
            key={participant.id}
            participant={participant}
            role={role}
            isJokerAtTop={isJokerAtTop}
          />
        );
      })}
    </List>
  );
});