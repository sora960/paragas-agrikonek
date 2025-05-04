
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testSupabaseAuth } from '@/utils/testConnection';
import { DatabaseConnectionCheck } from '@/components/DatabaseConnectionCheck';
import { toast } from 'sonner';
import { createTestUsers } from '@/services/userService';
import { initializeDatabase, fixDatabaseSchema } from '@/utils/initializeDatabase';

export default function TestConnection() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [testingUsers, setTestingUsers] = useState(false);
  const [fixingDatabase, setFixingDatabase] = useState(false);
  const [rebuildingTables, setRebuildingTables] = useState(false);
  
  const runTests = async () => {
    setTesting(true);
    setResults([]);
    
    try {
      // Test connection
      const success = await testSupabaseAuth();
      
      if (success) {
        toast.success("Connection test successful");
        setResults(prev => [...prev, "✅ Connection to Supabase successful"]);
      } else {
        toast.error("Connection test failed");
        setResults(prev => [...prev, "❌ Connection to Supabase failed"]);
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message || 'Unknown error'}`);
      setResults(prev => [...prev, `❌ Test error: ${error.message || 'Unknown error'}`]);
    } finally {
      setTesting(false);
    }
  };
  
  const handleCreateTestUsers = async () => {
    setTestingUsers(true);
    
    try {
      const result = await createTestUsers();
      
      if (result.success) {
        toast.success("Test users created successfully");
        setResults(prev => [...prev, "✅ Test users created successfully"]);
        
        // Show details for each user
        result.results?.forEach(item => {
          const status = item.result.success ? "✅" : "❌";
          setResults(prev => [...prev, `${status} User ${item.email}: ${item.result.success ? 'Created' : item.result.error?.message || 'Failed'}`]);
        });
      } else {
        toast.error(`Failed to create test users: ${result.error?.message || 'Unknown error'}`);
        setResults(prev => [...prev, `❌ Failed to create test users: ${result.error?.message || 'Unknown error'}`]);
      }
    } catch (error: any) {
      toast.error(`Error creating test users: ${error.message || 'Unknown error'}`);
      setResults(prev => [...prev, `❌ Error: ${error.message || 'Unknown error'}`]);
    } finally {
      setTestingUsers(false);
    }
  };

  const handleFixDatabase = async () => {
    setFixingDatabase(true);
    
    try {
      setResults(prev => [...prev, "🔧 Starting database initialization..."]);
      
      const result = await initializeDatabase();
      
      if (result.success) {
        toast.success("Database initialized successfully");
        setResults(prev => [...prev, "✅ Database initialized successfully"]);
      } else {
        toast.error(`Failed to initialize database: ${result.error?.message || 'Unknown error'}`);
        setResults(prev => [...prev, `❌ Failed to initialize database: ${result.error?.message || 'Unknown error'}`]);
      }
    } catch (error: any) {
      toast.error(`Error initializing database: ${error.message || 'Unknown error'}`);
      setResults(prev => [...prev, `❌ Error: ${error.message || 'Unknown error'}`]);
    } finally {
      setFixingDatabase(false);
    }
  };
  
  const handleRebuildTables = async () => {
    setRebuildingTables(true);
    
    try {
      setResults(prev => [...prev, "🔧 Rebuilding database tables..."]);
      
      const result = await fixDatabaseSchema();
      
      if (result.success) {
        toast.success("Database tables rebuilt successfully");
        setResults(prev => [...prev, "✅ Database tables rebuilt successfully"]);
      } else {
        toast.error(`Failed to rebuild database tables: ${result.error?.message || 'Unknown error'}`);
        setResults(prev => [...prev, `❌ Failed to rebuild database tables: ${result.error?.message || 'Unknown error'}`]);
      }
    } catch (error: any) {
      toast.error(`Error rebuilding database tables: ${error.message || 'Unknown error'}`);
      setResults(prev => [...prev, `❌ Error: ${error.message || 'Unknown error'}`]);
    } finally {
      setRebuildingTables(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Database Connection Test</h1>
        <div className="flex gap-2">
          <Link to="/register">
            <Button variant="outline">Register</Button>
          </Link>
          <Link to="/login">
            <Button variant="outline">Login</Button>
          </Link>
        </div>
      </div>
      
      <div className="grid gap-6">
        <DatabaseConnectionCheck />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Supabase Connection Test</CardTitle>
            <Button 
              onClick={runTests} 
              disabled={testing}
              variant="outline"
            >
              {testing ? "Testing..." : "Run Test"}
            </Button>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="bg-muted p-4 rounded-md">
                <pre className="whitespace-pre-wrap">
                  {results.join('\n')}
                </pre>
              </div>
            ) : (
              <p className="text-muted-foreground">Click "Run Test" to check the Supabase connection.</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Database Initialization</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={handleFixDatabase} 
                disabled={fixingDatabase}
                variant="secondary"
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                {fixingDatabase ? "Initializing..." : "Initialize Database"}
              </Button>
              <Button 
                onClick={handleRebuildTables} 
                disabled={rebuildingTables}
                variant="destructive"
              >
                {rebuildingTables ? "Rebuilding..." : "Rebuild Tables"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Initialize the database with all required tables and correct schema constraints.
              Click this button if you're having issues with user registration or login.
            </p>
            <div className="flex flex-col gap-2">
              <div className="bg-muted p-3 rounded-md">
                <strong>Initialize Database:</strong> Creates missing tables if needed
              </div>
              <div className="bg-muted p-3 rounded-md">
                <strong>Rebuild Tables:</strong> More aggressive fix - recreates tables with correct schema
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Test Users</CardTitle>
            <Button 
              onClick={handleCreateTestUsers} 
              disabled={testingUsers}
              variant="default"
              className="bg-[#4F772D]"
            >
              {testingUsers ? "Creating..." : "Create Test Users"}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create test users for all roles with the password "password123":
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>farmer@test.com (Farmer)</li>
              <li>regional@test.com (Regional Admin)</li>
              <li>organization@test.com (Organization Admin)</li>
              <li>superadmin@test.com (Super Admin)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
