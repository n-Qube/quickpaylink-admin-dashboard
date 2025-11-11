import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize Firebase App Check for security
import { initializeFirebaseAppCheck } from './lib/appCheck'

// Initialize App Check before rendering the app
// This protects all Firebase services from abuse
// Temporarily disabled due to missing VITE_RECAPTCHA_SITE_KEY
// initializeFirebaseAppCheck()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
