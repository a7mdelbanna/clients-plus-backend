/**
 * Feature Flags Configuration
 * Centralized feature flag management for gradual API migration
 */

import React from 'react';

// =========================== FEATURE FLAG DEFINITIONS ===========================

export interface FeatureFlags {
  // Wave 1 API Migration Flags
  USE_EXPRESS_SERVICES: boolean;
  USE_EXPRESS_STAFF: boolean;
  USE_EXPRESS_BRANCHES: boolean;
  USE_EXPRESS_PRODUCTS: boolean;
  USE_EXPRESS_CLIENTS: boolean;
  
  // Wave 2 API Migration Flags
  USE_EXPRESS_APPOINTMENTS: boolean;
  USE_EXPRESS_INVOICES: boolean;
  USE_EXPRESS_PAYMENTS: boolean;
  USE_EXPRESS_REPORTS: boolean;
  
  // Real-time Features
  USE_WEBSOCKET: boolean;
  ENABLE_REAL_TIME_UPDATES: boolean;
  
  // Migration & Development Flags
  FORCE_EXPRESS_MODE: boolean;
  ENABLE_FALLBACK: boolean;
  DEBUG_API: boolean;
  
  // Performance & UX Flags
  ENABLE_CACHING: boolean;
  ENABLE_OFFLINE_MODE: boolean;
  ENABLE_OPTIMISTIC_UPDATES: boolean;
  
  // UI Feature Flags
  ENABLE_ADVANCED_FILTERS: boolean;
  ENABLE_BULK_OPERATIONS: boolean;
  ENABLE_EXPORT_FEATURES: boolean;
}

// =========================== ENVIRONMENT VARIABLE MAPPING ===========================

