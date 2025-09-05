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

  // Resize popover to fit content
  useEffect(() => {
    if (containerRef.current) {
      const { scrollWidth, scrollHeight } = containerRef.current;
      OBR.popover.setWidth(getPluginId("add-participant"), scrollWidth + 4); // Add small margin
      OBR.popover.setHeight(getPluginId("add-participant"), scrollHeight + 4);
    }
  }, []);

  const handleAddParticipant = async (type: ParticipantType) => {
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Dispatch Redux action instead of direct OBR write
      store.dispatch(createParticipant({
        name: name.trim(),
        type,
        tokenIds: []
      }));
      
      console.log(`[Modal] Added participant: ${name} (${type})`);
      
      // Close modal
      await OBR.popover.close(getPluginId("add-participant"));
      
    } catch (error) {
      console.error('[Modal] Failed to add participant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    await OBR.popover.close(getPluginId("add-participant"));
  };

  return (
    <Box ref={containerRef} sx={{ p: 2, minWidth: 380 }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
        Add Participant
      </Typography>
      
      <Stack spacing={2}>
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