import { EventEmitter } from 'events';

// Create an event emitter for dark mode changes
const darkModeEmitter = new EventEmitter();

// Event name constant
export const DARK_MODE_CHANGE_EVENT = 'darkModeChange';

// Function to toggle dark mode
export const toggleDarkMode = () => {
  // Emit the event to toggle dark mode
  darkModeEmitter.emit(DARK_MODE_CHANGE_EVENT);
  return true;
};

// Export the emitter for components to listen to
export const getDarkModeEmitter = () => darkModeEmitter; 