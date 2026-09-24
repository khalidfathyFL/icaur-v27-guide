# Backend setup: MongoDB Atlas + Vercel

The site is a static build on GitHub Pages. Accounts, contributor posts,
suggested edits, dealers and live prices are served by a small API that runs as
one Vercel serverless function and stores everything in MongoDB Atlas.

Both are on free plans. Nothing here can generate a bill on its own.

## Why the API exists at all

A browser cannot talk to MongoDB directly — the Atlas Data API and App Services
SDKs reached end-of-life on 30 September 2025 — and a connection string must
never ship in frontend code, because anything sent to the browser is readable by
anyone. The function is the only thing that holds the credentials.

## 1. MongoDB Atlas

1. Create a free account at <https://www.mongodb.com/cloud/atlas/register>.
2. Build a **free M0 cluster**, in the region closest to Egypt (`eu-central-1`
   Frankfurt is usually the lowest latency of the free options).
3. **Database Access** → add a database user with a strong password and the
   `readWrite` role on the `icaur` database only, not `atlasAdmin`.
4. **Network Access** → allow `0.0.0.0/0`. Vercel's functions do not have fixed
   IPs, so the database user's password is what protects the cluster.
5. Copy the connection string from **Connect → Drivers**.

## 2. Vercel

1. Create a free account at <https://vercel.com/signup> and connect GitHub.
2. **Add New → Project** and import this repository.
3. Under **Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | the Atlas connection string, password included |
   | `MONGODB_DB` | `icaur` |
   | `JWT_SECRET` | output of the command below |
   | `ALLOWED_ORIGINS` | `https://khalidfathyfl.github.io` |

   Generate the secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

4. Deploy. Vercel gives you a URL such as `https://icaur-v27-guide.vercel.app`.
5. Check it is alive: `https://<your-vercel-url>/api/pricing` should return
   `{"pricing":[]}`.

## 3. Point the site at the API

In the GitHub repository → **Settings → Secrets and variables → Actions →
Variables**, add:

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://<your-vercel-url>` |

Push to `main` (or re-run the deploy workflow). Without this variable the site
still builds and works — it simply hides the account, post and contribution
features rather than showing broken buttons.

## 4. Create the admin account

**The first account to register becomes the admin.** Open `#/signin` on the
live site and register immediately after the API goes live, before sharing the
link. Everyone who registers afterwards is a contributor, and only an admin can
promote them.

## How moderation works

- A contributor writes a post or suggests a correction; both are saved as
  `pending` and are invisible to everyone else.
- An admin works the queue at `#/admin` and approves or rejects, optionally with
  a note the author can see.
- Approved posts appear at `#/blog` straight away.
- Approved corrections are a note to update the content in git — they do not
  rewrite the guides automatically, because the site's verification rule means a
  human decides what counts as confirmed.
- If a contributor edits a post that was already approved, it returns to the
  queue. An admin's edit does not.

## Collections

| Collection | Holds |
|---|---|
| `users` | accounts, roles and blocked status |
| `posts` | contributor posts and their review state |
| `suggestions` | proposed corrections and their review state |
| `dealers` | who sells at official list price, admin-maintained |
| `pricing` | current price per trim, overrides the figures in git |

Indexes are created automatically on the first request after a cold start.

## Free tier limits

Atlas M0 gives 512 MB of storage and a shared cluster; Vercel Hobby gives
100 GB-hours of function execution a month. For a site of this size both are
far more than needed. The function pools connections and caches the client
across invocations, because an M0 cluster's connection limit is the first thing
a serverless app tends to exhaust.

## Local development

```bash
cp .env.example .env.local     # set VITE_API_URL
npm run dev
```

To run the functions locally too:

```bash
npx vercel dev
```
