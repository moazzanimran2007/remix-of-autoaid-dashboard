import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendWhatsAppPhotoRequest(
  customerPhone: string,
  customerName: string,
  jobId: string
): Promise<void> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio credentials not set, skipping WhatsApp message');
    return;
  }

  const toNumber = `whatsapp:${customerPhone}`;
  const name = customerName || 'there';
  const body = `Hi ${name}! 👋 Thanks for calling AutoAid. To help our mechanic diagnose your vehicle faster, please reply to this message with one or more photos of the issue. Our AI will analyze them instantly.`;

  const params = new URLSearchParams({
    From: fromNumber,
    To: toNumber,
    Body: body,
  });

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
    const err = await response.text();
    console.error('Twilio WhatsApp send error:', response.status, err);
  } else {
    console.log(`WhatsApp photo request sent to ${customerPhone}`);
  }
}

async function checkToxicityWithModulate(
  transcript: string,
  sessionId: string
): Promise<{ flagged: boolean; reason: string | null }> {
  const modulateApiKey = Deno.env.get('MODULATE_API_KEY');
  if (!modulateApiKey) {
    console.warn('MODULATE_API_KEY not set, skipping toxicity check');
    return { flagged: false, reason: null };
  }

  try {
    const response = await fetch('https://api.modulate.ai/v1/analyze', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${modulateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        transcript: transcript,
        context: 'automotive_service_call',
      }),
    });

    if (!response.ok) {
      console.error('Modulate API error:', response.status, await response.text());
      return { flagged: false, reason: null };
    }

    const result = await response.json();
    console.log('Modulate toxicity result:', JSON.stringify(result));

    // Modulate returns a flagged boolean and a reason/category
    const flagged = result.flagged === true || result.toxic === true;
    const reason = result.reason || result.category || result.label || null;

    return { flagged, reason };
  } catch (err) {
    console.error('Error calling Modulate API:', err);
    return { flagged: false, reason: null };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('Vapi webhook received:', JSON.stringify(body, null, 2));

    const { message } = body;
    
    // Only process end-of-call-report events
    if (message?.type !== 'end-of-call-report') {
      console.log('Ignoring non-end-of-call-report event:', message?.type);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract call data
    const transcript = message.artifact?.transcript || '';
    const customerPhone = message.call?.customer?.number || null;

    if (!transcript) {
      throw new Error('No transcript found in webhook');
    }

    console.log('Processing call transcript for phone:', customerPhone);

    // Create initial job record with minimal data
    // AI diagnosis will extract all details from transcript
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        customer_phone: customerPhone,
        transcript: transcript,
        status: 'new',
        severity: 'low',
        symptoms: 'Analyzing call transcript...',
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    console.log('Job created:', job.id);

    // Send WhatsApp photo request to customer (fire and forget)
    if (customerPhone) {
      sendWhatsAppPhotoRequest(customerPhone, '', job.id)
        .catch(err => console.error('WhatsApp send error (non-fatal):', err));
    }

    // Run Modulate toxicity check asynchronously and update job
    checkToxicityWithModulate(transcript, job.id).then(async ({ flagged, reason }) => {
      if (flagged) {
        console.log(`Modulate flagged job ${job.id} for toxicity: ${reason}`);
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ toxicity_flag: true, toxicity_reason: reason })
          .eq('id', job.id);
        if (updateError) {
          console.error('Error updating toxicity flag:', updateError);
        }
      } else {
        console.log(`Modulate: job ${job.id} passed toxicity check`);
      }
    });

    // Trigger AI diagnosis asynchronously (fire and forget)
    supabase.functions.invoke('ai-diagnosis', {
      body: {
        jobId: job.id,
        transcript: transcript,
      }
    }).then(({ data, error }) => {
      if (error) {
        console.error('Error calling AI diagnosis:', error);
      } else {
        console.log('AI diagnosis completed:', data);
      }
    });

    return new Response(
      JSON.stringify({ success: true, jobId: job.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing Vapi webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
