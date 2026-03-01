import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Import utility functions for debugging (available in browser console)
import './utils/fixUserDocument';
import './utils/migrateBranchIds';
import './utils/migrateSchedules';
import './utils/migrateUserClaims';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
