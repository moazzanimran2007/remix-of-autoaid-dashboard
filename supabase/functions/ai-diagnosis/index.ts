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
    const { jobId, transcript } = await req.json();
    
    if (!jobId || !transcript) {
      throw new Error('jobId and transcript are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting AI diagnosis for job:', jobId);

    // Step 1: Extract customer and vehicle information from transcript
    const infoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Extract customer and vehicle information from this call transcript. Be precise and extract exactly what was said.`
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_call_info',
              description: 'Extract structured information from the call transcript',
              parameters: {
                type: 'object',
                properties: {
                  customerName: { type: 'string', description: 'Customer full name' },
                  carMake: { type: 'string', description: 'Vehicle manufacturer/brand (e.g., Toyota, Ford)' },
                  carModel: { type: 'string', description: 'Vehicle model (e.g., Camry, F-150)' },
                  carYear: { type: 'string', description: 'Vehicle year (e.g., 2018, 2020)' },
                  symptoms: { type: 'string', description: 'Clear summary of the vehicle problem described' },
                  locationAddress: { type: 'string', description: 'Customer location or address if mentioned' }
                },
                required: ['customerName', 'carMake', 'carModel', 'carYear', 'symptoms'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_call_info' } }
      }),
    });

    if (!infoResponse.ok) {
      const errorText = await infoResponse.text();
      console.error('Info extraction API error:', infoResponse.status, errorText);
      throw new Error(`Info extraction API error: ${infoResponse.status}`);
    }

    const infoData = await infoResponse.json();
    console.log('Info extraction response:', infoData);

    const infoToolCall = infoData.choices?.[0]?.message?.tool_calls?.[0];
    if (!infoToolCall) {
      throw new Error('No tool call in info extraction response');
    }

    const callInfo = JSON.parse(infoToolCall.function.arguments);
    console.log('Extracted call info:', callInfo);

    // Step 2: Get AI diagnosis
    const diagnosisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert automotive diagnostic assistant. Based on the customer's description, provide:
1) probable issue (brief, 1-2 sentences)
2) severity (low, medium, or high)
3) recommended tools (array of tool names)
4) estimated repair time (e.g., "30 minutes", "2-3 hours")

Be concise and practical. Focus on the most likely issue.`
          },
          {
            role: 'user',
            content: `Vehicle: ${callInfo.carYear} ${callInfo.carMake} ${callInfo.carModel}\nSymptoms: ${callInfo.symptoms}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_diagnosis',
              description: 'Provide automotive diagnosis based on customer description',
              parameters: {
                type: 'object',
                properties: {
                  issue: { type: 'string', description: 'The probable issue (1-2 sentences)' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  recommendedTools: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'List of recommended tools'
                  },
                  estimatedTime: { type: 'string', description: 'Estimated repair time' }
                },
                required: ['issue', 'severity', 'recommendedTools', 'estimatedTime'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'provide_diagnosis' } }
      }),
    });

    if (!diagnosisResponse.ok) {
      const errorText = await diagnosisResponse.text();
      console.error('Diagnosis API error:', diagnosisResponse.status, errorText);
      throw new Error(`Diagnosis API error: ${diagnosisResponse.status}`);
    }

    const diagnosisData = await diagnosisResponse.json();
    console.log('Diagnosis response:', diagnosisData);

    const diagnosisToolCall = diagnosisData.choices?.[0]?.message?.tool_calls?.[0];
    if (!diagnosisToolCall) {
      throw new Error('No tool call in diagnosis response');
    }

    const diagnosis = JSON.parse(diagnosisToolCall.function.arguments);
    console.log('Parsed diagnosis:', diagnosis);

    // Step 3: Update job with all extracted information
    const updateData: any = {
      customer_name: callInfo.customerName,
      car_make: callInfo.carMake,
      car_model: callInfo.carModel,
      car_year: callInfo.carYear,
      symptoms: callInfo.symptoms,
      diagnosis: {
        issue: diagnosis.issue,
        recommendedTools: diagnosis.recommendedTools,
        estimatedTime: diagnosis.estimatedTime,
      },
      severity: diagnosis.severity,
    };

    // Add location if provided
    if (callInfo.locationAddress) {
      // For now, just store as part of symptoms or a note
      // In the future, we could geocode this to lat/lng
      updateData.symptoms = `${callInfo.symptoms}\n\nLocation: ${callInfo.locationAddress}`;
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job:', updateError);
      throw updateError;
    }

    console.log('Job updated with diagnosis');

    return new Response(JSON.stringify({ success: true, diagnosis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-diagnosis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
