import { useEffect, useState, useRef } from "react";

import { Stack, Box } from "@mui/material";

import OBR, { Player } from "@owlbear-rodeo/sdk";

import { HeaderBar } from "./components/HeaderBar";
import { ParticipantList } from "./components/ParticipantList";
import { ControlBar } from "./components/ControlBar";
import { BetweenRoundsMessage } from "./components/BetweenRoundsMessage";
import { InitiativeInactiveMessage } from "./components/InitiativeInactiveMessage";
import { store } from "./store/store";
import { useAppSelector } from "./store/hooks";
import { selectPhase } from "./store/selectors";
import { useContextMenu } from "./hooks/useContextMenu";
import { useUndo } from "./hooks/useUndo";
import throttle  from "lodash/throttle";

export function InitiativeTracker() {
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  const phase = useAppSelector(selectPhase);
  const { performUndo, canUndo } = useUndo();

  // Setup context menus with undo integration
  useContextMenu();

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
    const setContainerMaxHeight = throttle(async () => {
      if (containerRef.current) {
        // The container's scrollHeight already represents the full content height
        // even when constrained by maxHeight - no need to remove maxHeight!
        const fullContentHeight =
          containerRef.current.scrollHeight -
          (participantRef.current?.clientHeight ?? 0) +
          (participantRef.current?.scrollHeight ?? 0);

        console.log(
          `[Resize] Measured full content height: ${fullContentHeight}px (container scrollHeight: ${containerRef.current.scrollHeight}px, participant scrollHeight: ${participantRef.current?.scrollHeight}px)`
        );

        // Get current viewport height
        const viewportHeight = window.innerHeight;

        // Prevent infinite loops by checking if both the requested height AND viewport height are unchanged
        if (
          fullContentHeight === lastRequestedHeight.current &&
          viewportHeight === lastViewportHeight.current
        ) {
          console.log(
            `[Resize] Skipping request - height ${fullContentHeight}px and viewport ${viewportHeight}px already processed`
          );
          return;
        }

        // Request the full content height from OBR
        await OBR.action.setHeight(fullContentHeight);
        lastRequestedHeight.current = fullContentHeight;

        // Set maxHeight to whatever viewport we actually have
        containerRef.current.style.maxHeight = `${viewportHeight}px`;
        lastViewportHeight.current = viewportHeight;

        console.log(
          `[Resize] Requested full content height ${fullContentHeight}px from OBR, got ${viewportHeight}px viewport`
        );
      }
    }, 100); // Throttle to once every 100ms max

    if (containerRef.current && ResizeObserver) {
      // Set initial maxHeight
      setContainerMaxHeight();

      // Listen for viewport changes
      window.addEventListener("resize", setContainerMaxHeight);

      // Also listen for container content changes
      const contentResizeObserver = new ResizeObserver(() => {
        console.log(
          "[Resize] Container content changed, requesting new height"
        );
        setContainerMaxHeight();
      });
      contentResizeObserver.observe(containerRef.current);

      // Listen for Redux state changes that might affect UI height
      const unsubscribeStore = store.subscribe(() => {
        console.log("[Resize] Redux state changed, triggering resize check");
        setContainerMaxHeight();
      });

      return () => {
        window.removeEventListener("resize", setContainerMaxHeight);
        contentResizeObserver.disconnect();
        unsubscribeStore();
      };
    }
  }, []);

  // Add keyboard shortcut for undo (Ctrl+Z or Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle undo for GMs
      if (role !== "GM") return;

      // Check for Ctrl+Z or Cmd+Z (without Shift for undo, not redo)
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        if (canUndo) {
          performUndo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [role, canUndo, performUndo]);

  return (
    <Stack ref={containerRef} sx={{ pb: 0 }}>
      <HeaderBar role={role} />

      {/* Show different content for players vs GMs during special phases */}
      {phase === "setup" && role === "PLAYER" ? (
        <InitiativeInactiveMessage />
      ) : phase === "between_rounds" && role === "PLAYER" ? (
        <BetweenRoundsMessage />
      ) : (
        <ParticipantList role={role} ref={participantRef} />
      )}

      {/* GM reminder during between_rounds - compact panel above ControlBar */}
      {phase === "between_rounds" && role === "GM" && (
        <Box
          sx={{
            bgcolor: "action.hover",
            color: "text.primary",
            fontSize: "0.75rem",
            px: 2,
            py: 1,
            textAlign: "left",
          }}
        >
          <strong>End of Round:</strong> Resolve effects, upkeep, bleeding out,
          and environmental damage.
        </Box>
      )}

      <ControlBar role={role} />
    </Stack>
  );
}
