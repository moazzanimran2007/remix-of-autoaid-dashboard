import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create AGI session
async function createAGISession(apiKey: string): Promise<string> {
  const response = await fetch('https://api.agi.tech/v1/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_name: 'agi-0'
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create AGI session: ${response.status}`);
  }

  const data = await response.json();
  return data.session_id;
}

// Helper function to send message to AGI session
async function sendAGIMessage(apiKey: string, sessionId: string, message: string): Promise<void> {
  const response = await fetch(`https://api.agi.tech/v1/sessions/${sessionId}/message`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send AGI message: ${response.status}`);
  }
}

// Helper function to poll for AGI messages
async function pollAGIMessages(apiKey: string, sessionId: string, maxAttempts = 30): Promise<any[]> {
  let afterId = 0;
  let attempts = 0;
  const messages: any[] = [];

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
    
    const response = await fetch(`https://api.agi.tech/v1/sessions/${sessionId}/messages?after_id=${afterId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll AGI messages: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.messages && data.messages.length > 0) {
      messages.push(...data.messages);
      afterId = data.messages[data.messages.length - 1].id;
      
      // Check if task is complete (look for assistant messages with results)
      const hasResult = data.messages.some((msg: any) => 
        msg.role === 'assistant' && msg.content && msg.content.length > 100
      );
      
      if (hasResult) {
        break;
      }
    }
    
    attempts++;
  }

  return messages;
}

// Helper function to delete AGI session
async function deleteAGISession(apiKey: string, sessionId: string): Promise<void> {
  try {
    await fetch(`https://api.agi.tech/v1/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    console.error('Error deleting AGI session:', error);
  }
}

// Helper function to extract suppliers from AGI messages
function extractSuppliersFromMessages(messages: any[]): any[] {
  for (const msg of messages.reverse()) {
    if (msg.role === 'assistant' && msg.content) {
      try {
        // Try to find JSON in the message content
        const jsonMatch = msg.content.match(/\{[\s\S]*"suppliers"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.suppliers || [];
        }
      } catch (e) {
        // Continue to next message
      }
    }
  }
  return [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, vehicleInfo, parts } = await req.json();
    
    if (!jobId || !vehicleInfo || !parts || !Array.isArray(parts)) {
      throw new Error('jobId, vehicleInfo, and parts array are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const agiApiKey = Deno.env.get('AGI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting parts search for job:', jobId);
    console.log('Vehicle:', vehicleInfo);
    console.log('Parts to search:', parts);

    const vehicleString = `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`;
    const searchResults = [];

    // Search for each part using AGI browser automation
    for (const part of parts) {
      console.log(`Searching for part: ${part.partName}`);
      
      let sessionId: string | null = null;
      
      try {
        // Create AGI session
        sessionId = await createAGISession(agiApiKey);
        console.log(`Created AGI session: ${sessionId}`);

        // Send search task
        const searchTask = `Find real automotive parts for ${vehicleString} ${part.partName}. 

Search major suppliers (RockAuto, AutoZone, O'Reilly, eBay Motors, Amazon) and find:
1. Supplier name
2. Part number
3. Exact price in USD
4. Direct purchase link
5. In-stock status
6. Shipping information

Return the top 3 best options sorted by price. Verify vehicle compatibility for ${vehicleString}.

Format your response as JSON:
{
  "suppliers": [
    {
      "supplierName": "string",
      "partNumber": "string",
      "price": number,
      "currency": "USD",
      "purchaseLink": "string",
      "inStock": boolean,
      "shipping": "string"
    }
  ]
}`;

        await sendAGIMessage(agiApiKey, sessionId, searchTask);
        console.log(`Sent search task for ${part.partName}`);

        // Poll for results
        const messages = await pollAGIMessages(agiApiKey, sessionId);
        console.log(`Received ${messages.length} messages for ${part.partName}`);

        // Extract suppliers from messages
        const suppliers = extractSuppliersFromMessages(messages);

        searchResults.push({
          partName: part.partName,
          suppliers: suppliers.slice(0, 3),
          searchedAt: new Date().toISOString()
        });

        // Clean up session
        if (sessionId) {
          await deleteAGISession(agiApiKey, sessionId);
        }

      } catch (error) {
        console.error(`Error searching for ${part.partName}:`, error);
        
        // Clean up session on error
        if (sessionId) {
          await deleteAGISession(agiApiKey, sessionId);
        }
        
        searchResults.push({
          partName: part.partName,
          suppliers: [],
          searchedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Store results in database
    const partsSearchData = {
      results: searchResults,
      lastUpdated: new Date().toISOString(),
      vehicleSearched: vehicleString
    };

    const { error: updateError } = await supabase
      .from('jobs')
      .update({ parts_search_results: partsSearchData })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job with parts search results:', updateError);
      throw updateError;
    }

    console.log('Parts search completed and stored for job:', jobId);

    return new Response(JSON.stringify({ 
      success: true, 
      searchResults,
      vehicleSearched: vehicleString 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in search-parts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});