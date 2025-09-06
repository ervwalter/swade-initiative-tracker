import { Box, Typography } from "@mui/material";
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';

export function InitiativeInactiveMessage() {
  return (
    <Box 
      sx={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        flex: 1,
        py: 4,
        px: 4 
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PauseCircleOutlineIcon 
          sx={{ 
            fontSize: 24, 
            color: "text.disabled", 
            mr: 1 
          }} 
        />
        <Typography 
          variant="body1" 
          color="text.secondary"
        >
          Initiative Not Active
        </Typography>
      </Box>
      <Typography 
        variant="caption" 
        color="text.disabled" 
        align="center"
        sx={{ maxWidth: '300px', lineHeight: 1.4, fontSize: '0.7rem' }}
      >
        Waiting for the GM to start initiative and deal action cards.
      </Typography>
    </Box>
  );
}