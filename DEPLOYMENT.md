# OneCopy — simple Cloudflare setup

This path deploys from GitHub in Cloudflare's build environment. Do **not** run the old Windows installer or install Wrangler on your nephew's Windows 10 computer.

## 1. Prepare the empty database
1. In Cloudflare Dashboard, open **Storage & databases → D1 SQL Database**.
2. Create a new database named `onecopy-clean-db`. Leave any prior `onecopy-commerce-db` database untouched.
3. Open the new database, copy its Database ID, then open `wrangler.jsonc` in GitHub.
4. Replace `REPLACE_WITH_NEW_D1_DATABASE_ID` with the ID and commit the change.

## 2. Create the tables
Open the new D1 database's SQL Console. Copy and run the full contents of `migrations/0001_onecopy.sql` from GitHub. It creates the tables but inserts **zero products**.

## 3. Connect Cloudflare to GitHub
1. In Cloudflare Dashboard, open **Workers & Pages** and choose **Create** then **Connect to Git** (wording can vary).
2. Choose repository `Rubeficient/onecopy-cloudflare` and branch `main`.
3. Use the project's Wrangler configuration. If Cloudflare asks for commands, use `npm install && npm run check` as the build command and `npx wrangler deploy` as the deploy command.
4. Set Worker secrets named `ADMIN_PASSWORD` and `SESSION_SECRET`. Use a strong unique password and a long random session secret (at least 32 characters).
5. Deploy and open the generated `workers.dev` URL.

## 4. Smoke test
- Visit `/health` — should return JSON with `"ok": true`.
- Visit `/` — public catalog preview.
- Visit `/admin` — admin sign-in and inventory page.
- Add a test item and approve it to verify it appears on the catalog page.

## What currently works
- Empty-start D1-backed inventory with unique item IDs.
- Public catalog for explicitly approved, in-stock items outside the restricted Rear zone.
- Admin login, add item, move item between zones, approve/publish, restrict in Rear, mark sold, and view existing order records.
- Annex merchandise category support.

## Not yet implemented
Square payment processing, customer order creation, shipping/tax/returns, and actual marketplace publishing are **not active yet**. The public site is a catalog preview, not a live checkout. Do not put Square tokens or other secrets in GitHub files.

Keep the previous database until the new deployment is tested. This setup does not import or delete previous inventory.
