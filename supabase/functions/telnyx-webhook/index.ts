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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Telnyx webhook received:', payload);

    const eventType = payload.data?.event_type;

    // Handle different Telnyx events
    switch (eventType) {
      case 'call.initiated':
        console.log('Call initiated:', payload.data.payload);
        const { from, to, call_control_id } = payload.data.payload;
        
        // Create new job
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .insert({
            customer_phone: from,
            status: 'new',
            severity: 'low',
          })
          .select()
          .single();

        if (jobError) {
          console.error('Error creating job:', jobError);
          throw jobError;
        }

        // Create call log
        await supabase
          .from('call_logs')
          .insert({
            job_id: job.id,
            telnyx_call_id: call_control_id,
            direction: 'inbound',
            from_number: from,
            to_number: to,
          });

        console.log('Job created:', job.id);
        break;

      case 'call.answered':
        console.log('Call answered:', payload.data.payload);
        break;

      case 'call.hangup':
        console.log('Call hangup:', payload.data.payload);
        const callId = payload.data.payload.call_control_id;
        
        // Find the job associated with this call
        const { data: callLog } = await supabase
          .from('call_logs')
          .select('job_id')
          .eq('telnyx_call_id', callId)
          .single();

        if (callLog) {
          // Get the job details
          const { data: job } = await supabase
            .from('jobs')
            .select('transcript')
            .eq('id', callLog.job_id)
            .single();

          // Trigger AI diagnosis if we have a transcript
          if (job?.transcript) {
            await fetch(`${supabaseUrl}/functions/v1/ai-diagnosis`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jobId: callLog.job_id,
                transcript: job.transcript,
              }),
            });
          }
        }
        break;

      case 'transcription.received':
        console.log('Transcription received:', payload.data.payload);
        const { call_control_id: transcriptCallId, transcript_text } = payload.data.payload;
        
        // Find and update the job with transcript
        const { data: transcriptCallLog } = await supabase
          .from('call_logs')
          .select('job_id')
          .eq('telnyx_call_id', transcriptCallId)
          .single();

        if (transcriptCallLog) {
          await supabase
            .from('jobs')
            .update({ 
              transcript: transcript_text,
              customer_name: extractNameFromTranscript(transcript_text),
              symptoms: extractSymptomsFromTranscript(transcript_text),
            })
            .eq('id', transcriptCallLog.job_id);
        }
        break;

      default:
        console.log('Unhandled event type:', eventType);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in telnyx-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractNameFromTranscript(transcript: string): string {
  // Simple extraction - looks for "my name is" or "I'm"
  const nameMatch = transcript.match(/(?:my name is|i'm|this is)\s+([a-z]+)/i);
  return nameMatch ? nameMatch[1] : 'Unknown';
}

function extractSymptomsFromTranscript(transcript: string): string {
  // Return the full transcript as symptoms for now
  // The AI will parse this properly
  return transcript;
}
