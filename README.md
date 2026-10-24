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

## Scan-to-Shelf receiving (0.14.0)

The Receive Item workflow is scan-first. Scan or enter an ISBN and OneCopy looks for an exact edition match from Google Books, then Open Library. Exact-match metadata can fill title, author, publisher, publication year, page count, format where available, language, subjects/categories, description and cover image. Book metadata is cached in D1. Existing records are shown before saving; duplicate ISBNs are allowed because a used bookstore can hold multiple physical copies, but OneCopy asks the operator to confirm a new copy. If no exact match is found, the item may still be saved with a blank title and barcode so a manager can identify it later. Blank or unknown fields stay blank instead of being guessed.

- The scanner field supports keyboard-wedge scanners that type the code and send Enter, plus automatic lookup and a manual lookup button. Unidentified scans can be saved as barcode-only drafts.
- `Save & scan next` is the primary action. It clears item-specific data and keeps a short session history. Unknown metadata, condition, cost, price and shelf location remain blank. Managers can save partial edits; publish/approval stays blocked until title, condition, asking price and an eligible zone are provided.
- New scans use one unique record per physical copy, remain private/unpublished, and do not invent acquisition cost, condition, price or shelf assignment. The default holding zone remains restricted until a manager assigns a retail zone and approves the item.
- Optional AI web research can look for printed cover-price evidence, exact-edition active listings and sold records, and populate draft MSRP/asking-price/CPV/TPV fields when supported. It requires `OPENAI_API_KEY`, may incur API charges per scan, and is off until explicitly enabled. Research is not an appraisal.
- Barcodes do not encode physical condition, acquisition cost, exact completeness, signatures, first printing, authenticity or shelf location. Those stay blank for the manager to complete. If no exact book match exists, save the barcode-only record or use AI Item Capture.
- **Bulk scan from Eyoyo** supports instant keyboard scanning, pasted barcode lists, and TXT/CSV/TSV/XLS/XLSX exports, up to 200 items per batch. Spreadsheet files are parsed locally in the browser with a lazily loaded SheetJS reader; the workbook contents are not uploaded to the library service. A Barcode/ISBN/EAN column is recognized, as is an optional Qty/Count column. A quantity of 4 expands into four separate physical-copy drafts, appropriate for unique-copy bookstore inventory.
- For storage/collect/inventory mode, use the Eyoyo export utility to generate TXT or CSV (or XLS/XLSX if supported by the model) and upload it in the Bulk scan from Eyoyo panel. In keyboard-export mode, focus the scanner field or paste the exported text into the multiline box. Eyoyo menu wording differs by model, so configure export fields to include the barcode column; include a Qty/Count column if the scanner has aggregated stock counts.
- Open Library requests are used as a fallback rather than the primary source. Respect provider usage limits; this workflow is for paced intake, not bulk-downloading provider catalogs.

## Control Room polish (0.11.0)

The Control Room now loads a separate presentation/help layer from `public/admin-polish.css` and `public/admin-polish.js`. Keeping these files separate makes UI polish easier to evolve without coupling it to inventory, pricing or marketplace business logic.

- Responsive visual refinement for the admin workspace and customer storefront.
- First-run getting-started workflow card; dismissal is stored locally in that browser.
- Searchable Quick Actions palette: `Ctrl+K` on Windows/Linux or `⌘K` on Mac.
- Help and workflow guide covering receiving, AI capture, restricted-zone rules, publishing, storefront skins, and privacy.
- `/` focuses inventory search; `?` opens the guide; `Esc` closes dialogs.
- Admin status badge requests `/health` after sign-in and shows the application version when healthy.
- Improved keyboard focus states, dialog focus handling, touch targets and reduced-motion support.
- Storefront polish is additive and keeps the active user-selected skin tokens intact.

The health badge confirms the Worker/database health check, not that third-party services such as eBay, AI research or checkout are fully configured. A deployed 0.11.0 build still requires normal browser testing against the actual Cloudflare environment before being treated as production-proven.

## AI Item Capture and provider setup (0.14.0)

The **AI Item Capture** workspace at `/admin` supports a live phone/desktop camera preview, still-photo capture, or image selection; up to five images per analysis; and a reviewable catalog draft for books, clothing, jewelry, antiques/collectibles, home decor, and other stock. The Worker now prefers Gemini when `GEMINI_API_KEY` is configured. The Gemini path is designed for free-first photo cataloging: it transcribes and classifies details visible in photos, but does **not** perform live web searches or create unsupported price/comparable claims. Exact barcode-based book metadata is handled separately by Google Books and Open Library.

