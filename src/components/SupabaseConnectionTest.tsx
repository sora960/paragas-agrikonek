import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle } from 'lucide-react'

export default function SupabaseConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking')
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    async function checkConnection() {
      try {
        // Simple test - try to access the todos table
        const { error } = await supabase.from('todos').select('*').limit(1)
        
        // If we can query the table (even if empty), connection is good
        const success = !error || error.code === '42P01' // Either success or table doesn't exist, which still means connection works
        
        setConnectionStatus(success ? 'success' : 'error')
        
        // Only show success message, not errors (to avoid cluttering UI)
        if (success) {
          setShowAlert(true)
          
          // Hide after 3 seconds
          setTimeout(() => {
            setShowAlert(false)
          }, 3000)
        }
      } catch (error) {
        console.error('Connection check failed:', error)
        setConnectionStatus('error')
        // Don't show error alert
      }
    }

    checkConnection()
  }, [])

  // Only show success message, not checking or error states
  if (!showAlert || connectionStatus !== 'success') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>Connected to Supabase</AlertTitle>
        <AlertDescription className="text-green-700">
          Your app is connected to the cloud database.
        </AlertDescription>
      </Alert>
    </div>
  )
} 