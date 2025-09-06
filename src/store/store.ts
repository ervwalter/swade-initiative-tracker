// RTK Store Configuration
import { configureStore } from '@reduxjs/toolkit';
import { swadeSlice } from './swadeSlice';
import { setupOBRSync } from './obrSync';
import { subscribeToOBRChanges } from './obrSync';

// Configure store (revision increments handled within each reducer)
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
    })
});

// Set up OBR sync using state subscription (cleanup handled in App.tsx)
export const cleanupOBRSync = setupOBRSync(store);

// Lazy initialization - call this after OBR is ready
let storeInitialized = false;
let cleanupSubscription: (() => void) | null = null;

export function initializeStoreIfNeeded() {
  if (storeInitialized) {
    return;
  }
  
  console.log('[Store] Initializing with OBR state...');
  cleanupSubscription = subscribeToOBRChanges(store);
  storeInitialized = true;
}

export function cleanupStoreSubscriptions() {
  if (cleanupSubscription) {
    cleanupSubscription();
    cleanupSubscription = null;
    storeInitialized = false;
  }
}

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// For debugging in development
if (import.meta.env.DEV) {
  (window as typeof window & { __REDUX_STORE__: typeof store }).__REDUX_STORE__ = store;
  console.log('[RTK] Store configured with middleware');
}