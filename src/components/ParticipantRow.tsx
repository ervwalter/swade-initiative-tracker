import React from "react";
import { 
  ListItem, 
  ListItemText, 
  IconButton,
  Box 
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

import { ParticipantRow as ParticipantRowType } from "../store/types";
import { useAppDispatch } from "../store/hooks";
import { removeParticipant } from "../store/swadeSlice";

interface ParticipantRowProps {
  participant: ParticipantRowType;
  role?: "GM" | "PLAYER";
}

export function ParticipantRow({ participant, role }: ParticipantRowProps) {
  const dispatch = useAppDispatch();

  const handleRemove = () => {
    dispatch(removeParticipant(participant.id));
  };

  return (
    <ListItem>
      <ListItemText primary={participant.name} />
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
