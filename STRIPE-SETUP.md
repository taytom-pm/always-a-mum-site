# Shop checkout: Stripe + Vercel setup

The cart runs in the browser and is remembered between pages. When someone presses **Checkout**, the site sends the cart to `api/checkout.js`, which runs on Vercel, checks every price against `products.json` and opens Stripe's secure payment page. Card details never touch this site.

## 0. Put the site on Vercel (test link)
1. Create a free account at vercel.com (sign up with GitHub).
2. On github.com, create a new repository, choose "uploading an existing file" and drag in everything inside this folder (keep the `api` and `assets` folders as they are). Commit.
3. In Vercel: Add New → Project → Import that repository → Deploy. Leave all settings as default.
4. You get a test link like `always-a-mum.vercel.app`. The home page opens at the root.

## 1. Products
Edit `products.json`. `price` is in **pence** (1800 = £18). The Shop page, Product page and checkout all read from this one file.

## 2. Stripe
1. Create or sign in to a Stripe account at stripe.com.
2. Developers → API keys. Copy the **Secret key** (`sk_test_...` for testing).

## 3. Vercel
1. Upload the whole site folder, including `api/`, `products.json`, `cart.js` and `vercel.json`.
2. Project → Settings → Environment Variables, add:
   - `STRIPE_SECRET_KEY` = your secret key
   - `SHIPPING_PENCE` = delivery charge in pence (optional, default 395)
   - `FREE_SHIPPING_OVER` = free delivery threshold in pence (optional, e.g. 4000)
   - `SHIP_COUNTRIES` = e.g. `GB` or `GB,IE,US` (optional, default GB)
3. Redeploy.

## 4. Test
With a `sk_test_` key, pay with card `4242 4242 4242 4242`, any future date, any CVC. You return to the Shop page with a thank-you message and an empty cart. Orders appear in the Stripe dashboard under Payments.

## 5. Go live
Swap in your `sk_live_` key and redeploy.

If the Shop page is renamed when deployed, update `SHOP_PAGE` at the top of `cart.js`.
