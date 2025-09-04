import { useEffect, useState, useRef } from "react";

import { Stack, Box } from "@mui/material";


import OBR, { isImage, Item, Player } from "@owlbear-rodeo/sdk";

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
    <Stack ref={containerRef} sx={{ pb: 8 }}>
      <HeaderBar role={role} />
      <ParticipantList role={role} />
      <ControlBar role={role} />
    </Stack>
  );
}
