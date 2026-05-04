# UMich Subleases

A GitHub Pages-friendly, student-first sublease marketplace for Ann Arbor.

## What is included

- Mobile-first listings directory
- Search, filters, and sorting
- Listing detail overlay with contact CTA
- Maize and blue visual system using the official U-M palette
- Static data model that can later be swapped for Google Sheets or a form workflow

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The Vite build output is static and can be hosted from GitHub Pages.

## Data model

Listings live in [src/data/listings.js](src/data/listings.js). Replace the sample listings with live data when you are ready to connect a form or spreadsheet.

## GitHub Pages deployment

This project is configured with a relative base path in [vite.config.js](vite.config.js), which makes it compatible with GitHub Pages hosting.
