# UMich Subleases

A GitHub Pages-friendly, student-first sublease marketplace for Ann Arbor.

## What is included

- **Account-gated publishing** — Code-based OTP authentication with persistent sessions for @umich.edu users
- **Searchable listings directory** — Full-text search, price/bedroom/location filters, and sort options
- **Listing management** — Create, view, share, and delete listings with shareable routes
- **Supabase backend** — Auth system, database, and row-level security for data ownership
- **GitHub Pages ready** — Completely static build that deploys with environment secrets and works offline
- **Mobile-first UI** — Responsive design with official UMich colors (maize & blue) and smooth animations
- **Demo mode** — Fallback demo listings in JSON for local development or when database is unavailable

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
4. In Supabase Auth email templates (Dashboard → Auth → Email Templates), update both the **Confirmation** and **Magic Link (Sign-in)** templates to send a code instead of a link:

	**Subject:**
	```
	Your verification code
	```

	**HTML body:**
	```html
	<p style="font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0 0 8px;">
	  Hi —
	</p>
	<p style="margin:0 0 10px;">Enter this code to verify your email for UMich Subleases:</p>
	<h2 style="font-family:monospace;letter-spacing:0.08em;font-size:1.6rem;margin:6px 0;">{{ .Token }}</h2>
	<p style="margin-top:8px;">This code expires in 24 hours. If you didn't request this, you can ignore this message.</p>
	<p style="margin-top:12px;color:#6b7280;font-size:0.9rem;">— UMich Subleases</p>
	```

	**Plain text body:**
	```
	Enter this code to verify your email for UMich Subleases: {{ .Token }}
	This code expires in 24 hours.
	If you didn't request this, you can ignore this message.

	— UMich Subleases
	```

5. Users sign in by requesting an 8-digit verification code via email, entering it in the form, and remaining logged in across page reloads.
6. The built-in Supabase email provider has a rate limit of ~2 emails/hour. For higher volume, configure a custom SMTP provider (SendGrid, Postmark, Mailgun, etc.) in Project Settings → Email → SMTP settings.

## Features

### Authentication & Sessions
- **Code-based OTP** — Users enter an 8-digit code from email instead of clicking a magic link. Avoids redirect issues on GitHub Pages.
- **Persistent sessions** — Users remain logged in until they explicitly sign out. Sessions are stored in localStorage and refreshed automatically.
- **@umich.edu enforcement** — Only university email addresses can sign up and publish.

### Listings
- **Shareable routes** — Each listing gets a unique `/listing/:id` URL that works directly from GitHub Pages.
- **Listing management** — Users can view their published listings on the submit page and delete them individually with a confirmation dialog.
- **Demo listings** — Test listings marked with `is_demo: true` appear with a "DEMO LISTING" badge and are excluded from the live listings count.
- **Good deal badge** — Listings with `good_deal: true` display a "Good deal" badge on the card.
- **Contact normalization** — Listings support email, phone, or link contact methods, which are safely rendered as `mailto:`, `tel:`, or clickable URLs.
- **Image gallery** — Multiple photos per listing with lazy loading.

### Search & Discovery
- **Live search** — Full-text search across title, description, location, and neighborhood.
- **Price range slider** — Filter listings by max monthly rent.
- **Bedroom/bathroom filters** — Narrow results by unit size.
- **Location picker** — Filter by available neighborhoods.
- **Sort options** — Newest first, price low-to-high, or price high-to-low.

### Design & UX
- **Official UMich colors** — Maize (#FFCB05) and blue (#00274C) throughout the interface.
- **Mobile-first responsive design** — Works on all screen sizes.
- **Smooth animations** — Reveal animations and hover effects on all interactive elements.
- **Accessibility** — Semantic HTML, ARIA labels, keyboard navigation support.
