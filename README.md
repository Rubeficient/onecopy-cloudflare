# OneCopy Commerce — Cloudflare Edition

This repository is the source for the OneCopy website and inventory backend.

## Start clean

This project intentionally starts with an empty catalog. It does **not** import any local OneCopy data and does not seed demo products. The D1 database name configured in `wrangler.jsonc` is `onecopy-clean-db`, which is separate from any earlier test database.

## Deploy from the browser (no Windows deployment tools)

1. In the Cloudflare dashboard, open **Workers & Pages → Create → Connect to Git** (the label may be **Create Worker → Connect Git repository**).
2. Connect GitHub and choose `Rubeficient/onecopy-cloudflare`.
3. Before deploying, create a new D1 database named `onecopy-clean-db` under **Storage & databases → D1 SQL Database**.
4. Open the new D1 database, copy its Database ID, then edit `wrangler.jsonc` in GitHub. Replace `REPLACE_WITH_NEW_D1_DATABASE_ID` with that ID and commit the change.
5. Configure the build/deploy command as `npm run check && npx wrangler deploy`; use `npm install` as the build command if Cloudflare asks separately.
6. Apply migration `migrations/0001_onecopy.sql` to the new D1 database using the D1 Console in Cloudflare. The migration creates empty tables; it inserts no books.
7. Set Worker secrets in Cloudflare: `ADMIN_PASSWORD` and `SESSION_SECRET`. Use a strong unique password and a random secret of at least 32 characters.
8. Deploy and test `/health`, `/`, and `/admin`.

Keep the previous D1 database intact until the new deployment is verified. Nothing in this repository deletes the old database.

## Square payments

Checkout defaults to sandbox/demo behavior. To enable Square, configure the Worker variables `SQUARE_ENVIRONMENT=sandbox`, `SQUARE_APPLICATION_ID`, and `SQUARE_LOCATION_ID`, then set `SQUARE_ACCESS_TOKEN` as a Worker secret. Test Square Sandbox first. Do not enable production payments until checkout and order reconciliation have been tested.

## Important

This is a starter project, not yet a production-audited commerce system. Before taking real orders, test inventory reservation, duplicate-sale prevention, Square failure/retry scenarios, shipping/tax policy, backups and admin access. Do not commit passwords, tokens, session secrets or payment credentials.
