# FroshFunds — Personal Finance Assistant

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](https://financial-assistant-nine.vercel.app)

![FroshFunds Screenshot](./screenshot.png)

> **Live Demo:** [financial-assistant-nine.vercel.app](https://financial-assistant-nine.vercel.app)

---

## What this does

FroshFunds is a web app for managing your personal finances. You can import bank statements via CSV, view spending dashboards with charts, and get AI-powered insights and suggestions to understand where your money goes and how to improve your habits.

---

## Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** ShadCN/UI + Tailwind CSS
- **API:** tRPC
- **Database:** Supabase (PostgreSQL + Auth)
- **AI:** OpenAI gpt-4o-mini
- **Charts:** Recharts

## Prerequisites

1. A [Supabase](https://supabase.com) account
2. An [OpenAI](https://platform.openai.com/api-keys) API key

## Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local` with your credentials:
   - **NEXT_PUBLIC_SUPABASE_URL** and **NEXT_PUBLIC_SUPABASE_ANON_KEY** — Supabase Dashboard > Settings > API
   - **SUPABASE_SERVICE_ROLE_KEY** — Supabase Dashboard > Settings > API (service_role key)
   - **OPENAI_API_KEY** — platform.openai.com > API keys

4. Run migrations on Supabase (via CLI):
   ```bash
   # Log in (opens browser)
   supabase login

   # Link to your project (use the project ref from the URL: https://<PROJECT_REF>.supabase.co)
   supabase link --project-ref <YOUR_PROJECT_REF>

   # Push migrations to create tables
   supabase db push
   ```
   Or manually: Supabase Dashboard > SQL Editor > paste the contents of `supabase/migrations/20240307120000_initial_schema.sql` > Run

5. Ensure the email provider is enabled:
   - Supabase Dashboard > Authentication > Providers > Email

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Connect the repository to Vercel
2. Configure environment variables
3. Deploy

## CSV format (transactions)

```
Date,Description,Amount
2024-01-15,iFood,-45.90
2024-01-14,Salary,5000.00
```

## License

MIT
