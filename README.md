# OneCopy Commerce — Cloudflare Edition

OneCopy is a simple inventory-backed catalog for Magic Door Books, with the physical shop zones and approval rules represented in the inventory.

## Current state
- Public catalog page: `/`
- Admin page: `/admin`
- Public inventory API: `/api/products`
- Health check: `/health`
- Admin sign-in and inventory API
- AI Item Capture workspace (requires `OPENAI_API_KEY`; review-first; original photos not yet retained)
- Cloudflare Workers + D1 schema
- **Starts with an empty inventory.** No local catalog import and no demo inventory are required.
- **Online card checkout and Square are not implemented in this repository yet.** The storefront is currently a catalog preview, not a live store taking payments.

## AI Item Capture (0.10.0)

The Admin Control Room now has an **AI Item Capture** workspace at `/admin`. It supports a live phone/desktop camera preview, still-photo capture, or image selection; up to five images per analysis; and a reviewable catalog draft for books, clothing, jewelry, antiques/collectibles, home decor, and other stock.

The analysis endpoint (`POST /api/admin/item-capture/analyze`) is protected by the existing admin session. It sends compressed photos to the OpenAI Responses API, asks the model to extract visible maker/publisher/edition/identifier/condition information, and enables web search for reference listings when supported by the configured model/account. Returned source links, active asking prices, sold-record indicators, uncertainty, and price suggestions are shown separately. An active listing is not a completed sale, and visual identification is not authentication or a formal appraisal.

### Configure the AI service

1. Create an OpenAI API key for an API project with access to a vision-capable Responses model and web search. **ChatGPT subscriptions and API usage billing are separate.** Review the provider's current model, search, and pricing availability before enabling the feature.
2. In Cloudflare, open the OneCopy Worker → **Settings → Variables and Secrets** and add `OPENAI_API_KEY` as a secret. Optionally add `OPENAI_MODEL` as a text variable; the default is `gpt-4.1-mini`.
3. Deploy version 0.10.0, sign in to `/admin`, then open **AI item capture**. The status banner reports whether the key is available to the Worker.

### Review-first safety rules and current limits

- Camera access requires HTTPS and explicit device permission. Capture up to five still images; video is not uploaded or analyzed as a video stream in this version.
- Photos are resized in the browser and sent to the configured AI provider for analysis. **The original photos are not yet saved into OneCopy inventory**; persistent image storage is a future step.
- No result is saved automatically. **Review & transfer** fills the existing Receive Item form; the operator must verify details and press Save.
- Suspected old/collectible/high-uncertainty items are routed toward the restricted rear zone for human review. Nothing is published by this feature.
- Manufacturer, date, edition, hallmark, gemstone/metal, signature, provenance, current price, and sold-comparable claims can be wrong or incomplete. Verify them. If useful market evidence is unavailable, the analysis should return no estimate rather than imply certainty.
- Requests use a limited number of compressed images per call, but AI and search usage may incur API charges. Check provider billing and use your own key; never commit API keys to GitHub.

## Browser-first deployment (no Windows deployment tool installation)

1. In Cloudflare Dashboard, create a new D1 database named `onecopy-clean-db`. Keep any older OneCopy database; do not delete it.
2. Copy the new database ID into `wrangler.jsonc`, replacing `REPLACE_WITH_NEW_D1_DATABASE_ID`, and commit the change to GitHub.
3. In Cloudflare Workers & Pages, connect the GitHub repository `Rubeficient/onecopy-cloudflare`.
4. Configure the project to install packages with `npm install` and deploy using `npx wrangler deploy`. The `npm run check` command validates the Worker entry point first.
5. Apply `migrations/0001_onecopy.sql` to the new D1 database. The migration creates empty tables; it adds no sample books.
6. Set Worker secrets `ADMIN_PASSWORD` and `SESSION_SECRET` in Cloudflare. Use a strong unique password and a long random session secret.
7. Deploy and test `/health`, `/`, and `/admin`.

You can use the D1 SQL Console in the Cloudflare dashboard to apply the migration, or use Cloudflare's migration deployment tooling. No data from earlier prototypes is imported.

## Inventory policy

