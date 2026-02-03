import { createClient } from '@supabase/supabase-js';

// TODO: Move these to environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
const supabaseUrl = 'https://bicezeblwvtwsrsjsxuc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpY2V6ZWJsd3Z0d3Nyc2pzeHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDAwMTgsImV4cCI6MjA4Mjg3NjAxOH0.BWj8Q82yF4qpZBwt4vWkg7EoakH-prMTGkweO3BJKGs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
