import OBR, { Item } from "@owlbear-rodeo/sdk";
import { createParticipant } from "./store/swadeSlice";
import { getPluginId } from "./getPluginId";
import { store } from "./store/store";
import type { ParticipantType } from "./store/types";

/**
 * Infer a name for the token from its properties
 */
function inferTokenName(item: Item): string {
  // First priority: manually entered text content (user-added labels)
  if (item.type === "IMAGE" && "text" in item && item.text && 
      typeof item.text === 'object' && item.text !== null && "plainText" in item.text &&
      typeof item.text.plainText === 'string' && item.text.plainText.trim()) {
    return item.text.plainText.trim();
  }
  
  // Second priority: token name property
  if (item.name && item.name.trim()) {
    return item.name.trim();
  }
  
  // Third priority: extract from URL if it's an image
  if (item.type === "IMAGE" && "image" in item && item.image && 
      typeof item.image === 'object' && item.image !== null && "url" in item.image &&
      typeof item.image.url === 'string') {
    const url = item.image.url;
    const filename = url.split('/').pop()?.split('?')[0] || '';
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    if (nameWithoutExt) {
      return nameWithoutExt;
    }
  }
  
  // Fallback to generic name
  return "Token";
}

/**
 * Add items to initiative with specified type
 */
function addToInitiativeAsType(items: Item[], participantType: ParticipantType): void {
  console.log(`[SWADE] Adding ${items.length} token(s) to initiative as ${participantType}`);
  
  for (const item of items) {
    // Log full item data for metadata inspection
    console.log('[SWADE] Full item data:', item);
    console.log('[SWADE] Item metadata:', item.metadata);
    
    // Infer name from token
    const name = inferTokenName(item);
    
    console.log(`[SWADE] Adding "${name}" as ${participantType} (token: ${item.id})`);
    
    store.dispatch(createParticipant({
      name,
      type: participantType,
      tokenIds: [item.id],
      dealNow: false
    }));
    
    console.log(`[SWADE] Created ${participantType} participant: "${name}"`);
  }
}

/**
 * Setup the context menu for tokens
 */
export function setupContextMenu(): void {
  // PC menu items
  OBR.contextMenu.create({
    icons: [
      {
        icon: "/icon.svg",
        label: "Add as PC",
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
            { key: "type", value: "IMAGE" },
          ],
          permissions: ["UPDATE"],
          roles: ["GM"],
          min: 1,
          max: 1,
        },
      },
      {
        icon: "/icon.svg",
        label: "Add as PCs",
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
            { key: "type", value: "IMAGE" },
          ],
          permissions: ["UPDATE"],
          roles: ["GM"],
          min: 2,
        },
      },
    ],
    id: getPluginId("context-menu-pc"),
    onClick(context) {
      addToInitiativeAsType(context.items, "PC");
    },
  });

  // NPC menu items
  OBR.contextMenu.create({
    icons: [
      {
        icon: "/icon.svg", 
        label: "Add as NPC",
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
            { key: "type", value: "IMAGE" },
          ],
          permissions: ["UPDATE"],
          roles: ["GM"],
          min: 1,
          max: 1,
        },
      },
      {
        icon: "/icon.svg", 
        label: "Add as NPCs",
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
            { key: "type", value: "IMAGE" },
          ],
          permissions: ["UPDATE"],
          roles: ["GM"],
          min: 2,
        },
      },
    ],
    id: getPluginId("context-menu-npc"),
    onClick(context) {
      addToInitiativeAsType(context.items, "NPC");
    },
  });

  // Extra menu items  
  OBR.contextMenu.create({
    icons: [
      {
        icon: "/icon.svg", 
        label: "Add as Extra",
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
            { key: "type", value: "IMAGE" },
          ],
          permissions: ["UPDATE"],
          roles: ["GM"],
          min: 1,
          max: 1,
        },
      },
      {
        icon: "/icon.svg", 
        label: "Add as Extras",
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
            { key: "type", value: "IMAGE" },
          ],
          permissions: ["UPDATE"],
          roles: ["GM"],
          min: 2,
        },
      },
    ],
    id: getPluginId("context-menu-extra"),
    onClick(context) {
      addToInitiativeAsType(context.items, "GROUP");
    },
  });
  
  console.log('[SWADE] Context menu setup complete');
}