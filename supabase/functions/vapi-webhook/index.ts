import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Create initial job record
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
