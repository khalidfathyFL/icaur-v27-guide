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

### Photo storage for the accessories catalog

Photos of accessories and protection centers are stored in Vercel Blob.
Without it both listings still work, but the photo button in the admin forms
reports that uploads are not set up.

1. In the Vercel project, open **Storage → Create → Blob** and connect the new
   store to this project. Choose **Public** access, keep the `BLOB` prefix, and
   tick **Add a read-write token env var** so Vercel creates
   `BLOB_READ_WRITE_TOKEN`; without that box only `BLOB_STORE_ID` is created and
   uploads stay off.
2. Redeploy, then check `https://<your-vercel-url>/api/health`: it should list
   `BLOB_READ_WRITE_TOKEN: true`.

The browser asks the API for a short-lived upload token and sends the file
straight to Blob, so photos never pass through the function. Accessory photos
go under `parts/` and need **Manage accessories**; center photos go under
`centers/` and need **Manage protection centers**.

## 3. Point the site at the API

In the GitHub repository → **Settings → Secrets and variables → Actions →
Variables**, add:

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://<your-vercel-url>` |

Push to `main` (or re-run the deploy workflow). Without this variable the site
still builds and works — it simply hides the account, post and contribution
features rather than showing broken buttons.

## 4. Email through Brevo

The API sends email through Brevo's free plan. Without these settings
everything still works and simply sends no email.

1. In Brevo, **Senders, domains, IPs → Senders**: add and verify the address
   mail comes from. A Gmail address works, but Brevo cannot sign mail for
   gmail.com, so Outlook and Yahoo often file it as spam. For reliable
   delivery, authenticate your own domain under **Domains** (Brevo shows the
   DNS records to add) and send from an address on it.
2. **SMTP & API → API keys → Generate a new API key**. Under **Security →
   Authorized IPs**, leave blocking off for API keys: Vercel's functions have
   no fixed IPs.
3. In the Vercel project, add:

   | Name | Value |
   |---|---|
   | `BREVO_API_KEY` | the key, starting `xkeysib-` |
   | `EMAIL_FROM` | the verified sender address |
   | `EMAIL_FROM_NAME` | e.g. `iCAUR V27` |
   | `SITE_URL` | `https://khalidfathyfl.github.io/icaur-v27-guide/` |
   | `CRON_SECRET` | another random string, generated like `JWT_SECRET` |

4. Redeploy. `/api/health` should list all of them as `true`.

What is sent: a welcome on sign-up; the decision on a post, comment,
correction or review, to its author, when the decision changes; every order
status change or message, to the customer; and, once per post, a "new owner
post" email to everyone who has not turned it off on their profile.

**The daily limit.** The free plan allows 300 emails a day. New-post emails
may use at most 200 of them, so at least 100 are always left for the emails
people are waiting on. Whatever does not fit is kept in `emailQueue`, and a
Vercel cron (`vercel.json`, 06:00 UTC daily) sends it the next morning:
waiting transactional mail first, then the next 200 new-post emails. With 450
users, a new post reaches 200 today, 200 tomorrow and 50 the day after.
`EMAIL_DAILY_LIMIT` and `EMAIL_BROADCAST_DAILY_LIMIT` change the numbers if
the plan changes. Admins can see the day's count and the queue at
`/api/router?p=email/status`.

**The Emails page** (`#/admin/emails`, permission **Send emails**) shows
today's count and the queue, previews every email the site sends with
sample data, and sends you a test of any of them. It also has a composer for
announcements, in English, Arabic or both, to everyone or to one account.
An announcement to everyone goes through the same 200-a-day queue as
new-post emails, and people who turned those off do not get it.

Every new-post email carries a signed unsubscribe link and the
`List-Unsubscribe` header, so Gmail shows its own unsubscribe button. The
photos in the emails are `public/email/*.jpg`, served from the site.

## 5. Create the admin account

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
- Reviews of accessories and protection centers can only be written by
  accounts that say they own a V27, one per listing, and go through the same
  queue rules as comments: the **Approve comments** permission works all three
  queues.

## Questions and answers

`#/questions` has two halves. **Answered by the guide** is the site's own FAQ,
kept in git in `src/content/faq.ts` and held to the same verification rule as
the guides. Entries tagged with guide slugs also appear at the bottom of those
guides, and entries marked `featured` appear on the home page.

