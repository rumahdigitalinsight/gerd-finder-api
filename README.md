# GERD Finder V5 - Vercel Backend READY

## Deploy ke Vercel (10 menit)

1. Buat repo GitHub baru: gerd-finder-api (Public)
2. Upload semua file di folder ini ke repo tersebut
3. Buka vercel.com -> Add New Project -> Import gerd-finder-api
4. Set Environment Variables di Vercel:
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY (service_role key, bukan anon)
   - SUPABASE_KEY (anon key optional)
   - RESEND_API_KEY
   - APP_DOMAIN=https://rumahdigitalinsight.github.io/gerd-finder/app/
   - PIXEL_ID=2486558015155047
   - PIXEL_ACCESS_TOKEN (dari Events Manager > Settings > Access Token)
5. Deploy -> Dapat URL: https://gerd-finder-api-xxx.vercel.app

## Setup Supabase

1. Buat project di supabase.com
2. SQL Editor -> paste supabase/schema.sql -> Run
3. Copy URL + anon key + service_role key ke Vercel Env

## Setup OrderHero Webhook

1. OrderHero Dashboard -> Settings -> Webhook
2. URL: https://gerd-finder-api-xxx.vercel.app/api/webhook
3. Method: POST
4. Test: Buat order dummy FO26TEST1234

## API Endpoints

- POST /api/webhook -> OrderHero paid -> generate license + email + CAPI Purchase
- POST /api/check-license -> Login validation (email + FO26)
- POST /api/analyze -> Analyzer AI (optional)

## Test Login

- Email: demo@gmail.com + OrderID FO26DEMO1234 (demo)
- Email: halimo36@gmail.com + OrderID FO26U7LRM3BG (real test dari screenshot kamu)
- Setelah webhook jalan, pakai OrderID real dari OrderHero (FO26 + 8 char)

## Link App

- https://rumahdigitalinsight.github.io/gerd-finder/app/
