/**
 * Централизованное хранилище состояния (observable, events).
 */
export const store = {
  // Global state object
  state: {},
  // Subscribers (listeners)
  listeners: [],
  // Get current state
  getState() {
    return this.state;
  },
  // Update state and notify listeners
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((listener) => listener(this.state));
  },
  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
};
