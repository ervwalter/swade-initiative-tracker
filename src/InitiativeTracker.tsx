import { useEffect, useRef, useState } from "react";

import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import Box from "@mui/material/Box";

import SkipNextRounded from "@mui/icons-material/SkipNextRounded";

import OBR, { isImage, Item, Player } from "@owlbear-rodeo/sdk";

import { InitiativeItem } from "./InitiativeItem";
import { InitiativeListItem } from "./InitiativeListItem";
import { getPluginId } from "./getPluginId";
import { InitiativeHeader } from "./InitiativeHeader";
import { isPlainObject } from "./isPlainObject";

// SWADE state imports
import { EncounterState } from "./state/types";
import { getOrInitializeState, subscribeToEncounterState, writeEncounterState, initializeEmptyState } from "./state/sceneState";
import { useUndoState } from "./state/localState";
import { drawCard, discardCard, reshuffleDeck, logDeckState, testDrawSequence, getDeckSummary, discardFromInPlay } from "./deck/deck";
import { getCardsInPlay, getParticipantCards, endRound, dealCardToParticipant, createTestParticipant, getGameStateSummary } from "./deck/gameState";
import { CURRENT_STATE_VERSION } from "./state/migrations";
import { deepCopyEncounterState } from "./state/stateUtils";

/** Check that the item metadata is in the correct format */
function isMetadata(
  metadata: unknown
): metadata is { count: string; active: boolean } {
  return (
    isPlainObject(metadata) &&
    typeof metadata.count === "string" &&
    typeof metadata.active === "boolean"
  );
}

