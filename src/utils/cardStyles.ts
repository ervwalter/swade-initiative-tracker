import { cardsLookup } from "../store/selectors";
import { Theme } from "@mui/material/styles";

// Generate base style object with theme awareness
const getBaseStyle = (theme: Theme) => ({
  cursor: 'pointer',
  fontWeight: 'bold',
  minWidth: '50px',
  height: '28px',
  '& .MuiChip-label': {
    px: 1,
    fontSize: '1.2rem'
  },
  '&:hover': {
    // Cards should always be white like real playing cards
    backgroundColor: 'white',
    transform: 'none',
    opacity: 1
  }
});

export const getBaseCardStyle = (cardId: string, theme: Theme) => {
  const card = cardsLookup[cardId];
  const baseStyle = getBaseStyle(theme);
  
  if (!card) return { 
    color: 'black', 
    bgcolor: 'white', 
    border: `1px solid ${theme.palette.divider}`,
    ...baseStyle
  };
  
  if (card.rank === 'JOKER') {
    return {
      color: card.jokerColor === 'BLACK' ? 'black' : 'red',
      bgcolor: 'white',
      border: `1px solid ${theme.palette.divider}`,
      ...baseStyle
    };
  }
  
  // Regular cards - red for hearts/diamonds, black for spades/clubs
  const isRed = card.suit === 'H' || card.suit === 'D';
  return {
    color: isRed ? 'red' : 'black',
    bgcolor: 'white',
    border: `1px solid ${theme.palette.divider}`,
    ...baseStyle
  };
};