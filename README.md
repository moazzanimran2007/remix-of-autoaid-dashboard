# MechAI

A dashboard for auto repair shops that turns customer phone calls into job cards. An AI voice agent answers the call, and the dashboard receives the transcript, pulls out the car and the problem, suggests a likely diagnosis, and puts the job in front of the shop in real time.

## What it does

- **Calls become jobs.** When a call with the shop's Vapi voice agent ends, a webhook receives the transcript and creates a job card with the customer's phone number, the car and the problem described.
- **WhatsApp too.** Customers can also reach the shop by WhatsApp through Twilio.
- **Suggests a diagnosis.** For each new job, an AI step proposes the likely issue, root cause, severity and repair time. It draws on the shop's own knowledge base of verified past fixes and on mechanics' corrections to earlier diagnoses.
- **Reads photos.** A mechanic can upload a photo of the problem for a visual inspection by a vision model.
- **Finds parts.** It searches the web for parts suppliers and pulls out the useful details.
- **Live jobs board.** New jobs appear as they come in, with status and severity tags, the call transcript and a notification.
- **Mechanics directory** with locations on a map, a shop knowledge base, an in-app chat assistant, and team management for shops with several staff. Each shop's data is kept separate.

## How it works

| Piece | Job |
| :--- | :--- |
| `vapi-webhook` | Receives the end-of-call report from Vapi, extracts the details and creates the job |
| `whatsapp-webhook` | Receives WhatsApp messages from Twilio |
| `ai-diagnosis` | Proposes a diagnosis using the knowledge base and past corrections |
| `analyze-photo` | Inspects an uploaded photo with Google Gemini 2.5 Pro |
| `search-parts` | Searches for parts suppliers with Tavily and summarizes the results |
| `jobs-api`, `mechanics-api` | Read and update jobs and mechanics |

These are Supabase Edge Functions. AI calls go through the Lovable AI Gateway. The front end is React and listens for new jobs in real time through Supabase. [`VAPI_SETUP.md`](VAPI_SETUP.md) explains how to point a Vapi assistant at the webhook.

## Run it

You need Node.js 18 or newer.

```bash
git clone https://github.com/moazzanimran2007/remix-of-autoaid-dashboard.git
cd remix-of-autoaid-dashboard
npm install
npm run dev
```

The front end connects to the Supabase project named in `.env`. To run your own backend, create a Supabase project, apply the migrations in `supabase/migrations`, deploy the functions in `supabase/functions` and set these function secrets: `LOVABLE_API_KEY`, `TAVILY_API_KEY`, and `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_WHATSAPP_NUMBER` for WhatsApp.

## Tech stack

React and TypeScript on Vite, Tailwind CSS with shadcn/ui, Supabase (Auth, Postgres, Realtime and Edge Functions), Vapi for the voice agent, Twilio for WhatsApp, Tavily for web search, Google Gemini models and a Toolhouse agent for chat. Built with Lovable.

## Status

This is a demo build. The phone and WhatsApp flows need your own Vapi and Twilio accounts, and AI diagnoses are suggestions for a mechanic to confirm.
