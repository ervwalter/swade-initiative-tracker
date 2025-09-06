import { useEffect } from "react";
import { Provider } from 'react-redux';
import { InitiativeTracker } from "./InitiativeTracker";
import { store, initializeStoreIfNeeded, cleanupStoreSubscriptions } from "./store/store";
import { AddParticipantModal } from "./components/AddParticipantModal";
import { CardChooserModal } from "./components/CardChooserModal";
import { PluginGate } from "./components/PluginGate";
import { UndoProvider } from "./contexts/UndoContext";
import { UndoErrorBoundary } from "./components/UndoErrorBoundary";

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
      <UndoErrorBoundary>
        <UndoProvider>
          {pathname === '/add-participant' ? (
            <AddParticipantModal />
          ) : pathname === '/card-chooser' ? (
            <CardChooserModal />
          ) : (
            <InitiativeTracker />
          )}
        </UndoProvider>
      </UndoErrorBoundary>
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
