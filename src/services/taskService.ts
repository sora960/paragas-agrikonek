import { supabase } from '@/lib/supabase';
import { Task, SupabaseTask, toSupabaseTask, fromSupabaseTask } from '@/types/task';

const TABLE_NAME = 'todos';

/**
 * Get all tasks from Supabase
 */
export async function getTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
    
    return data ? data.map((item: SupabaseTask) => fromSupabaseTask(item)) : [];
  } catch (error) {
    console.error('Failed to get tasks from Supabase:', error);
    return [];
  }
}

/**
 * Create a new task in Supabase
 */
export async function createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> {
  try {
    const supabaseTask = toSupabaseTask(task as Task);
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(supabaseTask)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }
    
    return data ? fromSupabaseTask(data as SupabaseTask) : null;
  } catch (error) {
    console.error('Failed to create task in Supabase:', error);
    return null;
  }
}

/**
 * Update a task in Supabase
 */
export async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<boolean> {
  try {
    // Convert to Supabase format
    const supabaseUpdates: Partial<Omit<SupabaseTask, 'id' | 'created_at'>> = {};
    if ('text' in updates) supabaseUpdates.task = updates.text;
    if ('completed' in updates) supabaseUpdates.completed = updates.completed;
    
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(supabaseUpdates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to update task in Supabase:', error);
    return false;
  }
}

/**
 * Delete a task from Supabase
 */
export async function deleteTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete task from Supabase:', error);
    return false;
  }
}

/**
 * Migrate existing tasks from localStorage to Supabase
 */
export async function migrateLocalStorageToSupabase(): Promise<boolean> {
  try {
    // Get tasks from localStorage
    const savedTasks = localStorage.getItem('tasks');
    if (!savedTasks) return true; // No tasks to migrate
    
    const parsedTasks = JSON.parse(savedTasks);
    if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) return true;
    
    console.log(`Migrating ${parsedTasks.length} tasks from localStorage to Supabase...`);
    
    // Convert to Supabase format
    const supabaseTasks = parsedTasks.map((task: Task) => ({
      task: task.text,
      completed: task.completed,
      // Don't include ID as Supabase will generate new ones
      // Don't include created_at as Supabase will set current time
    }));
    
    // Insert tasks into Supabase
    const { error } = await supabase
      .from(TABLE_NAME)
      .insert(supabaseTasks);
    
    if (error) {
      console.error('Error migrating tasks to Supabase:', error);
      throw error;
    }
    
    console.log('Tasks successfully migrated to Supabase');
    
    // Remove from localStorage to avoid duplicates
    localStorage.removeItem('tasks');
    
    return true;
  } catch (error) {
    console.error('Failed to migrate tasks to Supabase:', error);
    return false;
  }
} 