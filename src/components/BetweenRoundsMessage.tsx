import { Box, Typography } from "@mui/material";
import AutorenewIcon from '@mui/icons-material/Autorenew';

export function BetweenRoundsMessage() {
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
        <AutorenewIcon 
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
          End of Round
        </Typography>
      </Box>
      <Typography 
        variant="caption" 
        color="text.disabled" 
        align="left"
        sx={{ maxWidth: '300px', lineHeight: 1.4, fontSize: '0.7rem' }}
      >
        Resolve expiring effects, upkeep for powers & conditions, bleeding out rolls, ongoing environmental damage, etc.
      </Typography>
    </Box>
  );
}