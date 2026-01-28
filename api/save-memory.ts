import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SaveMemoryBody {
    phone: string;
    name?: string;
    faith?: string;
    prefs?: Record<string, unknown>;
    history?: unknown[];
    consent_callback?: boolean;
    duration?: number;
    isolation_flag?: boolean;
}

export default async (req: VercelRequest, res: VercelResponse) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
          return res.status(200).end();
    }

    if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
          const body = req.body as SaveMemoryBody;

      if (!body.phone || typeof body.phone !== 'string') {
              return res.status(400).json({ error: 'Missing required field: phone' });
      }

      const now = new Date().toISOString();

      // Build update object
      const updateData: Record<string, unknown> = {
              last_call: now,
      };

      if (body.name !== undefined) updateData.name = body.name;
          if (body.faith !== undefined) updateData.faith = body.faith;
          if (body.prefs !== undefined) updateData.prefs = body.prefs;
          if (body.history !== undefined) updateData.history = body.history;
          if (body.consent_callback !== undefined) updateData.consent_callback = body.consent_callback;
          if (body.isolation_flag !== undefined) updateData.isolation_flag = body.isolation_flag;

      // Handle duration: add to existing total_duration
      if (body.duration !== undefined && body.duration > 0) {
              const { data: existing } = await supabase
                .from('callers')
                .select('total_duration')
                .eq('phone_number', body.phone)
                .single();

            const currentDuration = existing?.total_duration || 0;
              updateData.total_duration = currentDuration + body.duration;
      }

      const { error } = await supabase
            .from('callers')
            .upsert(
              {
                          phone_number: body.phone,
                          ...updateData,
              },
              { onConflict: 'phone_number' }
                    );

      if (error) {
              console.error('Supabase error:', error);
              return res.status(500).json({ error: 'Database save failed' });
      }

      return res.status(200).json({ success: true, message: 'Saved' });
    } catch (err) {
          console.error('Unexpected error:', err);
          return res.status(500).json({ error: 'Internal server error' });
    }
};
