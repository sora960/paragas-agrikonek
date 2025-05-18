import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
// This bypasses RLS permissions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.eztechsolutions.pro',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      persistSession: false,
    }
  }
);

// Create a generic request/response handler that doesn't rely on Next.js
type Request = {
  method: string;
  headers: Record<string, string>;
  body: any;
};

type Response = {
  status: (code: number) => Response;
  json: (data: any) => void;
};

// Simple auth helper
const verifyToken = async (token: string) => {
  try {
    // This is a placeholder - you would actually implement token verification
    // based on your auth system
    return { id: 'admin-user', role: 'superadmin' };
  } catch (error) {
    return null;
  }
};

export default async function handler(req: Request, res: Response) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify the request is authorized (from an admin)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const user = await verifyToken(token);
    
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden - Only superadmins can assign regional admins' });
    }

    // Get user_id and region_id from request body
    const { user_id, region_id } = req.body;

    if (!user_id || !region_id) {
      return res.status(400).json({ message: 'Missing required fields: user_id and region_id' });
    }

    // Insert the user_region record using the admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('user_regions')
      .insert({
        user_id,
        region_id,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error assigning regional admin:', error);
      return res.status(500).json({ message: 'Error assigning regional admin', error });
    }

    // Update the user's role if needed
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        role: 'regional_admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return res.status(500).json({ message: 'Error updating user role', error: updateError });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in assign-regional-admin API:', error);
    return res.status(500).json({ message: 'Internal server error', error });
  }
} 