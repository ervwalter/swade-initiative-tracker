import { useEffect, useState } from "react";
import { Provider } from 'react-redux';

import OBR from "@owlbear-rodeo/sdk";
import { CardHeader, Divider } from "@mui/material";
import { InitiativeTracker } from "./InitiativeTracker";
import { store, initializeStoreIfNeeded, cleanupStoreSubscriptions } from "./store/store";
import { AddParticipantModal } from "./components/AddParticipantModal";
import { CardChooserModal } from "./components/CardChooserModal";
import { PluginGate } from "./components/PluginGate";

function AppContent() {
  const pathname = window.location.pathname;

  // Initialize store with OBR room state (no scene required)
  useEffect(() => {
    initializeStoreIfNeeded();
    
    // Cleanup subscriptions on unmount
    return () => {
      cleanupStoreSubscriptions();
    };
  }, []);

  return (
    <Provider store={store}>
      {pathname === '/add-participant' ? (
        <AddParticipantModal />
      ) : pathname === '/card-chooser' ? (
        <CardChooserModal />
      ) : (
        <InitiativeTracker />
      )}
    </Provider>
  );
}

export function App() {
  return (
    <PluginGate>
      <AppContent />
    </PluginGate>
  );
}
