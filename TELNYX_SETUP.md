# Telnyx Integration Setup Guide

## ✅ Completed Setup

Your MechAI Shop Assistant now has a complete Telnyx + Lovable AI integration:

### Backend Infrastructure
- ✅ **Lovable Cloud** enabled (PostgreSQL database)
- ✅ **Lovable AI** enabled (google/gemini-2.5-flash for diagnosis)
- ✅ **Secrets configured**: Telnyx API Key, Phone Number, Connection ID

### Database Schema
- ✅ **Jobs table**: Stores customer calls with diagnosis, photos, locations
- ✅ **Mechanics table**: Tracks available mechanics (3 sample mechanics added)
- ✅ **Call Logs table**: Records all inbound/outbound calls
- ✅ **Realtime enabled**: Live updates for job changes

### Edge Functions (Auto-deployed)
1. **telnyx-webhook**: Receives Telnyx events (calls, transcripts)
2. **ai-diagnosis**: Generates smart diagnosis using Lovable AI
3. **jobs-api**: CRUD operations for jobs
4. **mechanics-api**: Lists available mechanics
5. **call-outbound**: Initiates calls to customers/mechanics

### Frontend Updates
- ✅ **API client** updated to use Supabase
- ✅ **WebSocket** updated to use Supabase Realtime
- ✅ **Real-time updates** for job changes

---

## 🔧 Required: Telnyx Portal Configuration

You need to configure Telnyx webhooks to connect incoming calls to your backend:

### Step 1: Configure Webhook URL

1. Go to [Telnyx Portal → Webhooks](https://portal.telnyx.com/#/app/webhooks)
2. Click **"Add New Webhook"**
3. Set the webhook URL to:
   ```
   https://lzulavedhtmxwvadxxyv.supabase.co/functions/v1/telnyx-webhook
   ```
4. Enable the following events:
   - ✅ `call.initiated`
   - ✅ `call.answered`
   - ✅ `call.hangup`
   - ✅ `transcription.received`
5. Save the webhook

### Step 2: Configure Your Phone Number

1. Go to [Telnyx Portal → Numbers](https://portal.telnyx.com/#/app/numbers)
2. Find your number: **+1 417 200 9903**
3. Click **"Settings"** for that number
4. Under **"Inbound Voice"**, configure:
   - Connection: Select your connection (ID: `assistant-eecf188f-18c9-4ec7-a253-d08a90ad1738`)
   - Answering Rules: **"Answer immediately"**
   - Call Recording: **"Record from answer"**
   - Transcription: **"Enable real-time transcription"**
5. Save settings

### Step 3: Configure Call Control

1. Go to [Telnyx Portal → Call Control](https://portal.telnyx.com/#/app/call-control)
2. Select your connection
3. Configure the call flow:
   - When call connects, play greeting:
     ```
     "Thank you for calling. Please describe your vehicle issue in detail."
     ```
   - Enable streaming transcription
   - Stream audio to webhook endpoint

---

## 🧪 Testing the Integration

### Test Inbound Call Flow

1. **Call your Telnyx number**: +1 417 200 9903
2. **Speak clearly**: "Hi, my name is John. I have a 2018 Honda Civic. The engine is making a weird knocking sound."
3. **Check the dashboard**: A new job should appear immediately
4. **Wait for hangup**: After you hang up, AI diagnosis should generate within 5-10 seconds

### Expected Flow
```
Call Initiated
  ↓
Job Created (status: new)
  ↓
Transcription Streaming (real-time updates)
  ↓
Call Hangup
  ↓
AI Diagnosis Generated
  ↓
Job Updated (diagnosis added, severity set)
```

### Test Outbound Calls

1. Open a job in the dashboard
2. Click **"Call Customer"** button
3. Verify Telnyx initiates the call
4. Check that call log is created in backend

---

## 📊 Monitoring

### View Edge Function Logs
Go to Lovable → Cloud tab → Functions → Select function to see logs

### View Database
Go to Lovable → Cloud tab → Database to see:
- Jobs table (all customer calls)
- Mechanics table (available mechanics)
- Call logs (all inbound/outbound calls)

### Real-time Updates
Open the dashboard in two browser windows and watch real-time updates as calls come in.

---

## 🎯 What Happens When a Call Comes In

1. **Call Initiated** (Telnyx → Webhook)
   - New job created with `status: new`
   - Call log created with Telnyx call ID
   - Dashboard updates in real-time

2. **Call Answered** (Telnyx → Webhook)
   - Recording starts
   - Transcription begins streaming

3. **Transcription Updates** (Telnyx → Webhook)
   - Job's `transcript` field updates continuously
   - Customer name extracted from transcript
   - Symptoms extracted and stored

4. **Call Hangup** (Telnyx → Webhook)
   - Call duration recorded
   - AI diagnosis triggered automatically

5. **AI Analysis** (Auto-triggered)
   - Lovable AI analyzes transcript
   - Generates:
     - Probable issue
     - Severity level (low/medium/high)
     - Recommended tools
     - Estimated repair time
   - Job updated with diagnosis
   - Dashboard shows diagnosis instantly

---

## 🚀 Next Steps

### Add SMS Photo Upload
Allow customers to text photos of their vehicle:
1. Configure Telnyx SMS webhook
2. Create `sms-webhook` edge function
3. Store photos in Supabase Storage
4. Link photos to job records

### Add Location Sharing
Let customers share their location:
1. Send SMS with location link
2. Customer taps to share GPS coordinates
3. Display on map in job details

### Mechanic Dispatch
Automate mechanic assignment:
1. Find nearest available mechanic
2. Auto-assign based on distance and availability
3. Notify mechanic via SMS or call

---

## 🆘 Troubleshooting

### No jobs appearing after calls
- Check Telnyx webhook is configured correctly
- Verify webhook URL is accessible: `curl -X POST https://lzulavedhtmxwvadxxyv.supabase.co/functions/v1/telnyx-webhook`
- Check edge function logs for errors

### Transcription not updating
- Ensure Telnyx transcription is enabled on phone number
- Check webhook events include `transcription.received`
- Verify real-time database updates are enabled

### AI diagnosis not generating
- Check `ai-diagnosis` edge function logs
- Verify `LOVABLE_API_KEY` secret is set
- Ensure job has transcript before triggering

### Real-time updates not working
- Check browser console for WebSocket errors
- Verify Supabase Realtime is enabled for `jobs` table
- Try refreshing the page

---

## 📞 Support

- [Telnyx Documentation](https://developers.telnyx.com/)
- [Lovable Cloud Docs](https://docs.lovable.dev/features/cloud)
- [Lovable AI Docs](https://docs.lovable.dev/features/ai)
