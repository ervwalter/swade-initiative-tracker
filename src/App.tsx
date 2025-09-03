import { useEffect, useState } from "react";
import { Provider } from 'react-redux';

import OBR from "@owlbear-rodeo/sdk";
import { CardHeader, Divider } from "@mui/material";
import { InitiativeTracker } from "./InitiativeTracker";
import { store } from "./store/store";
import { subscribeToOBRChanges } from "./store/obrSync";
import { AddParticipantModal } from "./components/AddParticipantModal";

export function App() {
  const [sceneReady, setSceneReady] = useState(false);
  const pathname = window.location.pathname;
  
  useEffect(() => {
    OBR.scene.isReady().then(setSceneReady);
    return OBR.scene.onReadyChange(setSceneReady);
  }, []);

  // Set up OBR sync when app mounts (for main UI only, modals handle their own state)
  useEffect(() => {
    if (sceneReady && pathname === '/') {
      console.log('[RTK] Setting up OBR sync subscription...');
      const unsubscribe = subscribeToOBRChanges(store);
      return unsubscribe;
    }
  }, [sceneReady, pathname]);

  // Route: Add Participant Modal
  if (pathname === '/add-participant') {
    return (
      <Provider store={store}>
        <AddParticipantModal />
      </Provider>
    );
  }

  // Route: Main Initiative Tracker
  if (sceneReady) {
    return (
      <Provider store={store}>
        <InitiativeTracker />
      </Provider>
    );
  } else {
    // Show a basic header when the scene isn't ready
    return (
      <>
        <CardHeader 
          title="SWADE Initiative" 
          subheader="Open a scene to use the initiative tracker"
          titleTypographyProps={{
            sx: {
              fontSize: "1.125rem",
              fontWeight: "bold",
              lineHeight: "32px",
              color: "text.primary",
            },
          }}
        />
        <Divider variant="middle" />
      </>
    );
  }
}
