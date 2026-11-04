# Project Neo

Project Neo is a React and TypeScript app for exploring hypothetical scenarios and sharing community answers.

## Run locally

```sh
npm install
npm run dev
```

Without Supabase settings, answers, likes, and created scenarios are stored in this browser only.

## Connect Supabase

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project's Connect dialog.
3. Run `supabase/migrations/20261104000000_initial_schema.sql` in the Supabase SQL Editor.
4. Set the Auth site URL and allowed redirect URL to your app URL. For local development, use `http://localhost:5173`.
5. Run `npm install` to install the Supabase client, then restart the Vite dev server.

The app uses email sign-in links. Signed-in users can submit answers and like answers. Scenario submissions are saved as `pending`; publish or reject them by changing `scenarios.status` in the Supabase dashboard. Row-level security policies restrict writes to signed-in users and their own records.

Never put a Supabase secret or service-role key in a `VITE_` variable. Browser apps should use the publishable key with row-level security enabled. See the [Supabase React quickstart](https://supabase.com/docs/guides/auth/quickstarts/react) and [row-level security guide](https://supabase.com/docs/guides/database/postgres/row-level-security).