**Asked by owners** is the community part. Anyone signed in can ask a question,
optionally about one guide, and answer other people's questions.

- Questions and answers are moderated by whoever holds **Approve comments**,
  at `#/admin/questions` and `#/admin/answers`. **Comment without review**
  also lets someone ask and answer without waiting.
- The person who asked, or a moderator, can mark one published answer as the
  one that solved it. That answer is listed first.
- The asker is emailed when their question is decided and when someone else's
  answer is published. Answer authors are emailed the decision on their answer.
- Someone can have at most 5 questions and 10 answers waiting for review at once.
- An asker can delete their question only until someone else's answer is
  published. Moderators can delete any question, and its answers go with it.

## Car insurance

Editors with **Manage insurance** (`insurance.manage`) list insurance
companies at `#/admin/insurance`, each with its plans. Only the company name and
each plan's name are required. A plan can record:

- the yearly rate as a percentage of the car's value, and a minimum premium;
- what it covers (accident damage, total loss, theft, fire, third party,
  floods, riots, glass, the high-voltage battery, injury, roadside help,
  towing, a replacement car, cover abroad) and for how many years repairs are
  done at the agency;
- cashback as a percentage of the premium and when it is paid, and the
  no-claims discount on renewal;
- the deductible (a percentage, an amount, or both), the oldest car accepted,
  installments, and free-text offers, exclusions and notes.

`#/insurance` works out each plan's yearly cost for the reader's trim from the
current list price on the Egypt page (rate x price, never below the minimum),
and the cashback in pounds. Owners can review insurers, moderated with the
comments.

## Charger installers

Editors with **Manage charger installers** (`installers.manage`) list the
companies that sell and install home chargers at `#/admin/installers`. Only
the company name and each package's name are required. A company records the
governorates it installs in and whether it is on EgyptERA's list of licensed
charging companies; only staff can set that, not the company's merchant. A
package can record:

- the charger's make, power in kW, single or three phase, and its plug
  (GB/T or Type 2);
- the price, whether installation is included, the cable length included and
  the price of each extra metre, and the warranty;
- what it includes (wall box, site survey, three-phase upgrade, meter
  paperwork, stations for businesses, maintenance, solar), installments and
  notes.

`#/charging/installers` lists them with filters for service, governorate and
supply phase, sorted by cheapest package, most powerful charger or rating.
Owners can review installers, moderated with the comments.

## Charging stations

`#/charging` shows Egypt's public charging stations on a map (Leaflet with
OpenStreetMap tiles), with filters for fast DC and each plug, a search, and
"near me" ordering. The page also works out what a full charge costs at home
and at a station, and points to the charger installers.