- Public products must be explicitly approved, in stock, and outside the restricted rear zone.
- Items in the rear restricted zone cannot be published.
- The Annex is a separate merchandise zone for coffee, snacks, gifts and stationery.
- New inventory stays unpublished until an authorized admin approves it.

## Important limitations

This is an early starter, not a production-audited commerce system. Before real customer use, add and test Square payment processing, customer order creation, inventory reservation and reconciliation, shipping/tax/returns, robust authentication and backup/restore. Do not commit passwords, tokens or session secrets to GitHub.


## eBay Marketplace Manager (first integration)

The admin page includes an eBay-first listing workflow. It supports seller OAuth, encrypted refresh-token storage in D1, business-policy lookup, inventory-location setup, dynamic required/recommended item specifics from the eBay Taxonomy API, a marketplace-specific title override, listing preview, and create/update/publish/withdraw of approved books via the eBay Sell Inventory API. Start with books only; non-book departments need marketplace-specific category mapping before publishing.

### Required eBay setup

1. Create an eBay Developer Program application and obtain the production or sandbox Client ID and Client Secret.
2. Create a RuName in the eBay developer application. Configure its Redirect URL to the exact URL displayed in OneCopy's eBay Marketplace screen (currently `https://onecopy-cloudflare.newrube.workers.dev/api/ebay/callback` for the existing Worker hostname). Set the Worker secret `EBAY_RUNAME` to the RuName identifier, not the raw URL.
3. In Cloudflare Workers & Pages → `onecopy-commerce` → Settings → Variables and Secrets, add these as secrets: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_RUNAME`, and `EBAY_TOKEN_ENCRYPTION_KEY`. Use a long, random encryption secret. Keep all credentials out of GitHub. Set `EBAY_ENVIRONMENT` to `production` for live selling or `sandbox` when using eBay Sandbox keys and test accounts.
4. Deploy, sign in to `/admin`, open eBay Marketplace, and select Connect eBay seller account. Approve the requested permissions on eBay.
5. Enter the correct leaf category ID and your actual ship-from address; save the settings and register the inventory location. Then load your eBay business policies, select the matching fulfillment/shipping, payment, and return policy IDs, and save again.
6. Click **Load required item specifics** for the selected marketplace/category. OneCopy retrieves eBay's required and recommended item details. Fill all required facts from the actual book and save the eBay settings again if you changed the category, marketplace or policy IDs. The category metadata can change, so reload specifics whenever the marketplace or category changes.
7. In OneCopy inventory, approve an in-stock book, give it a positive price, and enter a public HTTPS photo URL. In eBay Marketplace, preview the item, complete required specifics, and explicitly confirm before publishing. For long titles, use the eBay-specific title override; the full master title remains in OneCopy. Check the returned listing link in eBay Seller Hub.

### Important boundary of the first eBay release

This first release can publish and revise the eBay-managed offer when you manually preview and confirm. It does **not yet import eBay orders, automatically detect an eBay sale, or synchronize sold inventory across eBay and OneCopy**. Keep checking orders in eBay Seller Hub and update OneCopy stock until order synchronization is implemented. A successful JavaScript syntax check is not the same as an end-to-end eBay account test; real publishing depends on your credentials, seller eligibility, category requirements, inventory location, photos, and valid business policies.


## Website Design Studio and saved skins

The admin panel now includes **Website Design Studio**. It provides six starter directions (Magic Door Editorial, Modern Bookshop, Midnight Gallery, Botanical Archive, Studio Minimal, and Sunset Paper), role-based color controls, heading/body type choices, button shape, product-card style, content width, hero layout, homepage section visibility, and editable storefront copy. Use the embedded desktop/mobile preview to experiment before saving or activating a theme.

Skin data is stored in the D1 `storefront_skins` table separately from product and valuation records. The public storefront reads the active skin from `/api/storefront/theme`; the admin endpoints list, save, update, and activate named skins. Preview messages are browser-only until a skin is saved. Saving changes to the currently active skin updates the live storefront; saving as a new skin leaves the active public design unchanged until you activate it.

This first editor is a token-based skin editor for the existing storefront template—not yet a free-form drag-and-drop page builder. It intentionally changes brand content, colors and layout choices without changing inventory, pricing or sales-channel settings.
