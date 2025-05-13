import { configureStore } from '@reduxjs/toolkit';
import staffReducer from './slices/staffSlice';
import projectReducer from './slices/projectSlice';
import scheduleReducer from './slices/scheduleSlice';
import settingsReducer from './slices/settingsSlice';

const store = configureStore({
  reducer: {
    staff: staffReducer,
    projects: projectReducer,
    schedule: scheduleReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store; 