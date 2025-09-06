// Context Menu Hook
// Sets up OBR token context menus with undo integration

import { useEffect } from 'react';
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { createParticipant } from "../store/swadeSlice";
import { getPluginId } from "../getPluginId";
import { store } from "../store/store";
import type { ParticipantType } from "../store/types";
import { useUndo } from './useUndo';

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
 * Extract the image URL from a token for avatar display
 */
function extractTokenImageUrl(item: Item): string | undefined {
  if (item.type === "IMAGE" && "image" in item && item.image && 
      typeof item.image === 'object' && item.image !== null && "url" in item.image &&
      typeof item.image.url === 'string') {
    return item.image.url;
  }
  return undefined;
}

/**
 * Hook that sets up OBR context menus for tokens
 * Uses undo context for checkpoint capture
 */
export function useContextMenu() {
  const { captureCheckpoint } = useUndo();

  useEffect(() => {
    /**
     * Add items to initiative with specified type
     */
    function addToInitiativeAsType(items: Item[], participantType: ParticipantType): void {
      console.log(`[SWADE] Adding ${items.length} token(s) to initiative as ${participantType}`);
      
      // Capture checkpoint before adding any tokens
      const description = items.length === 1 
        ? `Add ${participantType} from token`
        : `Add ${items.length} ${participantType}s from tokens`;
      captureCheckpoint(description);
      
      for (const item of items) {
        // Log full item data for metadata inspection
        console.log('[SWADE] Full item data:', item);
        console.log('[SWADE] Item metadata:', item.metadata);
        
        // Infer name from token
        const name = inferTokenName(item);
        
        // Extract image URL for avatar
        const imageUrl = extractTokenImageUrl(item);
        
        console.log(`[SWADE] Adding "${name}" as ${participantType} (token: ${item.id}, imageUrl: ${imageUrl})`);
        
        store.dispatch(createParticipant({
          name,
          type: participantType,
          tokenIds: [item.id],
          imageUrl
        }));
        
        console.log(`[SWADE] Created ${participantType} participant: "${name}"`);
      }
    }

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

    // Cleanup function - if OBR supports removing context menus
    return () => {
      // Currently, OBR doesn't provide a way to remove individual context menus
      // They're automatically cleaned up when the plugin unloads
    };
  }, [captureCheckpoint]); // Re-run if captureCheckpoint changes
}