# OneCopy Commerce — Cloudflare Edition

OneCopy is a simple inventory-backed catalog for Magic Door Books, with the physical shop zones and approval rules represented in the inventory.

## Current state
- Public catalog page: `/`
- Admin page: `/admin`
- Public inventory API: `/api/products`
- Health check: `/health`
- Admin sign-in and inventory API
- Cloudflare Workers + D1 schema
- **Starts with an empty inventory.** No local catalog import and no demo inventory are required.
- **Online card checkout and Square are not implemented in this repository yet.** The storefront is currently a catalog preview, not a live store taking payments.

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
