import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function callLovableAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  tools: any[],
  toolName: string
): Promise<any> {
  const response = await fetch(AI_GATEWAY, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      tools,
      tool_choice: { type: 'function', function: { name: toolName } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error(`No tool call in AI response: ${JSON.stringify(data)}`);
  }
  return JSON.parse(toolCall.function.arguments);
}

async function fetchKnowledgeBaseContext(
  supabase: any,
  carMake: string,
  carModel: string,
  symptoms: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_knowledge_base')
      .select('verified_diagnosis, fix_description, parts_used, severity, upvotes, car_year, actual_time')
      .ilike('car_make', carMake)
      .ilike('car_model', carModel)
      .order('upvotes', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      console.log('No knowledge base matches found');
      return '';
    }

    console.log(`Found ${data.length} knowledge base entries for ${carMake} ${carModel}`);

    const entries = data.map((entry: any, i: number) =>
      `${i + 1}. [${entry.upvotes} upvotes${entry.car_year ? `, Year: ${entry.car_year}` : ''}] ${entry.verified_diagnosis}${entry.fix_description ? `\n   Fix: ${entry.fix_description}` : ''}${entry.actual_time ? `\n   Actual repair time: ${entry.actual_time}` : ''}${entry.parts_used?.length ? `\n   Parts used: ${entry.parts_used.map((p: any) => p.partName || p).join(', ')}` : ''}`
    ).join('\n\n');

    return `\n\nVERIFIED PAST DIAGNOSES FROM MECHANIC KNOWLEDGE BASE (use these as reference — they are real, mechanic-verified fixes for this make/model):\n${entries}`;
  } catch (err) {
    console.error('Error fetching knowledge base:', err);
    return '';
  }
}

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting AI diagnosis for job:', jobId);

    // Step 1: Extract customer and vehicle information from transcript
    console.log('Step 1: Extracting call info with gemini-2.5-flash...');
    const callInfo = await callLovableAI(
      lovableApiKey,
      'google/gemini-2.5-flash',
      'Extract customer and vehicle information from this call transcript. Be precise and extract exactly what was said.',
      transcript,
      [{
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
              locationAddress: { type: 'string', description: 'Customer location or address if mentioned' },
            },
            required: ['customerName', 'carMake', 'carModel', 'carYear', 'symptoms'],
            additionalProperties: false,
          },
        },
      }],
      'extract_call_info'
    );

    console.log('Extracted call info:', callInfo);

    // Step 1.5: Query knowledge base + corrections for RAG
    console.log('Step 1.5: Querying diagnostic knowledge base and corrections...');
    const [knowledgeBaseContext, correctionsContext] = await Promise.all([
      fetchKnowledgeBaseContext(supabase, callInfo.carMake, callInfo.carModel, callInfo.symptoms),
      fetchCorrectionsContext(supabase, callInfo.carMake, callInfo.carModel),
    ]);


    // Step 2: Get AI diagnosis with gemini-2.5-pro for best reasoning
    console.log('Step 2: Running AI diagnosis with gemini-2.5-pro...');
    const diagnosis = await callLovableAI(
      lovableApiKey,
      'google/gemini-2.5-pro',
      `You are an expert master automotive diagnostic technician with 20+ years of experience across all makes and models.

CRITICAL INSTRUCTIONS:
1. Consider this SPECIFIC vehicle's known issues, recalls, TSBs (Technical Service Bulletins), and common failure patterns
2. Reference make/model-specific components and known problems where relevant
3. Provide detailed root cause analysis, not just symptoms
4. Include step-by-step diagnostic procedures specific to this vehicle
5. Consider parts availability and estimated costs for this specific make/model
6. Identify safety concerns specific to this repair on this vehicle
7. Provide alternative diagnoses with probability assessments
8. Include preventive measures specific to this vehicle

If vehicle details are unavailable (N/A), still provide thorough symptom-based analysis but note the limitation.

If VERIFIED PAST DIAGNOSES are provided below, strongly consider them as they come from real mechanic experience with this exact make/model. Weight them higher than generic knowledge, especially entries with many upvotes.

Provide comprehensive, actionable diagnostic information that will help mechanics work efficiently and safely.`,
      `VEHICLE CONTEXT:
- Make: ${callInfo.carMake}
- Model: ${callInfo.carModel}
- Year: ${callInfo.carYear}

SYMPTOMS: ${callInfo.symptoms}${knowledgeBaseContext}${correctionsContext}

Provide a comprehensive diagnostic analysis for this specific vehicle.`,
      [{
        type: 'function',
        function: {
          name: 'provide_diagnosis',
          description: 'Provide comprehensive automotive diagnosis with vehicle-specific analysis',
          parameters: {
            type: 'object',
            properties: {
              issue: { type: 'string', description: 'Detailed description of the probable issue (3-5 sentences with technical detail)' },
              rootCause: { type: 'string', description: 'Deep analysis of why this is happening' },
              makeModelSpecifics: { type: 'string', description: 'Known issues, recalls, TSBs specific to this make/model/year' },
              severity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Severity level' },
              confidenceLevel: { type: 'number', description: 'Confidence 0-100' },
              diagnosticSteps: { type: 'array', items: { type: 'string' }, description: 'Step-by-step diagnostic procedure' },
              recommendedTools: { type: 'array', items: { type: 'string' }, description: 'Tools needed' },
              estimatedTime: { type: 'string', description: 'Time estimate (e.g., "3-5 hours")' },
              requiredParts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    partName: { type: 'string' },
                    estimatedCost: { type: 'string' },
                    isCommon: { type: 'boolean' },
                  },
                  required: ['partName', 'estimatedCost', 'isCommon'],
                  additionalProperties: false,
                },
              },
              commonIssuesForModel: { type: 'array', items: { type: 'string' } },
              safetyWarnings: { type: 'array', items: { type: 'string' } },
              alternativeDiagnoses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    issue: { type: 'string' },
                    probability: { type: 'string', enum: ['low', 'medium', 'high'] },
                    distinguishingFactors: { type: 'string' },
                  },
                  required: ['issue', 'probability', 'distinguishingFactors'],
                  additionalProperties: false,
                },
              },
              preventiveMeasures: { type: 'array', items: { type: 'string' } },
              mechanicNotes: { type: 'string' },
            },
            required: [
              'issue', 'rootCause', 'makeModelSpecifics', 'severity', 'confidenceLevel',
              'diagnosticSteps', 'recommendedTools', 'estimatedTime', 'requiredParts',
              'commonIssuesForModel', 'safetyWarnings', 'alternativeDiagnoses',
              'preventiveMeasures', 'mechanicNotes',
            ],
            additionalProperties: false,
          },
        },
      }],
      'provide_diagnosis'
    );

    console.log('Parsed diagnosis, severity:', diagnosis.severity);

    // Step 3: Update job with all extracted information
    const updateData: any = {
      customer_name: callInfo.customerName,
      car_make: callInfo.carMake,
      car_model: callInfo.carModel,
      car_year: callInfo.carYear,
      symptoms: callInfo.symptoms,
      diagnosis: diagnosis,
      severity: diagnosis.severity,
    };

    if (callInfo.locationAddress) {
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

    // Trigger parts search asynchronously
    if (diagnosis.requiredParts && diagnosis.requiredParts.length > 0) {
      console.log('Triggering parts search for', diagnosis.requiredParts.length, 'parts');
      supabase.functions.invoke('search-parts', {
        body: {
          jobId: jobId,
          vehicleInfo: {
            year: callInfo.carYear,
            make: callInfo.carMake,
            model: callInfo.carModel,
          },
          parts: diagnosis.requiredParts,
        }
      }).catch(error => {
        console.error('Error invoking search-parts:', error);
      });
    }

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