const getBooleanEnv = (key: string, defaultValue = false): boolean => {
  // Convert REACT_APP_ to VITE_ prefix
  const viteKey = key.replace('REACT_APP_', 'VITE_');
  const value = (import.meta.env as any)[viteKey];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

const getStringEnv = (key: string, defaultValue = ''): string => {
  // Convert REACT_APP_ to VITE_ prefix
  const viteKey = key.replace('REACT_APP_', 'VITE_');
  return (import.meta.env as any)[viteKey] || defaultValue;
};

const getNumberEnv = (key: string, defaultValue = 0): number => {
  // Convert REACT_APP_ to VITE_ prefix
  const viteKey = key.replace('REACT_APP_', 'VITE_');
  const value = (import.meta.env as any)[viteKey];
  return value ? parseInt(value, 10) : defaultValue;
};

// =========================== FEATURE FLAGS IMPLEMENTATION ===========================

export const FEATURE_FLAGS: FeatureFlags = {
  // Wave 1 API Migration Flags
  USE_EXPRESS_SERVICES: getBooleanEnv('REACT_APP_USE_EXPRESS_SERVICES', true),
  USE_EXPRESS_STAFF: getBooleanEnv('REACT_APP_USE_EXPRESS_STAFF', true),
  USE_EXPRESS_BRANCHES: getBooleanEnv('REACT_APP_USE_EXPRESS_BRANCHES', true),
  USE_EXPRESS_PRODUCTS: getBooleanEnv('REACT_APP_USE_EXPRESS_PRODUCTS', true),
  USE_EXPRESS_CLIENTS: getBooleanEnv('REACT_APP_USE_EXPRESS_CLIENTS', true),
  
  // Wave 2 API Migration Flags
  USE_EXPRESS_APPOINTMENTS: getBooleanEnv('REACT_APP_USE_EXPRESS_APPOINTMENTS', false),
  USE_EXPRESS_INVOICES: getBooleanEnv('REACT_APP_USE_EXPRESS_INVOICES', false),
  USE_EXPRESS_PAYMENTS: getBooleanEnv('REACT_APP_USE_EXPRESS_PAYMENTS', false),
  USE_EXPRESS_REPORTS: getBooleanEnv('REACT_APP_USE_EXPRESS_REPORTS', false),
  
  // Real-time Features
  USE_WEBSOCKET: getBooleanEnv('REACT_APP_USE_WEBSOCKET', true),
  ENABLE_REAL_TIME_UPDATES: getBooleanEnv('REACT_APP_ENABLE_REAL_TIME_UPDATES', true),
  
  // Migration & Development Flags
  FORCE_EXPRESS_MODE: getBooleanEnv('REACT_APP_FORCE_EXPRESS_MODE', false),
  ENABLE_FALLBACK: getBooleanEnv('REACT_APP_ENABLE_FALLBACK', true),
  DEBUG_API: getBooleanEnv('REACT_APP_DEBUG_API', import.meta.env.DEV),
  
  // Performance & UX Flags
  ENABLE_CACHING: getBooleanEnv('REACT_APP_ENABLE_CACHING', true),
  ENABLE_OFFLINE_MODE: getBooleanEnv('REACT_APP_ENABLE_OFFLINE_MODE', false),
  ENABLE_OPTIMISTIC_UPDATES: getBooleanEnv('REACT_APP_ENABLE_OPTIMISTIC_UPDATES', true),
  
  // UI Feature Flags
  ENABLE_ADVANCED_FILTERS: getBooleanEnv('REACT_APP_ENABLE_ADVANCED_FILTERS', true),
  ENABLE_BULK_OPERATIONS: getBooleanEnv('REACT_APP_ENABLE_BULK_OPERATIONS', true),
  ENABLE_EXPORT_FEATURES: getBooleanEnv('REACT_APP_ENABLE_EXPORT_FEATURES', true),
};

// =========================== API CONFIGURATION ===========================

export const API_CONFIG = {
  BASE_URL: getStringEnv('REACT_APP_API_BASE_URL', 'http://localhost:3000/api/v1'),
  WS_URL: getStringEnv('REACT_APP_WS_URL', 'ws://localhost:3000'),
  TIMEOUT: getNumberEnv('REACT_APP_API_TIMEOUT', 30000),
  RETRY_ATTEMPTS: getNumberEnv('REACT_APP_API_RETRY_ATTEMPTS', 3),
  RETRY_DELAY: getNumberEnv('REACT_APP_API_RETRY_DELAY', 1000),
  LOG_LEVEL: getStringEnv('REACT_APP_LOG_LEVEL', 'info'),
};

// =========================== FEATURE FLAG UTILITIES ===========================

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: FeatureFlags;
  private overrides: Partial<FeatureFlags> = {};

  constructor(initialFlags: FeatureFlags = FEATURE_FLAGS) {
    this.flags = { ...initialFlags };
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.overrides[feature] ?? this.flags[feature];
  }

  /**
   * Enable/disable a feature at runtime
   */
  setFeature(feature: keyof FeatureFlags, enabled: boolean): void {
    this.overrides[feature] = enabled;
    console.log(`Feature ${feature} ${enabled ? 'enabled' : 'disabled'}`);
    
    // Persist to localStorage for development
    if (import.meta.env.DEV) {
      const key = `feature-flag-${feature}`;
      localStorage.setItem(key, enabled.toString());
    }
  }

  /**
   * Reset feature to default value
   */
  resetFeature(feature: keyof FeatureFlags): void {
    delete this.overrides[feature];
    console.log(`Feature ${feature} reset to default`);
    
    if (import.meta.env.DEV) {
      const key = `feature-flag-${feature}`;
      localStorage.removeItem(key);
    }
  }

  /**
   * Get all current flag values
   */
  getAllFlags(): FeatureFlags {
    return { ...this.flags, ...this.overrides };
  }

  /**
   * Load overrides from localStorage (development only)
   */
  loadOverrides(): void {
    if (!import.meta.env.DEV) return;

    Object.keys(this.flags).forEach(feature => {
      const key = `feature-flag-${feature}`;
      const value = localStorage.getItem(key);
      if (value !== null) {
        this.overrides[feature as keyof FeatureFlags] = value === 'true';
      }
    });
  }

  /**
   * Check if Wave 1 migration is complete
   */
  isWave1Complete(): boolean {
    return (
      this.isEnabled('USE_EXPRESS_SERVICES') &&
      this.isEnabled('USE_EXPRESS_STAFF') &&
      this.isEnabled('USE_EXPRESS_BRANCHES') &&
      this.isEnabled('USE_EXPRESS_PRODUCTS') &&
      this.isEnabled('USE_EXPRESS_CLIENTS')
    );
  }

  /**
   * Check if Wave 2 migration is complete
   */
  isWave2Complete(): boolean {
    return (
      this.isEnabled('USE_EXPRESS_APPOINTMENTS') &&
      this.isEnabled('USE_EXPRESS_INVOICES') &&
      this.isEnabled('USE_EXPRESS_PAYMENTS') &&
      this.isEnabled('USE_EXPRESS_REPORTS')
    );
  }

  /**
   * Check if full migration is complete
   */
  isMigrationComplete(): boolean {
    return this.isWave1Complete() && this.isWave2Complete();
  }

  /**
   * Get migration status summary
   */
  getMigrationStatus() {
    return {
      wave1: {
        complete: this.isWave1Complete(),
        services: this.isEnabled('USE_EXPRESS_SERVICES'),
        staff: this.isEnabled('USE_EXPRESS_STAFF'),
        branches: this.isEnabled('USE_EXPRESS_BRANCHES'),
        products: this.isEnabled('USE_EXPRESS_PRODUCTS'),
        clients: this.isEnabled('USE_EXPRESS_CLIENTS'),
      },
      wave2: {
        complete: this.isWave2Complete(),
        appointments: this.isEnabled('USE_EXPRESS_APPOINTMENTS'),
        invoices: this.isEnabled('USE_EXPRESS_INVOICES'),
        payments: this.isEnabled('USE_EXPRESS_PAYMENTS'),
        reports: this.isEnabled('USE_EXPRESS_REPORTS'),
      },
      realtime: {
        websocket: this.isEnabled('USE_WEBSOCKET'),
        updates: this.isEnabled('ENABLE_REAL_TIME_UPDATES'),
      },
      overall: this.isMigrationComplete(),
    };
  }
}

