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
    const { phoneNumber, type } = await req.json();
    
    const telnyxApiKey = Deno.env.get('TELNYX_API_KEY')!;
    const telnyxPhoneNumber = Deno.env.get('TELNYX_PHONE_NUMBER')!;
    const telnyxConnectionId = Deno.env.get('TELNYX_CONNECTION_ID')!;

    console.log('Initiating outbound call to:', phoneNumber);

    // Call Telnyx API to initiate call
    const response = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection_id: telnyxConnectionId,
        to: phoneNumber,
        from: telnyxPhoneNumber,
        record: 'record-from-answer',
        record_format: 'wav',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telnyx API error:', response.status, errorText);
      throw new Error(`Telnyx API error: ${response.status}`);
    }

    const callData = await response.json();
    console.log('Call initiated:', callData);

    // Log the call
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from('call_logs')
      .insert({
        telnyx_call_id: callData.data.call_control_id,
        direction: 'outbound',
        from_number: telnyxPhoneNumber,
        to_number: phoneNumber,
      });

    return new Response(JSON.stringify({ success: true, callId: callData.data.call_control_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in call-outbound:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
