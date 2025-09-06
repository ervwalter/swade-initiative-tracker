// Undo Button Component
// Provides undo functionality with tooltip showing what will be undone

import { IconButton, Tooltip } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import { useUndo } from '../contexts/UndoContext';

export function UndoButton() {
  const { canUndo, undoDescription, performUndo } = useUndo();
  
  const handleClick = () => {
    if (canUndo) {
      performUndo();
    }
  };
  
  // Build tooltip text
  const tooltipTitle = canUndo && undoDescription
    ? `Undo: ${undoDescription}`
    : canUndo 
      ? 'Undo last action'
      : 'Nothing to undo';
  
  return (
    <Tooltip title={tooltipTitle}>
      <span>
        <IconButton 
          onClick={handleClick}
          disabled={!canUndo}
          size="small"
          sx={{ 
            color: canUndo ? 'text.primary' : 'text.disabled'
          }}
        >
          <UndoIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}