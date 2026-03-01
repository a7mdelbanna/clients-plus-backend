/**
 * Main WebSocket Hook for Components
 * Provides easy access to WebSocket functionality for React components
 */

import { useWebSocketContext } from '../contexts/WebSocketContext';

// Re-export the existing hooks from the websocket service
export * from '../services/websocket/useWebSocket';

// =========================== MAIN WEBSOCKET HOOK ===========================

/**
 * Main hook for components to access WebSocket functionality
 * Provides connection state and basic controls
 */
export function useWebSocket() {
  const context = useWebSocketContext();
  return context;
}

// =========================== UTILITY HOOKS ===========================

/**
 * Hook to check WebSocket connection status
 * @returns Connection state information
 */
export function useWebSocketStatus() {
  const { isConnected, connectionState, error, isHealthy } = useWebSocketContext();
  
  return {
    isConnected,
    connectionState,
    error,
    isHealthy,
    status: isConnected ? 'connected' : 'disconnected'
  };
}

/**
 * Hook for WebSocket connection controls
 * @returns Connection control functions
 */
export function useWebSocketControls() {
  const { 
    connect, 
    disconnect, 
    reconnect, 
    enableRealTimeUpdates,
    setEnableRealTimeUpdates 
  } = useWebSocketContext();
  
  return {
    connect,
    disconnect,
    reconnect,
    enableRealTimeUpdates,
    setEnableRealTimeUpdates,
    toggle: () => setEnableRealTimeUpdates(!enableRealTimeUpdates)
  };
}

/**
 * Hook for WebSocket debugging information
 * @returns Connection statistics and debug info
 */
export function useWebSocketDebugInfo() {
  const { getConnectionStats } = useWebSocketContext();
  
  return {
    getStats: getConnectionStats,
    stats: getConnectionStats()
  };
}

/**
 * Comprehensive hook that provides all WebSocket functionality
 * @returns Complete WebSocket interface
 */
export function useWebSocketComplete() {
  const context = useWebSocketContext();
  const status = useWebSocketStatus();
  const controls = useWebSocketControls();
  const debug = useWebSocketDebugInfo();
  
  return {
    ...context,
    status,
    controls,
    debug
  };
}

// =========================== EXPORTS ===========================

// Export the main hook as default
export { useWebSocket as default };