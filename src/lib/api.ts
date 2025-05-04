import { supabase } from './supabase'

// Example function to fetch data from a table
export async function fetchData<T>(tableName: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
  
  if (error) {
    console.error('Error fetching data:', error)
    throw error
  }
  
  return data as T[]
}

// Example function to insert data into a table
export async function insertData<T>(tableName: string, data: T) {
  const { data: insertedData, error } = await supabase
    .from(tableName)
    .insert(data)
    .select()
  
  if (error) {
    console.error('Error inserting data:', error)
    throw error
  }
  
  return insertedData
}

// Example function to update data in a table
export async function updateData<T>(tableName: string, id: string, data: Partial<T>) {
  const { data: updatedData, error } = await supabase
    .from(tableName)
    .update(data)
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Error updating data:', error)
    throw error
  }
  
  return updatedData
}

// Example function to delete data from a table
export async function deleteData(tableName: string, id: string) {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting data:', error)
    throw error
  }
  
  return true
} 