import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { verifySupabaseConnection } from './utils/supabaseHelper'

// Verify Supabase connection on application startup
// This will log information about the connection status
verifySupabaseConnection().catch(error => {
  console.error('Failed to verify Supabase connection on startup:', error)
})

createRoot(document.getElementById("root")!).render(<App />);
