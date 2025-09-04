import React from "react";
import { 
  Box, 
  List, 
  Typography
} from "@mui/material";
import GroupAddIcon from '@mui/icons-material/GroupAdd';

import { useAppSelector } from "../store/hooks";
import { selectParticipants } from "../store/selectors";
import { RED_JOKER_ID, BLACK_JOKER_ID } from "../deck/cardIds";
import { ParticipantRow } from "./ParticipantRow";

interface ParticipantListProps {
  role?: "GM" | "PLAYER";
}

export function ParticipantList({ role }: ParticipantListProps) {
  const participants = useAppSelector(selectParticipants);

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
          No participants added
        </Typography>
        <Typography 
          variant="caption" 
          color="text.disabled" 
          align="center"
          sx={{ mt: 0.5 }}
        >
          Add participants to start initiative
        </Typography>
      </Box>
    );
  }

  return (
    <List>
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
}