import { useEffect, useState } from "react";

import { Stack } from "@mui/material";

import OBR, { Player } from "@owlbear-rodeo/sdk";

import { HeaderBar } from "./components/HeaderBar";
import { ParticipantList } from "./components/ParticipantList";
import { ControlBar } from "./components/ControlBar";
import { BetweenRoundsMessage } from "./components/BetweenRoundsMessage";
import { InitiativeInactiveMessage } from "./components/InitiativeInactiveMessage";
import { PhaseReminder } from "./components/PhaseReminder";
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

      {/* Phase-specific reminders - compact panels above ControlBar */}
      {phase === "between_rounds" && role === "GM" && (
        <PhaseReminder 
          title="End of Round"
          description="Resolve effects, upkeep, bleeding out, and environmental damage."
        />
      )}
      
      {phase === "cards_dealt" && (
        <PhaseReminder
          title="Cards Dealt"
          description={role === "GM" 
            ? "Make card adjustments now (Bennies, Edges, Hindrances, etc.)"
            : "Request card adjustments now (Bennies, Edges, Hindrances, etc.)"
          }
        />
      )}

      <ControlBar role={role} />
    </Stack>
  );
}
