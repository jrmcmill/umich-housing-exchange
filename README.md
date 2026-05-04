# UMich Subleases

A GitHub Pages-friendly, student-first sublease marketplace for Ann Arbor.

## What is included

- Mobile-first listings directory
- Search, filters, and sorting
- Shareable listing detail routes
- Account-gated publishing flow
- React + Vite UI architecture
- Supabase auth + database for listings
- Maize and blue visual system using the official U-M palette
- Static JSON feed that can later be swapped for Google Sheets

## Local development

```bash
npm install
npm run dev
```

Create a local `.env` file from [.env.example](.env.example) if you want database-backed publishing. The browser client accepts either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Production build

```bash
npm run build
```

The Vite build output is static and can be hosted from GitHub Pages.

## Data model

Listings are loaded from [public/data/listings.json](public/data/listings.json) at runtime, with [src/data/listings.js](src/data/listings.js) kept as a fallback for development.

Database-backed listings live in Supabase and require an authenticated user to create or update a listing.

The Supabase schema and row-level security policies are defined in [supabase/schema.sql](supabase/schema.sql).

## Security Notes

- Only the public Supabase anon key is used in the browser.
- Listing writes are restricted by row-level security to the authenticated owner.
- Listing writes are restricted to authenticated `@umich.edu` users.
- The app never embeds service-role credentials in the client.
- Contact values are normalized to safe `mailto:` or `tel:` URLs before rendering.
- Add moderation or approval if you want to hold new listings before publication.

## GitHub Pages deployment

This project is configured with a relative base path in [vite.config.js](vite.config.js), which makes it compatible with GitHub Pages hosting.
The [404 fallback](404.html) preserves direct links to routes like `/listing/:id` and `/submit` on GitHub Pages.

For Supabase on GitHub Pages, do not commit `.env`. Instead, add repository secrets named `VITE_SUPABASE_URL` and either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`. The deploy workflow injects them at build time.

## Supabase Setup

1. Create a Supabase project.
2. Run [supabase/schema.sql](supabase/schema.sql) in the SQL editor.
3. Copy [.env.example](.env.example) to `.env` and fill in your project URL and anon key.
4. In Supabase Auth email templates, replace the default magic-link body with the OTP version below so it sends a code instead of a link:

	```html
	<p>Enter this code to verify your email:</p>
	<h2>{{ .Token }}</h2>
	<p>This code expires in 24 hours.</p>
	```

	If Supabase shows an email rate-limit warning while you are retesting, wait a bit before requesting another code.
5. Users verify ownership by entering the emailed code before they can publish.
