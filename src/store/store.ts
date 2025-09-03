// RTK Store Configuration
import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { swadeSlice } from './swadeSlice';
import { setupOBRSync } from './obrSync';

// Create listener middleware instance
const listenerMiddleware = createListenerMiddleware();

// Set up OBR sync listeners
setupOBRSync(listenerMiddleware);

// Configure store
export const store = configureStore({
  reducer: {
    swade: swadeSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializability checks
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      }
    }).prepend(listenerMiddleware.middleware)
});

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// For debugging in development
if (import.meta.env.DEV) {
  (window as any).__REDUX_STORE__ = store;
  console.log('[RTK] Store configured with middleware');
}