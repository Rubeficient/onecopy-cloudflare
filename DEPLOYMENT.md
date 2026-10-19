# OneCopy: browser-based Cloudflare deployment

No Node.js, npm or Wrangler installation is needed on Windows 10 when using Cloudflare Workers Builds.

1. Open Cloudflare Dashboard → Workers & Pages and connect the GitHub repository `Rubeficient/onecopy-cloudflare`.
2. In Cloudflare Dashboard → Storage & databases → D1 SQL Database, create a **new** database called `onecopy-clean-db`. Do not delete the old database.
3. Copy that database's ID into `wrangler.jsonc` by replacing `REPLACE_WITH_NEW_D1_DATABASE_ID`. Commit the change in GitHub.
4. Apply `migrations/0001_onecopy.sql` in the new database's SQL Console. This creates empty tables only.
5. In the Worker settings, set secrets `ADMIN_PASSWORD` and `SESSION_SECRET` (32+ random characters for the latter).
6. Set build/deploy command to `npm run check && npx wrangler deploy` (the build/install step is `npm install` where required).
7. Open the generated `workers.dev` address. Check `/health`, then `/admin`.

The site uses demo/manual checkout until Square Sandbox is configured. Never add Square access tokens to GitHub files; store the token as a Cloudflare Worker secret named `SQUARE_ACCESS_TOKEN`.
