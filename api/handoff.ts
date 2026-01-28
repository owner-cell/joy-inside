import { VercelRequest, VercelResponse } from '@vercel/node';

interface HandoffBody {
    phone: string;
    duration: number;
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
          const body = req.body as HandoffBody;

      if (!body.phone || typeof body.phone !== 'string') {
              return res.status(400).json({ error: 'Missing required field: phone' });
      }

      if (!body.duration || typeof body.duration !== 'number') {
              return res.status(400).json({ error: 'Missing required field: duration' });
      }

      // Check if duration exceeds 10 minutes (600 seconds)
      if (body.duration > 600) {
              const accountSid = process.env.TWILIO_ACCOUNT_SID;
              const authToken = process.env.TWILIO_AUTH_TOKEN;
              const adminPhone = process.env.ADMIN_PHONE;

            if (!accountSid || !authToken || !adminPhone) {
                      console.warn('Twilio credentials not configured, skipping SMS alert');
                      return res.status(200).json({ success: true });
            }

            try {
                      // Send SMS via Twilio REST API
                const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
                      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

                const formData = new URLSearchParams();
                      formData.append('From', adminPhone); // Must be a Twilio phone number
                formData.append('To', adminPhone);
                      formData.append(
                                  'Body',
                                  `House of Help handoff: Caller ${body.phone} reached ${body.duration}s. Check for isolation or need human follow-up.`
                                );

                const smsResponse = await fetch(twilioUrl, {
                            method: 'POST',
                            headers: {
                                          'Authorization': `Basic ${auth}`,
                                          'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: formData.toString(),
                });

                if (!smsResponse.ok) {
                            console.error('Twilio API error:', await smsResponse.text());
                            return res.status(500).json({ error: 'Failed to send SMS alert' });
                }

                return res.status(200).json({ success: true });
            } catch (smsError) {
                      console.error('SMS send error:', smsError);
                      return res.status(500).json({ error: 'SMS alert failed' });
            }
      }

      // Duration under 10 minutes, no alert needed
      return res.status(200).json({ success: true });
    } catch (err) {
          console.error('Unexpected error:', err);
          return res.status(500).json({ error: 'Internal server error' });
    }
};
