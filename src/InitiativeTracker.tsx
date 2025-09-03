import { useEffect, useState, useRef } from "react";

import { Stack, Box } from "@mui/material";


import OBR, { isImage, Item, Player } from "@owlbear-rodeo/sdk";

import { getPluginId } from "./getPluginId";
import { HeaderBar } from "./components/HeaderBar";
import { ParticipantList } from "./components/ParticipantList";
import { isPlainObject } from "./isPlainObject";

// Redux imports
import { useAppDispatch } from "./store/hooks";
import { setEncounterState } from "./store/swadeSlice";
import { getOrInitializeState } from "./state/sceneState";

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
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  
  // Redux state management
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handlePlayerChange = (player: Player) => {
      setRole(player.role);
    };
    OBR.player.getRole().then(setRole);
    return OBR.player.onChange(handlePlayerChange);
  }, []);

  // Initialize SWADE state in Redux store
  useEffect(() => {
    let isActive = true;

    console.log('[RTK] Initializing SWADE state...');
    
    getOrInitializeState().then(state => {
      if (isActive) {
        console.log('[RTK] Initial state loaded, dispatching to store:', {
          round: state.round,
          phase: state.phase,
          participantCount: Object.keys(state.rows).length,
          deckRemaining: state.deck.remaining.length
        });
        dispatch(setEncounterState(state));
      }
    }).catch(error => {
      console.error('[RTK] Failed to initialize state:', error);
    });

    return () => {
      isActive = false;
    };
  }, [dispatch]);

  // Dynamic height management
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current && ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        if (containerRef.current) {
          // Use scrollHeight to get the total height needed by the content
          const desiredHeight = containerRef.current.scrollHeight;
          OBR.action.setHeight(desiredHeight);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => {
        resizeObserver.disconnect();
      };
    }
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



  return (
    <Stack ref={containerRef}>
      <HeaderBar role={role} />
      <ParticipantList />
    </Stack>
  );
}
