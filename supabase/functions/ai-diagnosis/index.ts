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

    // Call Lovable AI for diagnosis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: transcript
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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);

    // Extract diagnosis from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const diagnosis = JSON.parse(toolCall.function.arguments);
    console.log('Parsed diagnosis:', diagnosis);

    // Update job with diagnosis
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        diagnosis: {
          issue: diagnosis.issue,
          recommendedTools: diagnosis.recommendedTools,
          estimatedTime: diagnosis.estimatedTime,
        },
        severity: diagnosis.severity,
      })
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
