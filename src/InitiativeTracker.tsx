import { useEffect, useState } from "react";

import { Stack, Box } from "@mui/material";

import OBR, { Player } from "@owlbear-rodeo/sdk";

import { HeaderBar } from "./components/HeaderBar";
import { ParticipantList } from "./components/ParticipantList";
import { ControlBar } from "./components/ControlBar";
import { BetweenRoundsMessage } from "./components/BetweenRoundsMessage";
import { InitiativeInactiveMessage } from "./components/InitiativeInactiveMessage";
import { useAppSelector } from "./store/hooks";
import { selectPhase } from "./store/selectors";
import { useContextMenu } from "./hooks/useContextMenu";
import { useObrPanelHeight } from "./hooks/useObrPanelHeight";

export function InitiativeTracker() {
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  const phase = useAppSelector(selectPhase);

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

  const { containerRef, participantListRef, maxHeight } = useObrPanelHeight();

  return (
    <Stack ref={containerRef} sx={{ pb: 0, maxHeight }}>
      <HeaderBar role={role} />

      {/* Show different content for players vs GMs during special phases */}
      {phase === "setup" && role === "PLAYER" ? (
        <InitiativeInactiveMessage />
      ) : phase === "between_rounds" && role === "PLAYER" ? (
        <BetweenRoundsMessage />
      ) : (
        <ParticipantList role={role} ref={participantListRef} />
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