// =========================== CONVENIENCE FUNCTIONS ===========================

export const featureFlags = FeatureFlagService.getInstance();

// Load any development overrides
featureFlags.loadOverrides();

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return featureFlags.isEnabled(feature);
};

/**
 * Component wrapper for feature-gated content
 */
export const FeatureGate: React.FC<{
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ feature, children, fallback = null }) => {
  return isFeatureEnabled(feature) ? <>{children}</> : <>{fallback}</>;
};

/**
 * Hook for feature flag values
 */
export const useFeatureFlag = (feature: keyof FeatureFlags) => {
  const [enabled, setEnabled] = React.useState(featureFlags.isEnabled(feature));

  React.useEffect(() => {
    // In a real implementation, you might want to listen for feature flag changes
    setEnabled(featureFlags.isEnabled(feature));
  }, [feature]);

  return enabled;
};

/**
 * Hook for multiple feature flags
 */
export const useFeatureFlags = (features: (keyof FeatureFlags)[]) => {
  return features.reduce((acc, feature) => {
    acc[feature] = featureFlags.isEnabled(feature);
    return acc;
  }, {} as Record<keyof FeatureFlags, boolean>);
};

// =========================== DEVELOPMENT HELPERS ===========================

/**
 * Development-only feature flag debugger
 */
export const FeatureFlagDebugger: React.FC = () => {
  if (!import.meta.env.DEV) return null;

  const [flags, setFlags] = React.useState(featureFlags.getAllFlags());

  const handleToggle = (feature: keyof FeatureFlags) => {
    const newValue = !flags[feature];
    featureFlags.setFeature(feature, newValue);
    setFlags({ ...flags, [feature]: newValue });
  };

  const handleReset = (feature: keyof FeatureFlags) => {
    featureFlags.resetFeature(feature);
    setFlags(featureFlags.getAllFlags());
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'white', 
      border: '1px solid #ccc',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '12px',
      maxHeight: '400px',
      overflowY: 'auto',
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h4>Feature Flags (Dev)</h4>
      {Object.entries(flags).map(([feature, enabled]) => (
        <div key={feature} style={{ marginBottom: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => handleToggle(feature as keyof FeatureFlags)}
            />
            <span style={{ fontSize: '10px' }}>{feature}</span>
            <button 
              onClick={() => handleReset(feature as keyof FeatureFlags)}
              style={{ fontSize: '8px', padding: '1px 3px' }}
            >
              Reset
            </button>
          </label>
        </div>
      ))}
    </div>
  );
};

// =========================== EXPORTS ===========================

export default {
  FEATURE_FLAGS,
  API_CONFIG,
  featureFlags,
  isFeatureEnabled,
  FeatureFlagService,
  FeatureGate,
  FeatureFlagDebugger,
};