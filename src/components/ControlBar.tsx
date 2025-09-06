import { 
  Box,
  Button,
  Paper 
} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { useAppSelector, useAppDispatch } from "../store/hooks";
import { 
  selectRound, 
  selectPhase,
  selectParticipantCount,
  selectNextParticipant,
  selectPreviousParticipant
} from "../store/selectors";
import { dealRound, startRound, endRound, endInitiative, setActiveParticipant } from "../store/swadeSlice";
import { useUndo } from "../hooks/useUndo";

interface ControlBarProps {
  role?: "GM" | "PLAYER";
}

export function ControlBar({ role }: ControlBarProps) {
  const dispatch = useAppDispatch();
  const round = useAppSelector(selectRound);
  const phase = useAppSelector(selectPhase);
  const participantCount = useAppSelector(selectParticipantCount);
  const nextParticipant = useAppSelector(selectNextParticipant);
  const previousParticipant = useAppSelector(selectPreviousParticipant);
  const { captureCheckpoint } = useUndo();

  const handleDealRound = () => {
    captureCheckpoint(round === 0 ? 'Start Initiative' : 'Deal Cards');
    dispatch(dealRound());
  };

  const handleStartRound = () => {
    captureCheckpoint('Start Round');
    dispatch(startRound());
  };

  const handleEndRound = () => {
    captureCheckpoint('End Round');
    dispatch(endRound());
  };

  const handleEndInitiative = () => {
    captureCheckpoint('End Initiative');
    dispatch(endInitiative());
  };

  const handlePrevious = () => {
    if (previousParticipant) {
      captureCheckpoint(`Previous Turn: ${previousParticipant.name}`);
      dispatch(setActiveParticipant(previousParticipant.id));
    }
  };

  const handleNext = () => {
    if (nextParticipant) {
      captureCheckpoint(`Next Turn: ${nextParticipant.name}`);
      dispatch(setActiveParticipant(nextParticipant.id));
    }
  };

  // Only show controls to GM
  if (role !== "GM") {
    return null;
  }

  const isSetup = round === 0;
  const canDeal = phase === 'setup' || phase === 'between_rounds';
  const canStart = phase === 'cards_dealt';
  const canEnd = phase === 'in_round';
  const canEndInitiative = phase === 'between_rounds';
  const canNavigate = phase === 'in_round' && participantCount > 0;
  const hasParticipants = participantCount > 0;

  return (
    <Paper 
      elevation={3}
      sx={{ 
        borderRadius: 0,
        borderTop: 1,
        borderColor: 'divider'
      }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ 
          display: "flex", 
          gap: 1, 
          justifyContent: "center", 
          alignItems: "center",
          minHeight: 36 // Reserve consistent height for button area
        }}>
          {/* Navigation arrows - only during active round */}
          {canNavigate && (
            <>
              <Button
                variant="contained"
                onClick={handlePrevious}
                disabled={!previousParticipant}
                size="small"
                sx={{ minWidth: 'auto', px: 1 }}
              >
                <NavigateBeforeIcon />
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!nextParticipant}
                size="small"
                sx={{ minWidth: 'auto', px: 1 }}
              >
                <NavigateNextIcon />
              </Button>
            </>
          )}
          
          {/* End Initiative button */}
          {canEndInitiative && (
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              onClick={handleEndInitiative}
              size="small"
            >
              End Initiative
            </Button>
          )}
          
          {/* Deal Cards button */}
          {canDeal && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleDealRound}
              disabled={!hasParticipants}
              size="small"
            >
              {isSetup ? "Start Initiative" : "Deal Cards"}
            </Button>
          )}
          
          {/* Start Round button */}
          {canStart && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartRound}
              size="small"
            >
              Start Round
            </Button>
          )}
          
          {/* End Round button */}
          {canEnd && (
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              onClick={handleEndRound}
              size="small"
            >
              End Round
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}