export function InitiativeTracker() {
  const [initiativeItems, setInitiativeItems] = useState<InitiativeItem[]>([]);
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  
  // SWADE state management
  const [swadeState, setSwadeState] = useState<EncounterState | null>(null);
  const swadeStateRef = useRef<EncounterState | null>(null);
  const undoState = useUndoState();
  
  // Keep ref in sync with state
  useEffect(() => {
    swadeStateRef.current = swadeState;
  }, [swadeState]);

  useEffect(() => {
    const handlePlayerChange = (player: Player) => {
      setRole(player.role);
    };
    OBR.player.getRole().then(setRole);
    return OBR.player.onChange(handlePlayerChange);
  }, []);

  // Initialize and subscribe to SWADE state
  useEffect(() => {
    let isActive = true;

    console.log('[SWADE] Starting state initialization...');
    
    // Initialize state
    getOrInitializeState().then(state => {
      console.log('[SWADE] getOrInitializeState resolved with:', state);
      if (isActive) {
        setSwadeState(state);
        console.log('[SWADE] Initial state loaded and set in component');
      }
    }).catch(error => {
      console.error('[SWADE] Failed to initialize state:', error);
    });

    // Subscribe to state changes
    const unsubscribe = subscribeToEncounterState((state) => {
      if (isActive) {
        setSwadeState(state);
        if (state) {
          console.log('[SWADE] State updated:', {
            round: state.round,
            phase: state.phase,
            participantCount: Object.keys(state.rows).length,
            deckRemaining: state.deck.remaining.length,
            deckDiscard: state.deck.discard.length
          });
        }
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  // Expose deck operations to window for console testing (only run once when first available)
  useEffect(() => {
    if (swadeState && !(window as any).swade) {
      const swadeConsole = {
        // Current state (always get fresh state)
        getState: () => {
          return swadeStateRef.current;
        },
        
        // Deck operations
        drawCard: () => {
          const currentState = swadeStateRef.current;
          if (!currentState) return null;
          
          const newState = { 
            ...currentState, 
            deck: { 
              ...currentState.deck, 
              remaining: [...currentState.deck.remaining],
              inPlay: [...currentState.deck.inPlay],
              discard: [...currentState.deck.discard]
            } 
          };
          const result = drawCard(newState.deck);
          if (result.needsStateUpdate) {
            console.log('[SWADE] Drew:', result.cardId, 'from deck');
            writeEncounterState(newState);
          }
          return result.cardId;
        },
        
        discardCard: (cardId: string) => {
          const currentState = swadeStateRef.current;
          if (!currentState) return;
          
          const newState = { 
            ...currentState, 
            deck: { 
              ...currentState.deck, 
              remaining: [...currentState.deck.remaining],
              inPlay: [...currentState.deck.inPlay],
              discard: [...currentState.deck.discard]
            } 
          };
          discardCard(newState.deck, cardId);
          console.log('[SWADE] Discarded:', cardId);
          writeEncounterState(newState);
        },
        
        shuffleDeck: () => {
          const currentState = swadeStateRef.current;
          if (!currentState) return;
          
          const newState = { 
            ...currentState, 
            deck: { 
              ...currentState.deck, 
              remaining: [...currentState.deck.remaining],
              inPlay: [...currentState.deck.inPlay],
              discard: [...currentState.deck.discard]
            } 
          };
          reshuffleDeck(newState.deck);
          console.log('[SWADE] Reshuffled deck');
          writeEncounterState(newState);
        },
        
        showDeck: () => {
          const currentState = swadeStateRef.current;
          if (!currentState) return null;
          logDeckState(currentState.deck);
          return getDeckSummary(currentState.deck, currentState.cards);
        },
        
        testDraw: (count: number = 5) => {
          const currentState = swadeStateRef.current;
          if (!currentState) return [];
          
          // Input validation
          if (typeof count !== 'number' || count < 0 || count > 54) {
            console.error('[SWADE] Invalid count for testDraw (must be 0-54)');
            return [];
          }
          
          const newState = { 
            ...currentState, 
            deck: { 
              ...currentState.deck, 
              remaining: [...currentState.deck.remaining],
              inPlay: [...currentState.deck.inPlay],
              discard: [...currentState.deck.discard]
            } 
          };
          const drawn = testDrawSequence(newState.deck, Math.floor(count), newState.cards);
          writeEncounterState(newState);
          return drawn;
        },
        
        // Game state utilities
        createTestParticipant: (name: string = 'Test Player') => {
          const currentState = swadeStateRef.current;
          if (!currentState) return null;
          
          // Basic input validation
          if (!name || typeof name !== 'string') {
            console.error('[SWADE] Invalid participant name');
            return null;
          }
          
          const newState = deepCopyEncounterState(currentState);
          const participantId = createTestParticipant(newState, name);
          writeEncounterState(newState);
          return participantId;
        },
        
        dealTo: (participantId: string) => {
          const currentState = swadeStateRef.current;
          if (!currentState) return null;
          
          const newState = deepCopyEncounterState(currentState);
          const cardId = dealCardToParticipant(newState, participantId);
          if (cardId) {
            writeEncounterState(newState);
          }
          return cardId;
        },
        
        endRound: () => {
          const currentState = swadeStateRef.current;
          if (!currentState) return;
          
          const newState = deepCopyEncounterState(currentState);
          endRound(newState);
          writeEncounterState(newState);
        },
        
        getCardsInPlay: () => {
          const currentState = swadeStateRef.current;
          if (!currentState) return [];
          return getCardsInPlay(currentState);
        },
        
        getParticipantCards: () => {
          const currentState = swadeStateRef.current;
          if (!currentState) return [];
          return getParticipantCards(currentState);
        },
        
        gameStatus: () => {
          const currentState = swadeStateRef.current;
          if (!currentState) return null;
          const summary = getGameStateSummary(currentState);
          console.log('[GAME STATUS]', {
            ...summary,
            stateVersion: currentState.version,
            expectedVersion: CURRENT_STATE_VERSION
          });
          return summary;
        },

        // Helper functions
        reset: () => {
          console.log('[SWADE] Resetting to initial state...');
          const freshState = initializeEmptyState();
          writeEncounterState(freshState);
          console.log('[SWADE] Reset complete - fresh shuffled deck created');
        }
      };

      // Expose to iframe window for console access
      (window as any).swade = swadeConsole;
      console.log('[SWADE] Assigned to iframe window.swade:', swadeConsole);
      console.log('[SWADE] Verification - window.swade exists:', !!(window as any).swade);
      
      console.log('[SWADE] Console utilities available:');
      console.log('  Basic deck operations:');
      console.log('    window.swade.drawCard() - Draw a single card (not assigned)');
      console.log('    window.swade.discardCard(cardId) - Discard a specific card');  
      console.log('    window.swade.shuffleDeck() - Reshuffle the deck');
      console.log('    window.swade.showDeck() - Display deck state');
      console.log('    window.swade.testDraw(n) - Draw n cards for testing');
      console.log('  Game simulation:');
      console.log('    window.swade.createTestParticipant(name) - Add test participant');
      console.log('    window.swade.dealTo(participantId) - Deal card to participant');
      console.log('    window.swade.endRound() - End round (discard all participant cards)');
      console.log('    window.swade.getCardsInPlay() - Show all cards drawn from deck (in play)');
      console.log('    window.swade.getParticipantCards() - Show cards assigned to participants');
      console.log('    window.swade.gameStatus() - Show round/phase/participant summary');
      console.log('  Utilities:');
      console.log('    window.swade.getState() - Get current SWADE state');
      console.log('    window.swade.reset() - Reset to initial state');
      console.log('[SWADE] Note: Make sure to select this iframe context in dev tools console dropdown');
    }

    return () => {
      // Cleanup console utilities
      if ((window as any).swade) {
        delete (window as any).swade;
      }
    };
  }, [!!swadeState]); // Only re-run when swadeState changes from null to non-null

  useEffect(() => {
    const handleItemsChange = async (items: Item[]) => {
      const initiativeItems: InitiativeItem[] = [];
      for (const item of items) {
        if (isImage(item)) {
          const metadata = item.metadata[getPluginId("metadata")];
          if (isMetadata(metadata)) {
            initiativeItems.push({
              id: item.id,
              count: metadata.count,
              name: item.text.plainText || item.name,
              active: metadata.active,
              visible: item.visible,
            });
          }
        }
      }
      setInitiativeItems(initiativeItems);
    };

    OBR.scene.items.getItems().then(handleItemsChange);
    return OBR.scene.items.onChange(handleItemsChange);
  }, []);

  useEffect(() => {
    OBR.contextMenu.create({
      icons: [
        {
          icon: "/icon.svg",
          label: "Add to Initiative",
          filter: {
            every: [
              { key: "layer", value: "CHARACTER", coordinator: "||" },
              { key: "layer", value: "MOUNT" },
              { key: "type", value: "IMAGE" },
              { key: ["metadata", getPluginId("metadata")], value: undefined },
            ],
            permissions: ["UPDATE"],
          },
        },
        {
          icon: "/icon.svg",
          label: "Remove from Initiative",
          filter: {
            every: [
              { key: "layer", value: "CHARACTER", coordinator: "||" },
              { key: "layer", value: "MOUNT" },
              { key: "type", value: "IMAGE" },
            ],
            permissions: ["UPDATE"],
          },
        },
      ],
      id: getPluginId("menu/toggle"),
      onClick(context) {
        OBR.scene.items.updateItems(context.items, (items) => {
          // Check whether to add the items to initiative or remove them
          const addToInitiative = items.every(
            (item) => item.metadata[getPluginId("metadata")] === undefined
          );
          let count = 0;
          for (let item of items) {
            if (addToInitiative) {
              item.metadata[getPluginId("metadata")] = {
                count: `${count}`,
                active: false,
              };
              count += 1;
            } else {
              delete item.metadata[getPluginId("metadata")];
            }
          }
        });
      },
    });
  }, []);

  function handleNextClick() {
    // Get the next index to activate
    const sorted = initiativeItems.sort(
      (a, b) => parseFloat(b.count) - parseFloat(a.count)
    );
    const nextIndex =
      (sorted.findIndex((initiative) => initiative.active) + 1) % sorted.length;

    // Set local items immediately
    setInitiativeItems((prev) => {
      return prev.map((init, index) => ({
        ...init,
        active: index === nextIndex,
      }));
    });
    // Update the scene items with the new active status
    OBR.scene.items.updateItems(
      initiativeItems.map((init) => init.id),
      (items) => {
        for (let i = 0; i < items.length; i++) {
          let item = items[i];
          const metadata = item.metadata[getPluginId("metadata")];
          if (isMetadata(metadata)) {
            metadata.active = i === nextIndex;
          }
        }
      }
    );
  }

  function handleInitiativeCountChange(id: string, newCount: string) {
    // Set local items immediately
    setInitiativeItems((prev) =>
      prev.map((initiative) => {
        if (initiative.id === id) {
          return {
            ...initiative,
            count: newCount,
          };
        } else {
          return initiative;
        }
      })
    );
    // Sync changes over the network
    OBR.scene.items.updateItems([id], (items) => {
      for (let item of items) {
        const metadata = item.metadata[getPluginId("metadata")];
        if (isMetadata(metadata)) {
          metadata.count = newCount;
        }
      }
    });
  }

  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (listRef.current && ResizeObserver) {
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries.length > 0) {
          const entry = entries[0];
          // Get the height of the border box
          // In the future you can use `entry.borderBoxSize`
          // however as of this time the property isn't widely supported (iOS)
          const borderHeight = entry.contentRect.bottom + entry.contentRect.top;
          // Set a minimum height of 64px
          const listHeight = Math.max(borderHeight, 64);
          // Set the action height to the list height + the card header height + the divider
          OBR.action.setHeight(listHeight + 64 + 1);
        }
      });
      resizeObserver.observe(listRef.current);
      return () => {
        resizeObserver.disconnect();
        // Reset height when unmounted
        OBR.action.setHeight(129);
      };
    }
  }, []);

  return (
    <Stack height="100vh">
      <InitiativeHeader
        subtitle={
          swadeState ? (
            `Round ${swadeState.round} | Phase: ${swadeState.phase} | Cards: ${swadeState.deck.remaining.length} remaining, ${swadeState.deck.discard.length} discarded`
          ) : initiativeItems.length === 0 ? (
            "SWADE Initiative - Select a character to start initiative"
          ) : undefined
        }
        action={
          <IconButton
            aria-label="next"
            onClick={handleNextClick}
            disabled={initiativeItems.length === 0}
          >
            <SkipNextRounded />
          </IconButton>
        }
      />
      <Box sx={{ overflowY: "auto" }}>
        <List ref={listRef}>
          {initiativeItems
            .sort((a, b) => parseFloat(b.count) - parseFloat(a.count))
            .map((initiative) => (
              <InitiativeListItem
                key={initiative.id}
                initiative={initiative}
                onCountChange={(newCount) => {
                  handleInitiativeCountChange(initiative.id, newCount);
                }}
                showHidden={role === "GM"}
              />
            ))}
        </List>
      </Box>
    </Stack>
  );
}
