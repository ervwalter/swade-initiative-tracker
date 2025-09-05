import { cardsLookup } from "../store/selectors";

// Shared base style object - created once
const baseStyle = {
  cursor: 'pointer',
  '&:hover': {
    // Disable default MUI Chip hover effects
    backgroundColor: 'white',
    transform: 'none',
    opacity: 1
  }
};

export const getBaseCardStyle = (cardId: string) => {
  const card = cardsLookup[cardId];
  
  if (!card) return { 
    color: 'black', 
    bgcolor: 'white', 
    border: '1px solid #ddd',
    ...baseStyle
  };
  
  if (card.rank === 'JOKER') {
    return {
      color: card.jokerColor === 'BLACK' ? 'black' : 'red',
      bgcolor: 'white',
      border: '1px solid #ddd',
      ...baseStyle
    };
  }
  
  // Regular cards - red for hearts/diamonds, black for spades/clubs
  const isRed = card.suit === 'H' || card.suit === 'D';
  return {
    color: isRed ? 'red' : 'black',
    bgcolor: 'white',
    border: '1px solid #ddd',
    ...baseStyle
  };
};