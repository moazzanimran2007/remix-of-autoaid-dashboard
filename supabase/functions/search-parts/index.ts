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

    // Search for each part
    for (const part of parts) {
      console.log(`Searching for part: ${part.partName}`);
      
      const searchQuery = `${vehicleString} ${part.partName} buy online price`;
      
      try {
        // Call AGI API to search for parts
        const response = await fetch('https://api.agi.tech/v1/agent/run', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `Find real automotive parts for: ${searchQuery}
            
Search major suppliers (RockAuto, AutoZone, O'Reilly, eBay Motors, Amazon) and extract:
1. Supplier name
2. Part number
3. Exact price (numerical value in USD)
4. Direct purchase link
5. In-stock status
6. Shipping information

Return up to 3 best options sorted by price. Verify vehicle compatibility for ${vehicleString}.

Return results in this exact JSON format:
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
}`,
            stream: false
          }),
        });

        if (!response.ok) {
          console.error(`AGI API error for ${part.partName}:`, response.status);
          searchResults.push({
            partName: part.partName,
            suppliers: [],
            searchedAt: new Date().toISOString(),
            error: 'Search failed'
          });
          continue;
        }

        const agiData = await response.json();
        console.log(`AGI response for ${part.partName}:`, agiData);

        // Parse AGI response - adjust based on actual API response format
        let suppliers = [];
        try {
          // Try to extract JSON from AGI response
          const responseText = agiData.result || agiData.output || agiData.response || '';
          
          // Try to find JSON in the response
          const jsonMatch = responseText.match(/\{[\s\S]*"suppliers"[\s\S]*\}/);
          if (jsonMatch) {
            const parsedResult = JSON.parse(jsonMatch[0]);
            suppliers = parsedResult.suppliers || [];
          } else if (agiData.suppliers) {
            suppliers = agiData.suppliers;
          }
        } catch (parseError) {
          console.error(`Failed to parse AGI response for ${part.partName}:`, parseError);
        }

        searchResults.push({
          partName: part.partName,
          suppliers: suppliers.slice(0, 3), // Limit to 3 suppliers
          searchedAt: new Date().toISOString()
        });

      } catch (error) {
        console.error(`Error searching for ${part.partName}:`, error);
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