The operators' own apps publish no API, so the stations come from
[Open Charge Map](https://openchargemap.org), a public registry with a free
API:

1. Sign up at openchargemap.org and create an API key under **My Profile →
   My Apps**.
2. Add it in Vercel as `OCM_API_KEY` and redeploy.

The first visitor after a day has passed triggers the import, so no second
cron is needed. Editors with **Manage charging stations**
(`charging.manage`) can also run it from **Admin → Charging stations →
Import now**, where the last import time and any error are shown.

Staff can add stations Open Charge Map lacks, and correct or remove imported
ones. An edited or removed station is marked and the import leaves it alone;
**Use Open Charge Map's version** hands it back. Without the key the import is
off, and only stations added by hand show.

## Merchant accounts

An insurance company, a protection center or a charger installer can keep its
own listing up to date. Someone from the business signs up on the site like
anyone else; then staff with **Manage insurance**, **Manage protection
centers** or **Manage charger installers** open the listing in the admin panel
and add that account's email under **Merchant accounts**.

- The merchant sees **Car insurance**, **Protection centers** or **Charger
  installers** in the admin panel with only their own listings in it, and can
  edit the details, photos and plans or packages. Changes go live straight
  away.
- They cannot see other listings, add or remove a listing, take theirs off
  the site, or change who its merchants are.
- Every change is in the activity log with the merchant's name, which fields
  changed, and which plans or packages were added, removed or edited.
- Removing the account from the listing takes effect on its next request.

## Email history

**Admin → Emails → Sent emails** lists every email the site tried to send,
newest first: who it was for, the subject, and whether it was sent, is
waiting for tomorrow, or failed (with Brevo's reason). An email held for
the next day appears again when it goes out.

## Order requests

Signed-in users can put accessories on a request list (quantity, a note,
whether they want it fitted). The list is saved on their account. Sending it
asks for a name, phone, city and optional address and note, and creates a
request numbered `IC-0001`, `IC-0002`…

- People with **Handle order requests** (`orders.manage`) work the requests at
  `#/admin/orders`: status (Sent → Confirmed → Ordered → Arrived → Delivered,
  or Cancelled), a message to the customer, the agreed total, payment
  received, and a staff-only note. Admins hold it automatically.
- Users follow their requests at `#/account/orders` and can cancel one until
  it is confirmed.
- Payment happens off the site. The total shown when a request is sent is an
  estimate from the listed prices; the agreed total replaces it once set.
- A request keeps a copy of each line's name and price as it was when sent,
  so later edits to an accessory do not change past requests.
- Phone numbers and addresses are visible only to the requester and to order
  handlers. The activity log records request numbers and statuses, never
  contact details. A user can have at most three requests waiting for a first
  answer at once.

## Manual assistant (admin test)

**Admin → Tools → Manual assistant** answers questions from the V27 owner
manual. Search and answers run in the browser: a small multilingual search
model finds the sections, and a small Qwen model (WebLLM, needs WebGPU) writes
the answer from them. Nothing is billed and no AI key is needed.

The manual is copyrighted and not cleared for owners, so it is never in git or
public storage. It lives in the `manual` and `manualPages` collections, and
the API serves it only to accounts with **Try the manual assistant**
(`assistant.use`). Admins hold it already.

To load or replace the manual, open the assistant, choose **Upload or replace
the manual** and pick the PDF. The browser reads it, splits it into sections
by heading (from the font sizes), draws each page as an image and builds the
search index, then saves the images and the index; the PDF itself is not
uploaded. The V27 manual takes 5 to 10 minutes. Only accounts with
**Manage accounts** see the upload.

## Collections

| Collection | Holds |
|---|---|
| `users` | accounts, roles and blocked status |
| `posts` | contributor posts and their review state |
| `suggestions` | proposed corrections and their review state |
| `questions` | owner questions, their review state, answer count and accepted answer |
| `answers` | answers to owner questions and their review state |
| `dealers` | who sells at official list price, admin-maintained |
| `pricing` | current price per trim, overrides the figures in git |
| `parts` | accessories and protection parts: price, suppliers, specs, photo addresses |
| `partReviews` | owner reviews of accessories and their review state |
| `centers` | protection centers: contact details, photo addresses, and their packages |
| `centerReviews` | owner reviews of protection centers and their review state |
| `insurers` | insurance companies, their contact details, logo, and their plans |
| `insurerReviews` | owner reviews of insurance companies and their review state |
| `installers` | charger installers: contact details, governorates, licence, logo, and their packages |
| `installerReviews` | owner reviews of charger installers and their review state |
| `chargingStations` | public charging stations, imported from Open Charge Map or added by staff |
| `syncState` | when the station import last ran, and its last error |
| `carts` | each signed-in user's request list, before they send it |
| `orders` | sent order requests: contact details, a copy of the lines and prices, status history, payment |
| `counters` | the running number behind request numbers such as `IC-0007` |
| `manual` | the owner manual's search index (sections and vectors), for the admin assistant |
| `manualPages` | the owner manual's page images, one JPEG per PDF page |

Indexes are created automatically on the first request after a cold start.

## Free tier limits

Atlas M0 gives 512 MB of storage and a shared cluster; Vercel Hobby gives
100 GB-hours of function execution a month. For a site of this size both are
far more than needed. The function pools connections and caches the client
across invocations, because an M0 cluster's connection limit is the first thing
a serverless app tends to exhaust.

Vercel Blob on Hobby includes 1 GB of storage, 2,000 uploads and 10 GB of
transfer a month, shared with the rest of the project. Going over does not
bill; it **blocks Blob for up to 30 days**, which would break every accessory
photo. Two things keep the catalog well inside it: the admin form resizes each
photo to 1600 px and re-encodes it as WebP (about 200 KB) before uploading, and
removing a photo from an accessory deletes the file. The upload route still caps
each file at 5 MB as a backstop.

## Local development

```bash
cp .env.example .env.local     # set VITE_API_URL
npm run dev
```

To run the functions locally too:

```bash
npx vercel dev
```
