import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack
} from "@mui/material";
import OBR from "@owlbear-rodeo/sdk";

import { getPluginId } from "../getPluginId";
import { ParticipantType } from "../store/types";
import { store } from "../store/store";
import { createParticipant } from "../store/swadeSlice";

export function AddParticipantModal() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store auto-initializes with OBR state - no manual setup needed

  // Note: Modal has fixed dimensions unlike popovers

  const handleAddParticipant = async (type: ParticipantType) => {
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Dispatch Redux action instead of direct OBR write
      store.dispatch(createParticipant({
        name: name.trim(),
        type
      }));
      
      console.log(`[Modal] Added participant: ${name} (${type})`);
      
      // Close modal
      await OBR.modal.close(getPluginId("add-participant"));
      
    } catch (error) {
      console.error('[Modal] Failed to add participant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    await OBR.modal.close(getPluginId("add-participant"));
  };

  return (
    <Box ref={containerRef} sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
        Add Participant
      </Typography>
      
      <Stack spacing={2} sx={{ flex: 1, justifyContent: 'center' }}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
          autoFocus
          disabled={isSubmitting}
          variant="outlined"
          size="small"
        />
        
        <Stack direction="row" spacing={1}>
          <Button
            onClick={() => handleAddParticipant("PC")}
            disabled={!name.trim() || isSubmitting}
            size="small"
            variant="contained"
            sx={{ flex: 1 }}
          >
            {isSubmitting ? "Adding..." : "+PC"}
          </Button>
          <Button
            onClick={() => handleAddParticipant("NPC")}
            disabled={!name.trim() || isSubmitting}
            size="small"
            variant="contained"
            sx={{ flex: 1 }}
          >
            {isSubmitting ? "Adding..." : "+NPC"}
          </Button>
          <Button
            onClick={() => handleAddParticipant("GROUP")}
            disabled={!name.trim() || isSubmitting}
            size="small"
            variant="contained"
            sx={{ flex: 1 }}
          >
            {isSubmitting ? "Adding..." : "+Extra"}
          </Button>
        </Stack>
        
        <Button
          onClick={handleCancel}
          disabled={isSubmitting}
          size="small"
          color="inherit"
          fullWidth
        >
          Cancel
        </Button>
      </Stack>
    </Box>
  );
}