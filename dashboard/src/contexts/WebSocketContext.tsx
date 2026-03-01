import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { socketService, useWebSocket, type WebSocketState } from '../services/websocket';
import { serviceAdapterFactory } from '../services/api/service-adapter';
import { tokenUtils } from '../config/api';

// =========================== WEBSOCKET CONTEXT INTERFACE ===========================

interface WebSocketContextType {
  // Connection state
  isConnected: boolean;
  connectionState: string;
  error: string | null;
  
  // Connection management
  connect: (branchId?: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  
  // Real-time data management
  enableRealTimeUpdates: boolean;
  setEnableRealTimeUpdates: (enabled: boolean) => void;
  
  // Branch context management
  updateBranch: (branchId?: string) => void;
  
  // Statistics and health
  getConnectionStats: () => any;
  isHealthy: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// =========================== WEBSOCKET HOOK ===========================

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

// =========================== WEBSOCKET PROVIDER ===========================

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  autoConnect = true 
}) => {
  const { currentUser } = useAuth();
  const [currentBranchId, setCurrentBranchId] = useState<string | undefined>(undefined);
  
  // WebSocket configuration
  const [enableRealTimeUpdates, setEnableRealTimeUpdates] = useState(() => {
    // Check if WebSocket is enabled via feature flags
    const isEnabled = serviceAdapterFactory.isWebSocketEnabled();
    const userPreference = localStorage.getItem('websocket-enabled');
    
    return isEnabled && (userPreference === null ? true : userPreference === 'true');
  });
  
  const [isHealthy, setIsHealthy] = useState(false);

  // Use the WebSocket hook for connection management
  const {
    state,
    connect: connectSocket,
    disconnect: disconnectSocket,
    reconnect: reconnectSocket,
    updateContext,
  } = useWebSocket({
    autoConnect: false, // We'll handle connection manually
    onConnect: () => {
      console.log('WebSocket connected successfully');
      setIsHealthy(true);
    },
    onDisconnect: (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      setIsHealthy(false);
    },
    onError: (error: string) => {
      console.error('WebSocket error:', error);
      setIsHealthy(false);
    },
    onReconnect: () => {
      console.log('WebSocket reconnected');
      setIsHealthy(true);
    },
  });

  // Connect function that uses current user data
  const connect = async (branchId?: string) => {
    if (!currentUser || !enableRealTimeUpdates) {
      console.log('WebSocket connection skipped - no user or disabled');
      return;
    }

    const token = tokenUtils.getAccessToken();
    if (!token) {
      console.log('WebSocket connection skipped - no access token');
      return;
    }

    try {
      // Update branch ID if provided
      if (branchId !== undefined) {
        setCurrentBranchId(branchId);
      }

      await connectSocket(
        token,
        currentUser.companyId || '',
        currentUser.id,
        branchId || currentBranchId
      );
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  };

  // Disconnect wrapper
  const disconnect = () => {
    disconnectSocket();
    setIsHealthy(false);
  };

  // Reconnect wrapper  
  const reconnect = () => {
    if (!enableRealTimeUpdates) return;
    reconnectSocket();
  };

  // Update branch context
  const updateBranch = (branchId?: string) => {
    setCurrentBranchId(branchId);
    if (currentUser && state.isConnected) {
      updateContext(
        currentUser.companyId,
        currentUser.id,
        branchId
      );
    }
  };

  // Get connection statistics
  const getConnectionStats = () => {
    return socketService.getStats();
  };

  // =========================== EFFECTS ===========================

  // Handle user authentication changes
  useEffect(() => {
    if (currentUser && enableRealTimeUpdates && autoConnect) {
      // Auto-connect when user logs in
      connect(currentBranchId).catch(error => {
        console.error('Auto-connect failed:', error);
      });
    } else if (!currentUser) {
      // Disconnect when user logs out
      disconnect();
    }

    return () => {
      // Cleanup on unmount or user change
      if (!currentUser) {
        disconnect();
      }
    };
  }, [currentUser, enableRealTimeUpdates, autoConnect]);

  // Handle real-time updates preference changes
  useEffect(() => {
    localStorage.setItem('websocket-enabled', enableRealTimeUpdates.toString());
    
    if (enableRealTimeUpdates && currentUser && !state.isConnected) {
      // Connect if enabled and user is authenticated
      connect(currentBranchId).catch(error => {
        console.error('Failed to enable WebSocket:', error);
      });
    } else if (!enableRealTimeUpdates && state.isConnected) {
      // Disconnect if disabled
      disconnect();
    }
  }, [enableRealTimeUpdates, currentUser, state.isConnected]);

  // Health monitoring
  useEffect(() => {
    if (!state.isConnected) {
      setIsHealthy(false);
      return;
    }

    // Check health periodically
    const healthCheck = setInterval(() => {
      const stats = getConnectionStats();
      setIsHealthy(stats.connected && stats.connectionState === 'authenticated');
    }, 10000); // Check every 10 seconds

    return () => clearInterval(healthCheck);
  }, [state.isConnected]);

  // Handle window focus/blur for connection management
  useEffect(() => {
    const handleFocus = () => {
      if (enableRealTimeUpdates && currentUser && !state.isConnected) {
        console.log('Window focused - reconnecting WebSocket');
        connect(currentBranchId).catch(error => {
          console.error('Reconnection on focus failed:', error);
        });
      }
    };

    const handleBlur = () => {
      // Optionally disconnect on blur to save resources
      // disconnect();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enableRealTimeUpdates, currentUser, state.isConnected, currentBranchId]);

  // =========================== CONTEXT VALUE ===========================

  const contextValue: WebSocketContextType = {
    // Connection state
    isConnected: state.isConnected,
    connectionState: state.connectionState,
    error: state.error,
    
    // Connection management
    connect,
    disconnect,
    reconnect,
    
    // Real-time data management
    enableRealTimeUpdates,
    setEnableRealTimeUpdates,
    
    // Branch context management
    updateBranch,
    
    // Statistics and health
    getConnectionStats,
    isHealthy,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// =========================== UTILITY COMPONENTS ===========================

/**
 * WebSocket Status Indicator Component
 */
export interface WebSocketStatusProps {
  showDetails?: boolean;
  className?: string;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { isConnected, connectionState, error, getConnectionStats } = useWebSocketContext();

  if (!showDetails) {
    return (
      <div className={`websocket-status ${className}`}>
        <div 
          className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}
          title={`WebSocket ${isConnected ? 'Connected' : 'Disconnected'}`}
        >
          {isConnected ? '🟢' : '🔴'}
        </div>
      </div>
    );
  }

  const stats = getConnectionStats();

  return (
    <div className={`websocket-status-detailed ${className}`}>
      <div className="status-header">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢' : '🔴'}
        </span>
        <span>WebSocket {connectionState}</span>
      </div>
      
      {error && (
        <div className="status-error">Error: {error}</div>
      )}
      
      {showDetails && (
        <div className="status-details">
          <div>Reconnect attempts: {stats.reconnectAttempts}</div>
          <div>Active listeners: {Object.keys(stats.activeListeners).length}</div>
          <div>Company: {stats.companyId}</div>
          <div>Branch: {stats.branchId || 'All'}</div>
        </div>
      )}
    </div>
  );
};

/**
 * WebSocket Controls Component
 */
export interface WebSocketControlsProps {
  className?: string;
}

export const WebSocketControls: React.FC<WebSocketControlsProps> = ({ className = '' }) => {
  const { 
    isConnected, 
    connect, 
    disconnect, 
    reconnect,
    enableRealTimeUpdates,
    setEnableRealTimeUpdates 
  } = useWebSocketContext();

  return (
    <div className={`websocket-controls ${className}`}>
      <label className="control-group">
        <input
          type="checkbox"
          checked={enableRealTimeUpdates}
          onChange={(e) => setEnableRealTimeUpdates(e.target.checked)}
        />
        Enable Real-time Updates
      </label>

      <div className="button-group">
        {!isConnected ? (
          <button 
            onClick={() => connect()} 
            disabled={!enableRealTimeUpdates}
            className="connect-button"
          >
            Connect
          </button>
        ) : (
          <>
            <button onClick={disconnect} className="disconnect-button">
              Disconnect
            </button>
            <button onClick={reconnect} className="reconnect-button">
              Reconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// =========================== HIGHER ORDER COMPONENT ===========================

/**
 * HOC to provide WebSocket functionality to any component
 */
export function withWebSocket<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const webSocketContext = useWebSocketContext();
    
    return (
      <Component 
        {...props} 
        webSocket={webSocketContext}
      />
    );
  };

  WrappedComponent.displayName = `withWebSocket(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// =========================== EXPORTS ===========================

export default WebSocketProvider;