import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Generic hook for fetching data from Supabase
export function useSupabaseQuery<T>(
  tableName: string,
  query?: {
    column?: string
    value?: any
    select?: string
  }
) {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        let queryBuilder = supabase
          .from(tableName)
          .select(query?.select || '*')
        
        if (query?.column && query?.value !== undefined) {
          queryBuilder = queryBuilder.eq(query.column, query.value)
        }
        
        const { data, error } = await queryBuilder
        
        if (error) throw error
        
        setData(data as T[])
      } catch (error) {
        setError(error as Error)
        console.error(`Error fetching from ${tableName}:`, error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [tableName, query?.column, query?.value, query?.select])

  return { data, loading, error }
}

// Simple hook to get Supabase client for direct use
export function useSupabase() {
  return supabase
} 