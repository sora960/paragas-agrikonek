export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

// Supabase table uses 'task' instead of 'text' and 'created_at' instead of 'createdAt'
export interface SupabaseTask {
  id: string;
  task: string;
  completed: boolean;
  created_at: string;
}

// Conversion functions between app Task and Supabase schema
export function toSupabaseTask(task: Task): Omit<SupabaseTask, 'id' | 'created_at'> {
  return {
    task: task.text,
    completed: task.completed
  };
}

export function fromSupabaseTask(supabaseTask: SupabaseTask): Task {
  return {
    id: supabaseTask.id,
    text: supabaseTask.task,
    completed: supabaseTask.completed,
    createdAt: new Date(supabaseTask.created_at)
  };
}
