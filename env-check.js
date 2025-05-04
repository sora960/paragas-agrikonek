// Simple script to check environment variables
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if .env.local exists
const envPath = resolve(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

console.log('.env.local exists:', envExists);

if (envExists) {
  // Load environment variables from .env.local
  dotenv.config({ path: envPath });
  
  console.log('Environment Variables Check:');
  console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL || 'Not set');
  console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Set (value hidden)' : 'Not set');
} else {
  console.log('ERROR: .env.local file not found!');
  console.log('Create this file with your Supabase credentials:');
  console.log('VITE_SUPABASE_URL=https://supabase.eztechsolutions.pro');
  console.log('VITE_SUPABASE_ANON_KEY=your-actual-anon-key');
} 