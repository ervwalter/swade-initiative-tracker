import { useEffect, useState, useRef } from "react";

import { Stack } from "@mui/material";

import OBR, { Player } from "@owlbear-rodeo/sdk";

import { getPluginId } from "./getPluginId";
import { HeaderBar } from "./components/HeaderBar";
import { ParticipantList } from "./components/ParticipantList";
import { ControlBar } from "./components/ControlBar";

export function InitiativeTracker() {
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");

  useEffect(() => {
    const handlePlayerChange = (player: Player) => {
      setRole(player.role);
    };
    OBR.player.getRole().then(setRole);
    return OBR.player.onChange(handlePlayerChange);
  }, []);

  // State initialization is now handled by the OBR sync system automatically
  // No need for manual initialization here - the sync system will load and initialize state

  // Simple height management - set container maxHeight to viewport
  const containerRef = useRef<HTMLDivElement>(null);
  const participantRef = useRef<HTMLUListElement>(null);
  const lastRequestedHeight = useRef<number>(0);
  const lastViewportHeight = useRef<number>(0);
  useEffect(() => {
    const setContainerMaxHeight = async () => {
      if (containerRef.current) {
        // The container's scrollHeight already represents the full content height
        // even when constrained by maxHeight - no need to remove maxHeight!
        const fullContentHeight = containerRef.current.scrollHeight - (participantRef.current?.clientHeight ?? 0) + (participantRef.current?.scrollHeight || 0);

        console.log(`[Resize] Measured full content height: ${fullContentHeight}px (container scrollHeight: ${containerRef.current.scrollHeight}px, participant scrollHeight: ${participantRef.current?.scrollHeight}px)`);

        // Get current viewport height
        const viewportHeight = window.innerHeight;
        
        // Prevent infinite loops by checking if both the requested height AND viewport height are unchanged
        if (fullContentHeight === lastRequestedHeight.current && viewportHeight === lastViewportHeight.current) {
          console.log(`[Resize] Skipping request - height ${fullContentHeight}px and viewport ${viewportHeight}px already processed`);
          return;
        }
        
        // Request the full content height from OBR
        await OBR.action.setHeight(fullContentHeight);
        lastRequestedHeight.current = fullContentHeight;
        
        // Set maxHeight to whatever viewport we actually have
        containerRef.current.style.maxHeight = `${viewportHeight}px`;
        lastViewportHeight.current = viewportHeight;
        
        console.log(`[Resize] Requested full content height ${fullContentHeight}px from OBR, got ${viewportHeight}px viewport`);
      }
    };

    if (containerRef.current && ResizeObserver) {
      // Set initial maxHeight
      setContainerMaxHeight();
      
      // Listen for viewport changes
      window.addEventListener('resize', setContainerMaxHeight);
      
      // Also listen for container content changes
      const contentResizeObserver = new ResizeObserver(() => {
        console.log('[Resize] Container content changed, requesting new height');
        setContainerMaxHeight();
      });
      contentResizeObserver.observe(containerRef.current);
      
      return () => {
        window.removeEventListener('resize', setContainerMaxHeight);
        contentResizeObserver.disconnect();
      };
    }
  }, [role]);


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
    <Stack ref={containerRef} sx={{ pb: 0 }}>
      <HeaderBar role={role} />
      <ParticipantList role={role} ref={participantRef} />
      <ControlBar role={role} />
    </Stack>
  );
}
