import { useState, useEffect } from 'react'
import { useSupabaseQuery, useSupabase } from '@/hooks/useSupabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { verifySupabaseConnection } from '@/utils/supabaseHelper'

interface Todo {
  id: string
  task: string
  completed: boolean
  created_at: string
}

export default function SupabaseExample() {
  const [newTask, setNewTask] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking')
  const { data: todos, loading, error } = useSupabaseQuery<Todo>('todos')
  const supabase = useSupabase()
  
  // Verify Supabase connection on component mount
  useEffect(() => {
    async function checkConnection() {
      try {
        console.log('Verifying Supabase connection...')
        await verifySupabaseConnection()
        setConnectionStatus('success')
      } catch (error) {
        console.error('Connection verification failed:', error)
        setConnectionStatus('error')
      }
    }
    
    checkConnection()
  }, [])

  const addTodo = async () => {
    if (!newTask.trim()) return
    
    try {
      setIsLoading(true)
      console.log('Adding todo:', newTask)
      
      // Define the new todo data
      const newTodo = { 
        task: newTask, 
        completed: false 
      }
      
      console.log('Sending data to Supabase:', newTodo)
      
      const { data, error } = await supabase
        .from('todos')
        .insert(newTodo)
        .select()
      
      console.log('Supabase response:', { data, error })
      
      if (error) {
        console.error('Supabase error:', error)
        toast({
          title: 'Error adding task',
          description: error.message || 'Failed to add task',
          variant: 'destructive'
        })
        throw error
      }
      
      toast({
        title: 'Task added',
        description: 'Your task was successfully added'
      })
      
      // After adding, clear the input
      setNewTask('')
      
      // Manually update the UI without full reload
      window.location.reload()
    } catch (error) {
      console.error('Error adding todo:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTodoCompleted = async (id: string, currentStatus: boolean) => {
    try {
      setIsLoading(true)
      console.log('Updating todo status:', { id, currentStatus: !currentStatus })
      
      const { error } = await supabase
        .from('todos')
        .update({ completed: !currentStatus })
        .eq('id', id)
      
      if (error) {
        console.error('Error updating todo:', error)
        toast({
          title: 'Error updating task',
          description: error.message,
          variant: 'destructive'
        })
        throw error
      }
      
      toast({
        title: 'Task updated',
        description: 'Task status has been updated'
      })
      
      // Refetch the data
      window.location.reload()
    } catch (error) {
      console.error('Error updating todo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      setIsLoading(true)
      console.log('Deleting todo:', id)
      
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting todo:', error)
        toast({
          title: 'Error deleting task',
          description: error.message,
          variant: 'destructive'
        })
        throw error
      }
      
      toast({
        title: 'Task deleted',
        description: 'The task has been removed'
      })
      
      // Refetch the data
      window.location.reload()
    } catch (error) {
      console.error('Error deleting todo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (connectionStatus === 'checking') {
    return <div>Verifying Supabase connection...</div>
  }
  
  if (connectionStatus === 'error') {
    return (
      <Card className="w-full max-w-md mx-auto bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive">Supabase Connection Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to connect to your Supabase instance. Please check:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Your .env.local file has the correct Supabase URL and anon key</li>
            <li>Your Supabase instance is running and accessible</li>
            <li>The 'todos' table exists with the correct schema</li>
            <li>Check browser console for detailed error messages</li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (loading) return <div>Loading todos...</div>
  if (error) return <div>Error loading todos: {error.message}</div>

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Supabase Todo Example</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            placeholder="Add a new task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && addTodo()}
            disabled={isLoading}
          />
          <Button onClick={addTodo} disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add'}
          </Button>
        </div>
        
        <div className="space-y-2">
          {todos && todos.length > 0 ? (
            todos.map((todo) => (
              <div 
                key={todo.id} 
                className="flex items-center justify-between border rounded p-2"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => !isLoading && toggleTodoCompleted(todo.id, todo.completed)}
                    className="mr-2 h-4 w-4"
                    disabled={isLoading}
                  />
                  <span className={todo.completed ? 'line-through text-gray-500' : ''}>
                    {todo.task}
                  </span>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => !isLoading && deleteTodo(todo.id)}
                  disabled={isLoading}
                >
                  Delete
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500">No todos yet</div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start text-xs text-gray-500">
        <div>Connected to Supabase: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</div>
        <div className="mt-1">Table: todos</div>
      </CardFooter>
    </Card>
  )
} 