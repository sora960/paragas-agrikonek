import { supabase } from './supabase'

// Simple auth state management
let currentUser = null

export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase
      .from('todos')
      .insert([
        {
          task: `User Account: ${email}`,
          completed: false,
          // Store email and password in the task field for now
          // In production, we should create a proper users table
        }
      ])
      .select()
    
    if (error) throw error
    
    currentUser = {
      email,
      id: data[0].id
    }
    return { user: currentUser, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export async function signIn(email: string, password: string) {
  try {
    // For now, we'll just check if the task contains the email
    // This is a temporary solution for testing
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .like('task', `%${email}%`)
      .single()
    
    if (error) throw error
    
    currentUser = {
      email,
      id: data.id
    }
    return { user: currentUser, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export function signOut() {
  currentUser = null
  return { user: null, error: null }
}

export function getCurrentUser() {
  return currentUser
}

// Test the connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('todos').select('*').limit(1)
    
    if (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
    
    console.log('Supabase connection test successful')
    console.log('Found', data?.length || 0, 'existing todos')
    return true
  } catch (error) {
    console.error('Error testing Supabase connection:', error)
    return false
  }
} 