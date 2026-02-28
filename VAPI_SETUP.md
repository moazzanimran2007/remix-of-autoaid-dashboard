# Vapi Integration Setup Guide

This guide will help you configure Vapi to send call transcripts to your Lovable backend.

## Overview

When a customer calls your Vapi AI voice agent, the system will:
1. Receive the call transcript via Vapi webhook
2. Use AI to analyze the transcript and extract car details and problem description
3. Create a job card in the Jobs Dashboard
4. Update in real-time via WebSocket

## Step 1: Configure Vapi Webhook

1. Go to your [Vapi Dashboard](https://dashboard.vapi.ai/assistants)
2. Open assistant **`51fd787c-3f35-4b21-ac9e-e477f754cd65`**
3. Navigate to the **Advanced** tab
4. Set the **Server URL** to:
   ```
   https://fvcafjsjpludpqduyacv.supabase.co/functions/v1/vapi-webhook
   ```

## Step 2: Configure Server Messages

Make sure your assistant is configured to send the `end-of-call-report` message:

1. In your assistant settings, ensure **Server Messages** includes:
   ```json
   {
     "serverMessages": ["end-of-call-report"]
   }
   ```

2. Alternatively, if configuring via API:
   ```json
   {
     "assistant": {
       "serverUrl": "https://fvcafjsjpludpqduyacv.supabase.co/functions/v1/vapi-webhook",
       "serverMessages": ["end-of-call-report"]
     }
   }
   ```

## Step 3: Test the Integration

### Manual Test

1. Make a test call to your Vapi phone number
2. Describe a car problem (e.g., "My 2020 Honda Civic is making a strange noise when I brake")
3. After the call ends, check your Jobs Dashboard
4. You should see a new job card appear with:
   - Customer name and phone number
   - Call transcript
   - AI-generated diagnosis (appears after a few seconds)
   - Extracted car details (make, model, year)
   - Problem severity (low/medium/high)

### Webhook Payload Structure

The webhook receives this payload from Vapi:

```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "customer": {
        "number": "+1234567890",
        "name": "John Doe"
      }
    },
    "artifact": {
      "transcript": "AI: How can I help? User: My car is making noise...",
      "messages": [
        { "role": "assistant", "message": "How can I help?" },
        { "role": "user", "message": "My car is making noise..." }
      ]
    }
  }
}
```

## Step 4: Monitor and Debug

### Check Edge Function Logs

To view logs and debug issues:
1. Go to your Lovable project
2. Open the backend (Cloud) interface
3. Navigate to Edge Functions → vapi-webhook
4. Check the logs for incoming webhooks and any errors

### Common Issues

**Issue: Jobs not appearing in dashboard**
- Check that the webhook URL is correct
- Verify `end-of-call-report` is in serverMessages
- Check edge function logs for errors

**Issue: Missing customer information**
- Ensure Vapi is capturing customer name/number during the call
- Check the webhook payload in the logs

**Issue: AI diagnosis not appearing**
- The diagnosis may take 5-10 seconds to process
- Check the ai-diagnosis edge function logs
- Verify LOVABLE_API_KEY is configured

## Step 5: Customize AI Prompts (Optional)

To customize how the AI analyzes transcripts, edit the `ai-diagnosis` edge function:

1. Open `supabase/functions/ai-diagnosis/index.ts`
2. Modify the `systemPrompt` to adjust what information to extract
3. Update the tool schema if you want to capture different fields

## Next Steps

Once the integration is working:
- [ ] Configure Vapi to collect additional customer information (name, contact details)
- [ ] Set up SMS for photo uploads (if needed)
- [ ] Configure mechanic dispatch notifications
- [ ] Add location sharing capabilities
- [ ] Customize the AI diagnosis prompts for your specific use case

## Architecture Overview

```
Customer Call
    ↓
Vapi AI Agent
    ↓
End-of-call webhook → vapi-webhook edge function
    ↓
Create job record in database
    ↓
Trigger AI analysis (ai-diagnosis)
    ↓
Update job with diagnosis
    ↓
Real-time update via Supabase Realtime
    ↓
Jobs Dashboard updates automatically
```

## Support

For issues or questions:
- Check edge function logs in the Lovable backend interface
- Review the Vapi documentation: https://docs.vapi.ai
- Test webhooks using tools like webhook.site
