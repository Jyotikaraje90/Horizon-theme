# Horizon-theme/dev — Practice Tasks

Theme: `Horizon-theme/dev` (#170570547477)
Store: `artistic-look-store.myshopify.com` (test store, storefront password on)
Written: 2026-09-10

This is a learning list, not a client punch list. Tasks are ordered by how fast you
can see whether your change worked — tightest feedback loop first. Each one names
what you build, how to prove it works **on this store**, and what carries over to a
real storefront.

---

## How to test anything here

**Push one file at a time.** Never a full push — it overwrites live settings on
every other section.

```bash
shopify theme push --only sections/pi-product-detail.liquid
```

**Browser QA** needs the preview param, because the published storefront has no
`pi-*` sections:

```
https://artistic-look-store.myshopify.com/?preview_theme_id=170570547477
```

**Measure with the DOM, not screenshots.** `getBoundingClientRect()` in the console
gives you real numbers.

**The MCP endpoint works even with the storefront password on.** This is the single
best test surface on this store — instant, no browser, no login:

```bash
curl -s -X POST "https://artistic-look-store.myshopify.com/api/mcp" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_catalog","arguments":{"query":"gold hoop"}}}'
```

---

## Track A — Tightest feedback loop, start here

### 1. Make the catalog legible to an AI agent
**Why start here:** edit a product, re-run one curl, see the difference in seconds.
No theme push, no browser, no cache.

**What's wrong now** (verified by live query): the queries `titanium nose stud 18g`,
`septum ring`, `tattoo aftercare cream`, `surgical steel labret` and `opal cuff`
each returned the **identical 10 products in the identical order**. 8 of 10 products
return an empty `description`.

Everything an agent receives per product is just:

```
id · title · description · price_range · variants · options · media · categories · tags
```

**Build:** pick 3 products. Write real descriptions — material, gauge,
diameter/length, finish, hypoallergenic. Add accurate tags.

**Test:** re-run the curl above with a query that should match only one of your
three. Confirm it now ranks first, and that your description text comes back in the
payload.

**Transfers:** this is the whole of AI-search readiness. Descriptions are read
verbatim by the model. No theme code is involved — none of your `pi-*` work is
visible to an agent.

### 2. Fix the variant-option data bug
**What's wrong:** product `Piercing care set` (gid 9604863951125) has variant options
named `Silver Opal Crescent Cuff (color)` and `Silver Opal Crescent Cuff (Size)` —
another product's title leaking in. An agent will describe this product wrongly.

**Build:** rename the options to `Color` and `Size` in Admin.

**Test:** query `piercing care set` via MCP, confirm `options[].name` is clean.

**Transfers:** teaches you that agent output quality is bounded by catalog hygiene,
and that a data bug is invisible in the theme but loud in the API.

### 3. Add Product JSON-LD to the real PDP
**What's wrong:** `templates/product.json` → `main` is `pi-product-detail`, and that
section emits no JSON-LD. Structured data exists only in sections that never render:
`product-information.liquid`, `featured-product.liquid`,
`featured-product-information.liquid`, `header.liquid`, `main-blog-post.liquid`.

**Build:** add a `Product` JSON-LD block to `sections/pi-product-detail.liquid` —
name, image, description, sku, offers, and `aggregateRating` from Judge.me.

**Test:** the store is password-protected so URL-based validators won't reach it.
View source on the preview URL, copy the `<script type="application/ld+json">`
block, and paste it into Google's Rich Results Test in **code** mode.

**Transfers:** works identically on a real store. This is also the lesson in
*finding the section that actually renders* — five files had JSON-LD and none of
them mattered.

---

## Track B — Build a feature, verify it in the browser

### 4. Cookie consent with the Customer Privacy API
**What's missing:** no matches for `customerPrivacy`, consent, or age verification
anywhere in the theme.

**Build:** a consent banner using Shopify's Customer Privacy API. Gate any
non-essential script behind it.

**Test:** fully verifiable here. In the console check
`Shopify.customerPrivacy.currentVisitorConsent()` before and after clicking. Confirm
in the Network tab that gated scripts don't fire until consent is given.

**Transfers:** directly. Also the correct foundation for task 8 — install analytics
before consent and you build it wrong.

### 5. Age gate
**Build:** a blocking age confirmation before service and booking pages, remembered
per visitor.

**Test:** hard-reload in a private window, confirm it blocks; confirm it stays
dismissed after; confirm it can't be skipped by deep-linking a service page.

**Transfers:** directly. Watch the storage failure mode — wrap reads and writes in
try/catch so a browser blocking site data doesn't leave a permanently blank page.

### 6. Design the collection template
**What's wrong:** `templates/collection.json` is stock auto-generated Horizon
`section` / `text` blocks, while every other template is custom `pi-*`. The design
language breaks the moment you click a nav category.

**Build:** a `pi-collection-grid` section matching the existing design system.

**Test:** the preview URL on a real collection. Compare against your jewelry grid at
mobile, tablet and desktop.

**Transfers:** directly — and it's the best exercise in the repo for learning how
Horizon's section/block schema actually composes.

### 7. Metal and gauge filters + a size guide
**What's wrong:** jewelry sells as `16g - 4mm` variants with no guide explaining
gauge, diameter or length, and no way to filter by them.

**Build:** product metafields for metal and gauge, exposed through Search &
Discovery; a size guide reachable from the PDP.

**Test:** filters appear and actually narrow results on the preview URL. Bonus:
re-run the MCP query and see whether the new structured data improves agent results.

**Transfers:** directly. Teaches metafields → filters → API surface as one chain.

### 8. Analytics and pixels, consent-gated
**What's wrong:** `layout/theme.liquid` loads only `pi-wishlist.js` (line 46),
`pi-add-to-cart.js` (line 60), an inline block at line 69, and
`{%- render 'scripts' -%}` at line 31. No GA4, no ad pixel, no ESP.

**Build:** GA4 plus one pixel, fired only after task 4's consent.

**Test:** partial. You can prove the requests fire in the Network tab and that
consent gating works — but there's no traffic here, so no reports to check.

**Transfers:** the install and the gating transfer exactly. Data verification is the
only part that needs a real store.

---

## Track C — Deeper builds, worth the time

### 9. Real booking, replacing the fake one
**What's wrong:** `templates/page.book-appointment.json` is `main-page` plus a
`pi-contact-us` section with `location` blocks (Crete, Athens, …). It's the enquiry
form with different copy — no calendar, no slots, no deposit, no confirmation, no
reschedule.

**Build:** on a test store, build it custom rather than installing an app — most
booking apps want a paid plan, and building it teaches far more. Model slots as
metaobjects, expose availability, prevent double-booking.

**Test:** book a slot, confirm it disappears from availability, confirm a second
booking attempt on the same slot fails.

**Transfers:** the data model transfers. On a real store you'd likely swap in an
app for deposits and calendar sync — but you'll be able to evaluate apps properly
having built it once.

### 10. Fix the silently-dropped file upload
**What's wrong:** `sections/pi-contact-us.liquid:667` renders an `<input type="file">`
inside the native contact form opened at `:520`. That form doesn't transmit
attachments. The file is dropped with no error — the customer sees success.

**Build:** first *prove the bug* — submit with a file and confirm nothing arrives at
the store owner email. Then either remove the input or move the form to an endpoint
that accepts uploads and store the reference on a metaobject.

**Test:** upload arrives, or the control is gone. No third state.

**Transfers:** directly. The real lesson is that a silent failure is worse than a
missing feature.

### 11. Account-linked wishlist
**What's wrong:** `assets/pi-wishlist.js` lines 4–9 state localStorage is the single
source of truth (reads and writes at lines 36 and 48). The wishlist dies on a new
browser and isn't tied to the account.

**Build:** persist to a customer metafield when logged in, keeping localStorage as
the guest fallback.

**Test:** create a test customer on this store, save items, log in from a private
window, confirm they're there.

**Transfers:** directly. Also: force-show the wishlist badge while testing — it
hides on an empty store and you'll wrongly call it broken.

### 12. Studio locator with LocalBusiness schema
**What's missing:** zero matches for any locator, map or `LocalBusiness` schema,
despite multiple studios.

**Build:** a page per studio with address, hours, map, and `LocalBusiness` /
`TattooParlor` JSON-LD.

**Test:** paste the JSON-LD into a schema validator in code mode, same as task 3.
Ranking effects need a real domain.

**Transfers:** the markup transfers; the local-SEO payoff needs a live store.

### 13. Artist profiles
**What's missing:** "artist" exists only as a select option in
`sections/pi-contact-us.liquid`. No portfolios, no per-artist booking.

**Build:** metaobject-backed artist pages with portfolio galleries, linked from
task 9's booking flow.

**Test:** each artist page renders and its booking entry pre-selects that artist.

**Transfers:** directly, and it's good metaobject practice.

### 14. On-site AI shopping assistant
**Build:** clone `github.com/Shopify/shop-chat-agent` — an embedded app plus theme
app extension that talks to the Storefront MCP. A dev store is a perfectly normal
place to develop a Shopify app, so this is fully doable here.

**Test:** ask it for a product in natural language and see whether it finds the
right one. If task 1 isn't done first, it won't — which is exactly the lesson.

**Constraints to internalise:** you may not cache catalog results, may not re-host
product images, and keyless catalog access is rate-limited.

**Transfers:** directly. This is the deliverable you can actually promise a client,
unlike cross-store discovery.

---

## Can't meaningfully verify on this store

Build them if you want the practice, but don't expect to prove they work:

- **Live payments and booking deposits** — needs Shopify Payments on a real store.
- **Domain SEO and indexing** — no domain, and the storefront is password-protected.
- **Shopify Global Catalog** (products surfacing in AI chats without naming the
  store) — admission is Shopify's decision, not a code change, and a
  password-protected dev store won't qualify. Don't promise this to a client; sell
  task 14 instead.
- **Instagram feed** — `sections/pi-instagram-strip.liquid` is 6 manual
  `image_picker` settings, not a feed. A real integration needs an Instagram
  business account.
- **Analytics reporting** — installs and fires, but there's no traffic.
- **Consent / medical-disclosure forms** — worth building, but whether they're
  legally required depends on the real business and jurisdiction.

---

## Already built — don't redo these

- Custom design system across home, services, jewelry and blog (33 `pi-*` sections)
- Judge.me review app blocks wired into `templates/product.json`
- Wishlist UI (`assets/pi-wishlist.js`, `sections/pi-wishlist.liquid`)
- Enquiry form with studio, size and artist selects (`sections/pi-contact-us.liquid`)
- Service detail pages, blog on native articles, policy pages
- Shopify taxonomy categories populated on products (verified via MCP)
- Full Horizon `locales/` set

---

# Part 2 — Merchandising: upsell, cross-sell and conversion functions

The headline finding: **stock Horizon already ships most of this machinery, and the
custom `pi-*` sections don't use it.** Five working assets sit unreferenced:

| Asset that exists | Used by a `pi-*` section? |
|---|---|
| `assets/quick-add.js` + `snippets/quick-add.liquid` | No |
| `assets/cart-discount.js` | No — `pi-cart` has no code field |
| `assets/volume-pricing.js` + `snippets/volume-pricing-info.liquid` | No |
| `assets/recently-viewed-products.js` | Only by predictive search |
| `assets/sticky-add-to-cart.js` | No |

So most tasks below are **wiring, not building**. That is the cheapest conversion
work available and the best way to learn how Horizon's snippets compose.

---

## Per-page audit

### Home — `index.json`
Has `pi-best-sellers`, `pi-usp`.

- **Recently viewed row** — `assets/recently-viewed-products.js` already exists.
  Wire it into a new `pi-recently-viewed` section. Test: view 3 products, return
  home, confirm they appear in order.
- **Free-shipping threshold messaging** — no `free_shipping` match anywhere in the
  theme. Needs a cart-total-aware banner (see cart tasks).

### Jewelry grid — `page.shop-jewelry.json` → `pi-jewelry-grid`
Already good: inline `/cart/add` form at `pi-jewelry-grid.liquid:335`, wishlist
button at `:314`, and a genuine sold-out state at `:168`.

- **Quick view modal** — `snippets/quick-add-modal.liquid` exists and is unused.
  Wire it so a card opens variant selection without leaving the grid. Test: pick a
  gauge from the grid and confirm the correct variant lands in the cart.
- **Complete the look** — a curated add-on row under the grid.

### PDP — `product.json` / `product.jewelry.json` → `pi-product-detail`

**Working cross-sell:** `pi-complementary-products.liquid` is real. It reads the
Search & Discovery metafield first, then falls back to
`/recommendations/products?intent=complementary`, and hides itself when a product
has none. Leave it alone.

**Broken cross-sell — fix this first:** `pi-you-may-also-like.liquid` is **not a
recommender**. Line 5 assigns `section.settings.collection` and line 221 loops
`collection.products`. It shows the *same hand-picked collection on every single
product page*, while being presented as "You may also like". Line 271 even admits
it: "Select a collection in the section settings".
**Build:** switch it to `product.recommendations` with `intent=related`, keeping the
collection as a fallback when the endpoint returns nothing.
**Test:** load two unrelated products and confirm the rows differ. Right now they
won't.

Also missing on the PDP:

- **Sticky add-to-cart** — `assets/sticky-add-to-cart.js` exists, unused. The PDP
  has a sticky *gallery* (`:178`) but not a sticky buy button.
- **Volume / quantity breaks** — `snippets/volume-pricing-info.liquid` exists,
  unused. Natural fit for jewelry ("buy 3 studs, save 10%").
- **Bundle / "buy it with"** — a single add-to-cart for product + aftercare at a
  combined price.
- **Back-in-stock notify** — no `back_in_stock` match anywhere. Sold-out variants
  are a dead end.
- **Subscription / selling plans** — `selling_plan` appears only in
  `snippets/cart-products.liquid`. Aftercare products are the obvious candidate.
- **Post-add upsell** — nothing offered after add-to-cart succeeds.

### Cart page — `pi-cart.liquid`
This is the weakest page in the theme. It has a subtotal (`:456`), a tax note
(`:461`) and a checkout button (`:468`). That's the entire cart.

Everything below is absent:

- **Discount code field** — `assets/cart-discount.js` exists, unused. Highest-value
  quick win: shoppers who can't find a code field abandon.
- **Free-shipping progress bar** — "add €12 more for free shipping". The single most
  reliable AOV lever in ecommerce.
- **Cart upsell row** — low-cost add-ons (aftercare spray at €5 is perfect for this).
- **Cart note** — placement notes for a piercing order.
- **Shipping estimator** — pre-checkout cost visibility.

### Cart drawer — stock
`assets/cart-drawer.js` is wired via `snippets/header-actions.liquid:154`, so the
store has **two different cart experiences**: the stock drawer and the custom
`pi-cart` page. Audit them side by side — whatever you add above needs adding to
both, or the drawer and page will disagree.

### Service detail pages — `page.tattoo-service-detail.json`, `page.piercing-service-detail.json`
Have `pi-usp`. **No product cross-sell at all**, and this is the biggest missed
opportunity in the store: someone reading about a piercing service is the ideal
buyer for aftercare spray and jewelry. Service → product is the natural path and
it doesn't exist.

### Blog / article
No product embeds. A "shop this look" block on tattoo and aftercare articles turns
content into a sales path.

### Search — `search.json`
Predictive search exists with recently-viewed support. Confirm services stay
excluded from product results (already handled per commit `41d415d`).

### Global
- `pi-announcement-bar` ✓ — could carry the free-shipping threshold.
- `pi-newsletter-footer` ✓ but has no ESP behind it, so no welcome discount is
  actually deliverable. Depends on Part 1 task 8.

---

## Suggested order

**Wire what exists (fast, high return):**
1. Discount code field in `pi-cart` — `cart-discount.js` is sitting there
2. Fix `pi-you-may-also-like` to use real recommendations
3. Quick view modal on the jewelry grid
4. Sticky add-to-cart on the PDP
5. Recently-viewed row

**Then build:**
6. Free-shipping progress bar (cart page + drawer + announcement bar)
7. Cross-sell block on service detail pages
8. Cart upsell row
9. Volume pricing on jewelry
10. Back-in-stock notify
11. Bundle / buy-it-with
12. Shop-this-look in articles

**Testing note:** every one of these is fully verifiable on this store — they're all
theme-side and cart-side. Use the preview URL, and remember the cart badge and
wishlist badge hide when empty, so add an item before judging whether a change
worked.
