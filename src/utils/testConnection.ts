import { supabase } from '@/lib/supabase'

export async function testSupabaseAuth() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test connection using todos table
    const { data: todos, error: todosError } = await supabase.from('todos').select('*').limit(1)
    if (todosError) {
      console.error('Connection test failed:', todosError)
      return false
    }
    console.log('Connection test passed, found todos:', todos?.length || 0)
    
    // Check todos table structure
    console.log('Checking todos table structure...')
    if (todos && todos.length > 0) {
      console.log('First todo item structure:', Object.keys(todos[0]))
    }
    
    // Try to access users table
    console.log('Checking users table access...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('Users table access failed:', usersError)
    } else {
      console.log('Users table access successful:', users?.length || 0)
      if (users && users.length > 0) {
        console.log('User structure:', Object.keys(users[0]))
      }
    }
    
    // Try to access user_credentials table
    console.log('Checking user_credentials table access...')
    const { data: credentials, error: credentialsError } = await supabase
      .from('user_credentials')
      .select('*')
      .limit(1)
    
    if (credentialsError) {
      console.error('User credentials table access failed:', credentialsError)
    } else {
      console.log('User credentials table access successful:', credentials?.length || 0)
      if (credentials && credentials.length > 0) {
        console.log('Credentials structure:', Object.keys(credentials[0]))
      }
    }
    
    // Try to access regions table
    console.log('Checking regions table access...')
    const { data: regions, error: regionsError } = await supabase
      .from('regions')
      .select('*')
      .limit(1)
    
    if (regionsError) {
      console.error('Regions table access failed:', regionsError)
    } else {
      console.log('Regions table access successful:', regions?.length || 0)
      if (regions && regions.length > 0) {
        console.log('Region structure:', Object.keys(regions[0]))
      }
    }
    
    return true
  } catch (error) {
    console.error('Test failed:', error)
    return false
  }
} 