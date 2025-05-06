import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { login } from '@/services/authService';

export default function TestAuthFunctions() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [adminOrgs, setAdminOrgs] = useState<any[]>([]);

  const handleCheckUser = async () => {
    if (!username) {
      setStatus('Please enter a username');
      return;
    }

    setLoading(true);
    setStatus('Checking user...');
    
    try {
      // Check if user exists in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', username)
        .single();
        
      if (userError) {
        setStatus(`User not found: ${userError.message}`);
        setUserDetails(null);
        return;
      }
      
      // Check if the user has credentials
      const { data: credData, error: credError } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('user_id', userData.id)
        .single();
        
      if (credError) {
        setStatus(`User found but no credentials stored: ${credError.message}`);
        setUserDetails({
          ...userData,
          has_credentials: false
        });
        return;
      }
      
      setStatus('User found with credentials');
      setUserDetails({
        ...userData,
        has_credentials: true,
        credential_id: credData.id,
        password_hash: credData.password_hash
      });
      
    } catch (error: any) {
      setStatus(`Error checking user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    if (!username || !password) {
      setStatus('Please enter both username and password');
      return;
    }

    setLoading(true);
    setStatus('Testing login...');
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        setStatus('Login successful!');
        setUserDetails(result.user);
      } else {
        setStatus(`Login failed: ${result.error?.message}`);
        setUserDetails(null);
      }
    } catch (error: any) {
      setStatus(`Login error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFixMissingCredentials = async () => {
    if (!userDetails || !username || !password) {
      setStatus('Please enter username and password and check user first');
      return;
    }

    setLoading(true);
    setStatus('Fixing credentials...');
    
    try {
      // Check if user already has credentials
      const { data, error: checkError } = await supabase
        .from('user_credentials')
        .select('id')
        .eq('user_id', userDetails.id)
        .maybeSingle();
        
      if (data) {
        // Update existing credentials
        const { error: updateError } = await supabase
          .from('user_credentials')
          .update({ password_hash: password })
          .eq('id', data.id);
          
        if (updateError) {
          setStatus(`Failed to update credentials: ${updateError.message}`);
          return;
        }
      } else {
        // Insert new credentials
        const { error: insertError } = await supabase
          .from('user_credentials')
          .insert({
            user_id: userDetails.id,
            password_hash: password
          });
          
        if (insertError) {
          setStatus(`Failed to create credentials: ${insertError.message}`);
          return;
        }
      }
      
      setStatus('Credentials fixed successfully!');
      
      // Re-check user to update the display
      await handleCheckUser();
      
    } catch (error: any) {
      setStatus(`Error fixing credentials: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminOrganizations = async () => {
    if (!userDetails?.id) {
      setStatus('Please check a user first');
      return;
    }

    setLoading(true);
    setStatus('Checking admin organizations...');
    
    try {
      // Check if user is an admin for any organizations
      const { data, error } = await supabase
        .from('organization_admins')
        .select(`
          organization_id,
          organizations:organization_id (
            id,
            name,
            region_id,
            regions:region_id (name)
          )
        `)
        .eq('user_id', userDetails.id);
        
      if (error) {
        setStatus(`Error checking admin organizations: ${error.message}`);
        setAdminOrgs([]);
        return;
      }
      
      if (!data || data.length === 0) {
        setStatus('User is not an admin for any organizations');
        setAdminOrgs([]);
        return;
      }
      
      // Format the organization data
      const formattedOrgs = data.map((item: any) => ({
        id: item.organizations.id,
        name: item.organizations.name,
        region_id: item.organizations.region_id,
        region_name: item.organizations.regions?.name || 'Unknown Region'
      }));
      
      setAdminOrgs(formattedOrgs);
      setStatus(`User is admin for ${formattedOrgs.length} organization(s)`);
      
    } catch (error: any) {
      setStatus(`Error checking admin organizations: ${error.message}`);
      setAdminOrgs([]);
    } finally {
      setLoading(false);
    }
  };

  const makeUserOrgAdmin = async () => {
    if (!userDetails?.id) {
      setStatus('Please check a user first');
      return;
    }

    setLoading(true);
    setStatus('Updating user role to org_admin...');
    
    try {
      // First update the user's role to org_admin if it's not already
      if (userDetails.role !== 'org_admin' && userDetails.role !== 'organization_admin') {
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'org_admin' })
          .eq('id', userDetails.id);
          
        if (updateError) {
          setStatus(`Failed to update user role: ${updateError.message}`);
          return;
        }
        
        // Update the local user details
        setUserDetails({
          ...userDetails,
          role: 'org_admin'
        });
        
        setStatus('User role updated to org_admin');
      } else {
        setStatus('User is already an org_admin');
      }
      
    } catch (error: any) {
      setStatus(`Error updating user role: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Authentication Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder="Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <Button 
            onClick={handleCheckUser} 
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            Check User
          </Button>
          <Button 
            onClick={handleTestLogin} 
            disabled={loading}
            className="flex-1"
          >
            Test Login
          </Button>
        </div>
        
        {userDetails && (
          <div className="flex space-x-2">
            <Button
              onClick={handleFixMissingCredentials}
              disabled={loading || userDetails.has_credentials}
              variant={userDetails.has_credentials ? "outline" : "destructive"}
              className="flex-1"
            >
              {userDetails.has_credentials ? "Update Password" : "Fix Missing Credentials"}
            </Button>
            
            <Button
              onClick={checkAdminOrganizations}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Check Admin Orgs
            </Button>
          </div>
        )}
        
        {userDetails && userDetails.role !== 'org_admin' && userDetails.role !== 'organization_admin' && (
          <Button
            onClick={makeUserOrgAdmin}
            disabled={loading}
            variant="secondary"
            className="w-full"
          >
            Make Org Admin
          </Button>
        )}
        
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">Status:</p>
          <p>{status || 'Idle'}</p>
        </div>
        
        {userDetails && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">User Details:</p>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(userDetails, null, 2)}
            </pre>
          </div>
        )}
        
        {adminOrgs.length > 0 && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Admin Organizations:</p>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(adminOrgs, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 