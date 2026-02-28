import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Twilio sends form-encoded body
    const text = await req.text();
    const params = new URLSearchParams(text);

    const from = params.get('From') || '';           // e.g. "whatsapp:+15551234567"
    const numMedia = parseInt(params.get('NumMedia') || '0');
    const messageBody = params.get('Body') || '';

    console.log('WhatsApp inbound from:', from, '| NumMedia:', numMedia, '| Body:', messageBody);

    // Strip "whatsapp:" prefix to get plain phone number
    const customerPhone = from.replace(/^whatsapp:/, '');

    if (!customerPhone) {
      return new Response('OK', { status: 200 });
    }

    // Find the most recent job for this customer's phone number
    const { data: jobs, error: jobError } = await supabase
      .from('jobs')
      .select('id, car_make, car_model, car_year')
      .eq('customer_phone', customerPhone)
      .order('created_at', { ascending: false })
      .limit(1);

    if (jobError || !jobs || jobs.length === 0) {
      console.log('No job found for phone:', customerPhone);
      // Reply asking them to call first
      await sendWhatsAppReply(
        accountSid, authToken,
        from,
        Deno.env.get('TWILIO_WHATSAPP_NUMBER')!,
        "We couldn't find an active job for your number. Please call us first to create a service request."
      );
      return new Response('OK', { status: 200 });
    }

    const job = jobs[0];
    const vehicleContext = `${job.car_year || ''} ${job.car_make || ''} ${job.car_model || ''}`.trim();

    console.log(`Matched job ${job.id} for phone ${customerPhone}`);

    if (numMedia === 0) {
      // Text message only — acknowledge
      console.log('No media in this message, acknowledging');
      await sendWhatsAppReply(
        accountSid, authToken,
        from,
        Deno.env.get('TWILIO_WHATSAPP_NUMBER')!,
        "Thanks! Please send a photo of your vehicle issue and our AI will analyze it for your mechanic. 📸"
      );
      return new Response('OK', { status: 200 });
    }

    // Process each media attachment
    const analysisResults: string[] = [];

    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = params.get(`MediaUrl${i}`);
      const contentType = params.get(`MediaContentType${i}`) || 'image/jpeg';

      if (!mediaUrl) continue;

      console.log(`Processing media ${i + 1}/${numMedia}: ${mediaUrl}`);

      try {
        // Download media from Twilio (requires auth)
        const mediaResponse = await fetch(mediaUrl, {
          headers: {
            'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          },
        });

        if (!mediaResponse.ok) {
          console.error('Failed to download media:', mediaResponse.status);
          continue;
        }

        const imageBytes = await mediaResponse.arrayBuffer();
        const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        const storagePath = `${job.id}/whatsapp-${Date.now()}-${i}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(storagePath, imageBytes, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('job-photos')
          .getPublicUrl(storagePath);

        const publicUrl = urlData.publicUrl;
        console.log('Uploaded to storage:', publicUrl);

        // Call Reka Vision via analyze-photo function
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-photo', {
          body: {
            jobId: job.id,
            imageUrl: publicUrl,
            vehicleContext: vehicleContext || undefined,
          },
        });

        if (analysisError) {
          console.error('Reka Vision error:', analysisError);
          continue;
        }

        console.log('Reka Vision analysis complete for media', i);
        analysisResults.push(analysisData.analysis);

      } catch (err) {
        console.error(`Error processing media ${i}:`, err);
      }
    }

    // Send confirmation back to customer on WhatsApp
    const replyText = analysisResults.length > 0
      ? `✅ Got your photo${numMedia > 1 ? 's' : ''}! Our AI has analyzed them and the report has been added to your job. A mechanic will be in touch shortly.`
      : `📷 Received your photo${numMedia > 1 ? 's' : ''}, but we had trouble analyzing them. Our team will review manually.`;

    await sendWhatsAppReply(
      accountSid, authToken,
      from,
      Deno.env.get('TWILIO_WHATSAPP_NUMBER')!,
      replyText
    );

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Error in whatsapp-webhook:', error);
    // Always return 200 to Twilio to prevent retries
    return new Response('OK', { status: 200 });
  }
});

async function sendWhatsAppReply(
  accountSid: string,
  authToken: string,
  to: string,
  from: string,
  body: string
): Promise<void> {
  const params = new URLSearchParams({ From: from, To: to, Body: body });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );
  if (!response.ok) {
    console.error('WhatsApp reply error:', response.status, await response.text());
  }
}
