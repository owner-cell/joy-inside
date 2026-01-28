import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async (req: VercelRequest, res: VercelResponse) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
          return res.status(200).end();
    }

    if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
          const { phone } = req.query;

      if (!phone || typeof phone !== 'string') {
              return res.status(400).json({ error: 'Missing required query param: phone' });
      }

      const { data, error } = await supabase
            .from('callers')
            .select('name, faith, prefs, history, consent_callback, isolation_flag')
            .eq('phone_number', phone)
            .single();

      if (error && error.code !== 'PGRST116') {
              console.error('Supabase error:', error);
              return res.status(500).json({ error: 'Database query failed' });
      }

      // Return empty object if no row found, otherwise return the data
      const result = data || {};
          return res.status(200).json(result);
    } catch (err) {
          console.error('Unexpected error:', err);
          return res.status(500).json({ error: 'Internal server error' });
    }
};