### Configure Gemini first

1. In Google AI Studio, create an API key for a project/model that is currently available to your account.
2. In Cloudflare Worker → **Settings → Variables and Secrets**, add `GEMINI_API_KEY` as a secret. Optionally set `GEMINI_MODEL` to a model currently available to your project; the code default is `gemini-3.8-flash`.
3. Deploy, sign in to `/admin`, and open **AI Item Capture**. The status message reports the provider if configured.

Gemini's RPM, TPM, and RPD limits depend on the selected model, project, and current AI Studio quota. Do not assume a universal daily number such as 1,000 books. The bulk scanner is paced and uses catalog lookups for ordinary ISBNs; use AI photos for items that need visual extraction instead of calling a generative model once for every common barcode. A free-tier API can still have low quotas, and the quota displayed in AI Studio is the authority.

### Optional OpenAI research path

The OpenAI API remains available as an alternative provider: configure `OPENAI_API_KEY` as a Cloudflare secret and optionally `OPENAI_MODEL`. If both Gemini and OpenAI keys are set, Gemini is preferred by default. To deliberately use OpenAI for image capture, set `AI_PROVIDER=openai`. The OpenAI-backed scan price research option can use web search to look for exact-edition printed cover-price evidence, active listings, and completed/sold records when the configured API model/account supports it. This option is separate from free Gemini photo capture and may incur API usage charges. A ChatGPT subscription does not include OpenAI API usage.

### Review-first safety rules and limits

- Photos are resized in the browser and sent to the configured provider only when the operator requests analysis. The current version does not retain original item photos in inventory.
- AI results are drafts. Verify ISBN/edition, printing, maker, condition, signatures, authenticity, provenance, and any value claim before setting the final price or approving the item.
- Gemini capture does not run live market research; it deliberately leaves estimated prices blank unless a printed price is actually visible and reported with appropriate caution. Google Books/Open Library book lookup is bibliographic metadata, not a current market price.
- Exact metadata matches and scans can populate title, author, publisher, year, page count, format where available, language, subjects, description, and a cover URL. Anything not returned stays blank for the manager.
- Never commit API keys to GitHub. Provider limits and features can change; check the current provider dashboard before processing large batches.

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


## Gemini free-tier capture and flexible price matrix (0.14.0)

OneCopy now supports the Google Gemini Developer API for photo-assisted cataloging, with Gemini preferred by default whenever `GEMINI_API_KEY` is configured. In Cloudflare Worker → Settings → Variables and Secrets, add `GEMINI_API_KEY` as a secret; optionally set `GEMINI_MODEL` to a currently available model. The current default is `gemini-3.8-flash`. Gemini capture reads details visible in photos, but this free-first path does not use live web search or invent current market prices. Exact barcode metadata continues to come from the Google Books/Open Library catalog lookup. Provider quotas differ by model and project; check the live AI Studio rate limits rather than assuming a universal daily number. With both keys present, Gemini is preferred unless `AI_PROVIDER=openai` is set and the OpenAI key is present. OpenAI web-based price research remains an optional, separate and potentially billable feature.

The scan-to-shelf batch lookup is sequential and paced: choose 15, 20 (default), or 25 items per chunk and a 0.5, 1, or 1.5 second delay between individual lookups; OneCopy pauses another two seconds between chunks. These waits use asynchronous browser timers; the app does not block a Worker with Python `time.sleep`. Pacing helps avoid request bursts but does not increase any external provider's quota. Batch intake accepts keyboard-wedge scanning, pasted code lists and text/CSV/TSV/XLS/XLSX exports. Each physical scan may be saved as its own private item record; repeat ISBNs are normal for multiple copies.

Each product may carry a structured price menu: MSRP/cover price, suggested used, brick-and-mortar, front-window/pop-culture, signed, first edition/printing, signed + first edition, ARC/proof, signed ARC/proof, market-rate/full-market, student/non-capitalist/community access, installment upfront payment, installment total due, and a custom named option. A manager chooses the price source that sets the regular/base asking price; every alternative remains stored on the item for later staff discretion. Student/community pricing and installment options are labels/amounts/notes only in this release—the storefront checkout, customer-specific price authorization, and installment billing workflow are not implemented yet. The supplied fiction-hardcover value bands ($4–$10 unsigned first/first printing; $15–$50 signed; $8–$20 ARC; $30–$75+ signed ARC) are displayed as reference guidance, not filled in or treated as a verified appraisal. Managers must confirm the physical copy and choose actual amounts.
