import { configureStore, combineReducers } from '@reduxjs/toolkit';
import staffReducer from './slices/staffSlice';
import projectReducer from './slices/projectSlice';
import scheduleReducer from './slices/scheduleSlice';
import settingsReducer from './slices/settingsSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Combine reducers
const rootReducer = combineReducers({
  staff: staffReducer,
  projects: projectReducer,
  schedule: scheduleReducer,
  settings: settingsReducer,
});

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
};
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create store with persisted reducer
const store = configureStore({
  reducer: persistedReducer,
});

// Create persistor
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store; 