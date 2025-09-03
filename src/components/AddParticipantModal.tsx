import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack
} from "@mui/material";
import OBR from "@owlbear-rodeo/sdk";

import { getPluginId } from "../getPluginId";
import { readEncounterState, writeEncounterState } from "../state/sceneState";
import { ParticipantType } from "../state/types";

export function AddParticipantModal() {
  const [name, setName] = useState("");
  const [type, setType] = useState<ParticipantType>("PC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize popover to fit content
  useEffect(() => {
    if (containerRef.current) {
      const { scrollWidth, scrollHeight } = containerRef.current;
      OBR.popover.setWidth(getPluginId("add-participant"), scrollWidth + 4); // Add small margin
      OBR.popover.setHeight(getPluginId("add-participant"), scrollHeight + 4);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Read current state
      const currentState = await readEncounterState();
      if (!currentState) {
        console.error('[Modal] Could not read current state');
        return;
      }

      // Generate unique ID
      const id = `p-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      // Add participant to state
      const updatedState = {
        ...currentState,
        rows: {
          ...currentState.rows,
          [id]: {
            id,
            name: name.trim(),
            tokenIds: [],
            type,
            inactive: false,
            onHold: false,
            currentCardId: undefined,
            candidateIds: [],
            drewThisRound: false,
            revealed: type === 'PC' // PCs always visible, NPCs/Groups hidden initially
          }
        }
      };

      // Write updated state back
      await writeEncounterState(updatedState);
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
    <Box ref={containerRef} sx={{ p: 2, minWidth: 250 }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
        Add Participant
      </Typography>
      
      <Stack spacing={2} component="form" onSubmit={handleSubmit}>
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
        
        <FormControl fullWidth size="small">
          <InputLabel>Type</InputLabel>
          <Select
            value={type}
            label="Type"
            onChange={(e) => setType(e.target.value as ParticipantType)}
            disabled={isSubmitting}
          >
            <MenuItem value="PC">PC</MenuItem>
            <MenuItem value="NPC">NPC</MenuItem>
            <MenuItem value="GROUP">Group</MenuItem>
          </Select>
        </FormControl>
        
        <Stack direction="row" spacing={1}>
          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            size="small"
            sx={{ flex: 1 }}
          >
            {isSubmitting ? "Adding..." : "Add"}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isSubmitting}
            size="small"
            color="inherit"
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}