import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  Card,
  CardContent,
  useTheme,
  IconButton,
  Tooltip
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import UndoIcon from '@mui/icons-material/Undo';
import OBR from "@owlbear-rodeo/sdk";

import { getPluginId } from "../getPluginId";
import { store } from "../store/store";
import { addCandidateCard, selectKeeperCard, undoLastDraw } from "../store/swadeSlice";
import { cardsLookup } from "../store/selectors";
import { useAppSelector } from "../store/hooks";
import { ActionCard } from "./ActionCard";

export function CardChooserModal() {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardWarning, setShowDiscardWarning] = useState(false);

  // Get participant ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const participantId = urlParams.get('participantId');

  // Get participant data from Redux store
  const participant = useAppSelector(state => 
    state.swade.rows.find((p: any) => p.id === participantId)
  );

  const remainingCards = useAppSelector(state => state.swade.deck.remaining.length);

  // Initialize selected card to current card if exists
  useEffect(() => {
    if (participant?.currentCardId && !selectedCardId) {
      setSelectedCardId(participant.currentCardId);
    }
  }, [participant?.currentCardId, selectedCardId]);

  // Note: Modal has fixed dimensions unlike popovers

  if (!participant) {
    // Don't show error immediately - give Redux time to load
    return null;
  }

  const currentCard = participant.currentCardId ? cardsLookup[participant.currentCardId] : null;
  const candidateCards = participant.candidateIds.map((cardId: string) => cardsLookup[cardId]).filter(Boolean);
  const additionalCards = candidateCards.filter((card: any) => card.id !== participant.currentCardId);

  const handleDrawAdditional = () => {
    if (remainingCards > 0) {
      store.dispatch(addCandidateCard(participant.id));
    }
  };

  const handleUndoDraw = () => {
    store.dispatch(undoLastDraw(participant.id));
  };

  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  const handleConfirmSelection = async () => {
    if (!selectedCardId) return;
    
    setIsSubmitting(true);
    
    try {
      store.dispatch(selectKeeperCard({
        participantId: participant.id,
        cardId: selectedCardId
      }));
      
      console.log(`[CardChooser] Selected ${selectedCardId} for ${participant.name}`);
      
      // Close modal
      await OBR.modal.close(getPluginId("card-chooser"));
      
    } catch (error) {
      console.error('[CardChooser] Failed to select card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    await OBR.modal.close(getPluginId("card-chooser"));
  };

  const renderCard = (card: any) => {
    const isSelected = card.id === selectedCardId;
    return (
      <ActionCard
        key={card.id}
        cardId={card.id}
        onClick={() => handleSelectCard(card.id)}
        selected={isSelected}
        sx={{
          border: 'none' // Remove border since we're using outline
        }}
      />
    );
  };

  return (
    <Box ref={containerRef} sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Title takes only space needed */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'center', pt: 2, px: 2 }}>
        Choose Initiative Card - {participant.name}
      </Typography>
      
      {/* Content fills remaining space and centers vertically */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', pb: 2 }}>
        <Stack spacing={3} sx={{ px: 2 }}>
          <Stack direction="row" spacing={4} sx={{ justifyContent: 'center' }}>
        {/* Original Card Section */}
        {currentCard && (
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 500, textAlign: 'center' }}>
              Original
            </Typography>
            <Stack direction="row" spacing={1}>
              {renderCard(currentCard)}
            </Stack>
          </Stack>
        )}
        
        {/* Additional Cards Section */}
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 500, textAlign: 'center' }}>
            Additional
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {additionalCards.map(card => renderCard(card))}
            <Tooltip title="Draw Additional Card">
              <IconButton
                onClick={handleDrawAdditional}
                disabled={remainingCards === 0 || isSubmitting}
                size="small"
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {candidateCards.length > 1 && (
              <Tooltip title="Undo Last Draw">
                <IconButton
                  onClick={handleUndoDraw}
                  disabled={isSubmitting}
                  size="small"
                >
                  <UndoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
        
        {/* No cards message */}
        {candidateCards.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No cards drawn for this participant yet
          </Typography>
        )}
      </Stack>
      
          {/* Action buttons */}
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
            <Button
              onClick={handleConfirmSelection}
              disabled={!selectedCardId || isSubmitting || candidateCards.length === 0}
              variant="contained"
              size="small"
            >
              {isSubmitting ? 'Selecting...' : 'Choose Selected Card'}
            </Button>
            
            <Button
              onClick={handleCancel}
              disabled={isSubmitting}
              variant="outlined"
              size="small"
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}