import React from "react";
import { 
  Box, 
  List, 
  ListItem,
  ListItemText,
  Typography
} from "@mui/material";
import GroupAddIcon from '@mui/icons-material/GroupAdd';

import { useAppSelector } from "../store/hooks";
import { selectParticipants } from "../store/selectors";

export function ParticipantList() {
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
      {participants.map((participant) => (
        <ListItem key={participant.id}>
          <ListItemText primary={participant.name} />
        </ListItem>
      ))}
    </List>
  );
}