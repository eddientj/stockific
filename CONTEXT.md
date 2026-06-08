# Stockific — Inventory Management System for Malaysian SMEs

## What is Stockific?
A full stack web application that helps small Malaysian businesses manage their inventory, process orders, and accept payments. Built as a showcase product targeting TCG (Trading Card Game) stores and general small retailers.

## Problem It Solves
Small Malaysian businesses currently manage inventory via Excel, WhatsApp notes, or nothing at all. Existing solutions like Shopify are expensive (USD pricing), overly complex, and not built for local payment methods. Stockific provides a simple, affordable, locally-built alternative with full Malaysian payment gateway support.

## Target User
- Small Malaysian retail shops — TCG stores, boutiques, general goods
- Business owners managing stock manually
- Sellers who want a simple admin panel and customer-facing store

## Tech Stack
- **Frontend + Backend:** Nuxt 4 (full stack — server routes handle API)
- **Database:** Supabase (PostgreSQL)
- **Payment Gateway:** HitPay (supports FPX, DuitNow, TNG, GrabPay, ShopeePay, cards)
- **Hosting:** Vercel
- **Package Manager:** pnpm

## Architecture
- Nuxt server routes (`/server/api/`) handle all backend logic
- Supabase client handles database operations
- HitPay API handles payment processing
- Two main interfaces:
  1. **Admin Panel** (`/admin`) — for store staff/owners
  2. **Customer Store** (`/store`) — for customers to browse and purchase

## Core Features (MVP)

### Admin Panel
- Dashboard with stock summary and low stock alerts
- Product management — add, edit, delete products with variants (size, condition, etc.)
- Stock management — track quantity, auto-deduct on sale
- Order management — view and update order status
- Basic sales report

### Customer Store
- Product listing with categories and search
- Product detail page
- Shopping cart
- Checkout with HitPay payment (FPX, TNG, GrabPay, cards)
- Order confirmation page

## Database Schema (Supabase)

### Tables needed:
- `products` — id, name, description, category, price, image_url, created_at
- `variants` — id, product_id, name, stock_quantity
- `orders` — id, customer_name, customer_email, customer_phone, total_amount, status, created_at
- `order_items` — id, order_id, product_id, variant_id, quantity, unit_price
- `categories` — id, name

## Payment Flow
1. Customer fills cart and proceeds to checkout
2. System creates order in Supabase with status "pending"
3. HitPay payment link generated via API
4. Customer redirected to HitPay to pay
5. HitPay webhook confirms payment
6. Order status updated to "paid"
7. Stock quantity auto-deducted

## Environment Variables Needed
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
HITPAY_API_KEY=
HITPAY_SALT=
HITPAY_MODE=sandbox
```

## Development Constraints
- Solo developer
- Limited evening hours
- Use Claude Code for heavy lifting
- Prioritise working MVP over perfect code
- Start with admin panel first, then customer store

## Build Order
1. Project setup and Supabase connection
2. Database schema creation in Supabase
3. Admin panel — product management CRUD
4. Admin panel — stock tracking
5. Customer store — product listing
6. Customer store — cart and checkout
7. HitPay payment integration
8. Order management and webhooks
9. Dashboard and reports

## Demo Data
Use Pokemon TCG cards as sample products for the showcase demo. Categories: Pokemon, One Piece, Digimon, Accessories.

## Notes for Claude Code
- Always use Nuxt server routes for API endpoints, not a separate backend
- Use Supabase JS client for all database operations
- Keep components simple and reusable
- Mobile responsive from the start
- Malaysian context — use RM for currency, support Bahasa Melayu where appropriate
- HitPay sandbox mode during development, switch to live when SSM registered