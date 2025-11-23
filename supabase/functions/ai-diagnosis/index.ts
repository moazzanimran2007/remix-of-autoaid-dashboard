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
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are an expert master automotive diagnostic technician with 20+ years of experience across all makes and models.

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

Provide comprehensive, actionable diagnostic information that will help mechanics work efficiently and safely.`
          },
          {
            role: 'user',
            content: `VEHICLE CONTEXT:
- Make: ${callInfo.carMake}
- Model: ${callInfo.carModel}
- Year: ${callInfo.carYear}

SYMPTOMS: ${callInfo.symptoms}

Provide a comprehensive diagnostic analysis for this specific vehicle.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_diagnosis',
              description: 'Provide comprehensive automotive diagnosis with vehicle-specific analysis',
              parameters: {
                type: 'object',
                properties: {
                  issue: { 
                    type: 'string', 
                    description: 'Detailed description of the probable issue (3-5 sentences with technical detail)' 
                  },
                  rootCause: { 
                    type: 'string', 
                    description: 'Deep analysis of why this is happening, considering physics, mechanics, and failure modes' 
                  },
                  makeModelSpecifics: { 
                    type: 'string', 
                    description: 'Known issues, recalls, TSBs, and common problems specific to this exact make/model/year. If N/A, state "Vehicle-specific details unavailable"' 
                  },
                  severity: { 
                    type: 'string', 
                    enum: ['low', 'medium', 'high'],
                    description: 'Severity level of the issue' 
                  },
                  confidenceLevel: { 
                    type: 'number', 
                    description: 'Confidence in this diagnosis from 0-100' 
                  },
                  diagnosticSteps: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'Detailed step-by-step diagnostic procedure specific to this vehicle and issue'
                  },
                  recommendedTools: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'Complete list of tools needed for diagnosis and repair'
                  },
                  estimatedTime: { 
                    type: 'string', 
                    description: 'Realistic time estimate for diagnosis and repair (e.g., "3-5 hours")' 
                  },
                  requiredParts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        partName: { type: 'string' },
                        estimatedCost: { type: 'string' },
                        isCommon: { type: 'boolean', description: 'Whether this part is commonly available' }
                      },
                      required: ['partName', 'estimatedCost', 'isCommon']
                    },
                    description: 'List of parts likely needed with cost estimates'
                  },
                  commonIssuesForModel: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Historical common problems for this specific make/model/year'
                  },
                  safetyWarnings: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Any safety concerns or precautions specific to this repair'
                  },
                  alternativeDiagnoses: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        issue: { type: 'string' },
                        probability: { type: 'string', enum: ['low', 'medium', 'high'] },
                        distinguishingFactors: { type: 'string' }
                      },
                      required: ['issue', 'probability', 'distinguishingFactors']
                    },
                    description: 'Alternative possible diagnoses with probability assessment'
                  },
                  preventiveMeasures: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'How to prevent this issue in the future, specific to this vehicle'
                  },
                  mechanicNotes: { 
                    type: 'string', 
                    description: 'Special considerations, tips, or warnings for the mechanic performing this repair' 
                  }
                },
                required: [
                  'issue', 'rootCause', 'makeModelSpecifics', 'severity', 'confidenceLevel',
                  'diagnosticSteps', 'recommendedTools', 'estimatedTime', 'requiredParts',
                  'commonIssuesForModel', 'safetyWarnings', 'alternativeDiagnoses', 
                  'preventiveMeasures', 'mechanicNotes'
                ],
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
      diagnosis: diagnosis, // Store the complete enhanced diagnosis
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
