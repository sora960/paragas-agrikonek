
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkRequiredTables, createRequiredTables } from "@/utils/databaseUtils";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function DatabaseConnectionCheck() {
  const [checking, setChecking] = useState(false);
  const [tablesStatus, setTablesStatus] = useState<Record<string, boolean> | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  
  const checkConnection = async () => {
    setChecking(true);
    
    try {
      // Check Supabase connection
      const { data, error } = await supabase.from('todos').select('count').single();
      const connected = !error;
      setSupabaseConnected(connected);
      
      if (connected) {
        // Check tables
        const { tables } = await checkRequiredTables();
        setTablesStatus(tables);
      }
    } catch (error) {
      console.error("Connection check error:", error);
      setSupabaseConnected(false);
    } finally {
      setChecking(false);
    }
  };
  
  const handleSetupTables = async () => {
    try {
      const result = await createRequiredTables();
      
      if (result.success) {
        toast.success("Database tables created successfully");
        // Re-check tables
        const { tables } = await checkRequiredTables();
        setTablesStatus(tables);
      } else {
        toast.error(`Failed to create tables: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      toast.error(`Table setup error: ${error.message || 'Unknown error'}`);
    }
  };
  
  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, []);
  
  if (supabaseConnected === null) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Database Connection</CardTitle>
          <Badge variant="outline">Checking...</Badge>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="w-8 h-8 border-4 border-t-[#4F772D] rounded-full animate-spin"></div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Database Connection</CardTitle>
        <Badge variant={supabaseConnected ? "success" : "destructive"}>
          {supabaseConnected ? "Connected" : "Not Connected"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {supabaseConnected ? (
          <>
            <div>
              <h3 className="font-semibold mb-2">Required Tables</h3>
              <div className="grid grid-cols-2 gap-2">
                {tablesStatus && Object.entries(tablesStatus).map(([table, exists]) => (
                  <div key={table} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-mono text-sm">{table}</span>
                    <Badge variant={exists ? "success" : "destructive"}>
                      {exists ? "Exists" : "Missing"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            {tablesStatus && !Object.values(tablesStatus).every(Boolean) && (
              <Button 
                onClick={handleSetupTables}
                className="w-full bg-[#4F772D]"
                disabled={checking}
              >
                Setup Missing Tables
              </Button>
            )}
          </>
        ) : (
          <div className="text-center">
            <p className="mb-4 text-red-600">
              Unable to connect to the Supabase database. Please check your connection settings.
            </p>
            <Button onClick={checkConnection} disabled={checking}>
              Retry Connection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
