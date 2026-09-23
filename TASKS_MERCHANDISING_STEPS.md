# Merchandising Tasks — Step by Step

Theme: `Horizon-theme/dev` (#170570547477)
Preview: `https://artistic-look-store.myshopify.com/?preview_theme_id=170570547477`
Written: 2026-09-10

12 tasks in build order. Each is self-contained: what exists, the mechanism, your
steps, gotchas, how to test. Work top to bottom — later tasks assume earlier ones.

**Read `BRAND_AND_TICKET_SIZE.md` first.** It explains which of these tasks matter
for which half of the catalog, and why the biggest revenue item isn't in this file
at all. Short version: the whole sellable catalog is €5–€27.99 (median ≈ €22), so
these 12 tasks can lift AOV to roughly €35 and no further. The €200+ tattoo and
piercing services aren't purchasable on the site — fixing that outranks everything
below.

Tasks 1–5 are **wiring work**: the JS already exists and is already loaded, you're
writing markup. Tasks 6–12 are real builds.

---

## Rules that apply to every task

**Push one file at a time.** A full push overwrites live settings on every other
section.

```bash
shopify theme push --only sections/pi-cart.liquid
```

**Pull any template JSON before editing it.** Your local copy is always stale.

```bash
shopify theme pull --only templates/product.json
```

**Adding a new section setting *and* a template value that uses it? Two pushes.**
Push the section first, then the template. Both in one push and Shopify silently
strips the setting.

**The theme is GitHub-connected on branch `dev`.** Uncommitted pushes get wiped by
branch sync. Commit before pushing anything you want to keep.

**Badges hide when empty.** The cart and wishlist badges don't render on an empty
store — add an item before deciding a change is broken.

---

## How Horizon components work

Read this once; tasks 1–5 all depend on it.

Horizon uses **declarative custom elements**. Three conventions:

**`on:submit="/applyDiscount"`** — binds a method on the enclosing component. The
leading slash means "method on this component." You never write `addEventListener`.

**`ref="cartDiscountError"`** — tagged elements become `this.refs.cartDiscountError`
in the class. Components declare `requiredRefs`, and **if any required ref is
missing from your markup the component silently refuses to boot.** This is the
single most common way to lose an hour.

**`data-section-id`** — components that re-render call `morphSection()` against the
Section Rendering API. Omit it and the action succeeds but the page never updates,
which looks identical to a broken feature.

---

# Task 1 — Discount code field on the cart page

`pi-cart` has a subtotal ([:456](sections/pi-cart.liquid:456)), a tax note
([:461](sections/pi-cart.liquid:461)) and a checkout button
([:468](sections/pi-cart.liquid:468)). That is the entire cart. No code field means
shoppers who have a code abandon.

### Already exists

| Piece | Where |
|---|---|
| JS logic | `assets/cart-discount.js` |
| Script tag | [scripts.liquid:129](snippets/scripts.liquid:129) — **already loading** |
| Reference markup | [cart-summary.liquid:116-185](snippets/cart-summary.liquid:116) |
| Applied-discount display | [cart-summary.liquid:11-33](snippets/cart-summary.liquid:11) |
| Theme setting | `settings.show_add_discount_code` — already `true` |
| Translations | `content.discount`, `content.discount_code`, `actions.apply`, `content.discount_code_error`, `content.shipping_discount_error`, `accessibility.discount` |

No new JS, no script tag, no translations, no settings change.

### Steps

1. Read [cart-summary.liquid:116-185](snippets/cart-summary.liquid:116) before writing anything.
2. In `sections/pi-cart.liquid`, add the block above the checkout button at `:468`.
3. Wrap in `{% if settings.show_add_discount_code %}`.
4. `<cart-discount-component data-section-id="{{ section.id }}">`.
5. Form needs `on:submit="/applyDiscount"` and `onsubmit="return false;"`.
6. Input **must** be `name="discount"` — the JS queries `input[name="discount"]`.
7. Include **all three** refs: `cartDiscountError`, `cartDiscountErrorDiscountCode`,
   `cartDiscountErrorShipping`. Two are just hidden `<small>` error elements and
   look optional. They are not — see `requiredRefs` on line 20 of the JS.
8. Render applied discounts from `cart.cart_level_discount_applications` (copy the
   loop at lines 11–33), or the shopper gets no confirmation it worked.
9. Style with your `pi-cart__` class convention, not `cart-discount__`.

### Test

Create a test code in Admin (`TEST10`, 10% off). Add an item, open the cart.

- Valid code → subtotal drops, discount listed, **no page reload**
- Invalid code → inline error un-hides
- Console clean on load. A required-refs complaint means step 7.

**Done when:** valid applies live, invalid errors inline, applied codes are listed.

### Afterwards

The stock cart drawer ([header-actions.liquid:154](snippets/header-actions.liquid:154))
already has this via `cart-summary`. Confirm both carts behave the same.

---

# Task 2 — Make "You may also like" a real recommender

**`pi-you-may-also-like` is not a recommender.** Line 5 assigns
`section.settings.collection`; line 221 loops `collection.products`. It shows the
*same hand-picked collection on every product page* while being labelled "You may
also like". Line 271 admits it: "Select a collection in the section settings."

Load two unrelated products right now — identical rows.

### The reference implementation is already in your repo

`pi-complementary-products.liquid` does this correctly. Study it:

- Line 18: `if recommendations.performed and recommendations.products_count > 0`
- Line 235: the fetch URL pattern

```
{{ routes.product_recommendations_url }}?section_id={{ section.id }}&product_id={{ p.id }}&limit={{ max_products }}&intent=complementary
```

The trick: the section requests **itself** from the recommendations endpoint, and
on that second render `recommendations.products` is populated. First render is
server-side and empty; JS re-requests and swaps in the result.

### Steps

1. Read `pi-complementary-products.liquid` end to end — especially lines 13–19,
   230–240 and 361–390.
2. In `pi-you-may-also-like.liquid`, apply the same pattern with
   **`intent=related`** instead of `complementary`.
3. Keep `section.settings.collection` as the fallback when the endpoint returns
   nothing. Don't delete it — a fallback is correct here, it just shouldn't be the
   only behaviour.
4. Keep `exclude_current` working — `intent=related` shouldn't return the current
   product, but defend against it.
5. Respect the existing `max_products` setting (default 12, min 4, max 20).
6. Leave the schema alone. No new settings needed, so no two-step push.

### Test

Open two unrelated products (a hoop and the aftercare spray). The rows must differ.
If they're identical the endpoint isn't being hit — check the Network tab for a
request to `/recommendations/products`.

**Done when:** different products show different rows, and a product with no
related items falls back to the collection instead of rendering empty.

### Note

Shopify's `related` intent needs order history or sufficient catalog signal to be
good. On a 10-product test store with no orders, results will be thin — that's the
store's fault, not your code's. Verify the *mechanism* fires; quality comes with
real data. Part 1 task 1 (product descriptions) improves this directly.

---

# Task 3 — Quick view on the jewelry grid

`pi-jewelry-grid` already has an inline `/cart/add` form
([:335](sections/pi-jewelry-grid.liquid:335)), a wishlist button
([:314](sections/pi-jewelry-grid.liquid:314)) and a real sold-out state
([:168](sections/pi-jewelry-grid.liquid:168)).

The gap: multi-variant products. A shopper can't pick gauge or colour from the grid,
so the inline form adds whatever variant happens to be first.

### Already exists

- `snippets/quick-add.liquid` — params: `product`, `section_id`, `[block]`, `[color_scheme]`
- `snippets/quick-add-modal.liquid` — the dialog shell, `<quick-add-dialog id="quick-add-dialog">` wrapping `#quick-add-modal-content`
- `assets/quick-add.js`

Read the top of `quick-add.liquid`. Note lines 25–28: it decides between an **add**
button and a **choose options** button based on `product.variants_count` and
`product.options.size`. That logic is already written — you don't reimplement it.

### Steps

1. Render `quick-add-modal` **once** per page, outside the product loop. Rendering
   it per card gives you duplicate `id="quick-add-dialog"` and only the first works.
2. Inside the card loop, replace the raw form at `:335` with:
   `{% render 'quick-add', product: product, section_id: section.id %}`
3. Keep your `pi-jg__card-atc-btn` styling by passing through, or restyle the
   snippet's output with your own classes scoped under `.pi-jg__`.
4. Leave the sold-out branch at `:168` intact — it deliberately renders no
   affordance, which is correct.

### Test

- Single-variant product → adds directly, no modal
- Multi-variant (the crescent cuff, 10 variants) → modal opens, pick gauge, correct
  variant lands in cart
- Verify the variant in the cart matches what you chose — this is the whole point
- Sold-out card still shows no button

**Done when:** multi-variant products can be added with the right variant chosen
from the grid, without a PDP visit.

---

# Task 4 — Sticky add-to-cart on the PDP

`pi-product-detail` has a sticky **gallery**
([:178](sections/pi-product-detail.liquid:178)) but no sticky buy button. Scroll
past the buy area on a long PDP and there's no way to purchase without scrolling back.

### Already exists

`assets/sticky-add-to-cart.js`, and a **full working reference** at
[product-information.liquid:27-97](sections/product-information.liquid:27) — gated
on `section.settings.enable_sticky_add_to_cart`.

Required refs (from the JSDoc at the top of the JS): `stickyBar`,
`addToCartButton`, `quantityDisplay`, `quantityNumber`, `productImage`. **All five.**

The component listens for `ThemeEvents` and `QuantitySelectorUpdateEvent` and uses
`morph` to update itself when the variant changes — so it stays in sync with your
variant picker for free, provided the events are firing.

### Steps

1. Read [product-information.liquid:27-97](sections/product-information.liquid:27).
2. Add a `enable_sticky_add_to_cart` checkbox to `pi-product-detail`'s schema.
   **Push the section first**, then set the value in the template. Both at once and
   Shopify strips the setting.
3. Render `<sticky-add-to-cart>` with all five refs.
4. Point it at your existing buy button so it knows when to appear — it shows once
   the main buy area scrolls out of view.
5. Set `top`/`bottom` offsets against `--pi-pdp-header-h`, the variable the section
   already uses at `:178`, so it doesn't collide with the sticky header.

### Test

- Scroll past the buy button → bar appears; scroll back → it hides
- Change variant in the main picker → bar's title, price and image update
- Change quantity → bar's quantity display updates
- Add from the bar → correct variant and quantity in the cart
- Mobile: doesn't cover the footer or the wishlist button

**Done when:** the bar tracks the variant picker and adds the right variant.

---

# Task 5 — Recently viewed row

`assets/recently-viewed-products.js` exists and works, but only predictive search
uses it. No section surfaces it.

### The API

It's an ESM class with static methods — import it, don't instantiate:

```js
import { RecentlyViewed } from '@theme/recently-viewed-products';
RecentlyViewed.addProduct(productId);   // records a view
RecentlyViewed.getProducts();            // → array of product IDs, newest first
RecentlyViewed.clearProducts();
```

Storage key `viewedProducts` in `localStorage`, capped at **4 products**.

Two things to know: it stores **IDs only**, so you fetch the products yourself; and
`addProduct` de-dupes then unshifts, so order is genuinely most-recent-first.

### Steps

1. Call `RecentlyViewed.addProduct(product.id)` on PDP load, from
   `pi-product-detail`. Nothing records views today, so the list is always empty
   until you do this. **Do this first or you'll think everything else is broken.**
2. Create a `pi-recently-viewed` section. Read IDs client-side, then fetch each
   card. Either the Section Rendering API (`?section_id=`) or `/products/<handle>.js`
   — the first keeps your card markup in Liquid, so prefer it.
3. Hide the section entirely when the list is empty. Never render an empty heading.
4. Exclude the product currently being viewed when on a PDP.
5. Add it to `index.json` and the product templates. **Pull the JSON first.**

### Test

1. `localStorage.removeItem('viewedProducts')` in the console
2. View 3 products, then check `localStorage.getItem('viewedProducts')` — 3 IDs,
   newest first
3. Home page shows those 3 in that order
4. View a 5th product → oldest drops off (cap is 4)
5. Private window → section is absent, not an empty box

**Done when:** the row reflects real browsing order and disappears when empty.

---

# Task 6 — Free-shipping progress bar

No `free_shipping` match anywhere in the theme. This is the most reliable AOV lever
in ecommerce and it's entirely missing. Nothing to wire — a real build.

### Steps

1. Add a threshold to `settings_schema.json` as a money value, not hardcoded.
   Store it in the smallest currency unit (cents) to match `cart.total_price`.
2. Math on `cart.total_price` — **always in cents**. €50 is `5000`. Getting this
   wrong by 100× is the classic bug here.
3. Two states: below threshold → "add €X more for free shipping"; at or above →
   "you've earned free shipping".
4. Render in three places: the `pi-cart` page, the stock cart drawer, and optionally
   `pi-announcement-bar`.
5. It must update when the cart changes. The cart drawer re-renders via the Section
   Rendering API, so if your bar lives inside the re-rendered section it updates
   free. If you put it outside, you must listen for cart-update events.
6. Configure an actual free-shipping rate in Admin at the same threshold. A bar
   promising something checkout doesn't honour is worse than no bar.

### Test

- Empty cart → correct initial message
- Add an item → remaining amount decreases by the right value
- Cross the threshold → message switches, bar completes
- Remove an item back below → reverts
- Checkout at threshold → shipping genuinely free
- Both cart page and drawer agree

**Done when:** the number is correct at every quantity in both carts, and checkout
matches the promise.

---

# Task 7 — Cross-sell on service detail pages

**The biggest missed opportunity in the store.** Someone reading about a piercing
service is the ideal buyer for aftercare spray and jewelry. There is no product
cross-sell on any service page.

Current sections in both `page.tattoo-service-detail.json` and
`page.piercing-service-detail.json`:

```
main · pi_ph_detail · pi_tdc_detail · pi_usp_detail · pi_hiw_detail · pi_owg_detail · pi_book_detail
```

All content. Zero products.

### Steps

1. Build a `pi-service-products` section: heading, intro line, and a product list
   picked per page.
2. Use a `product_list` schema setting so the studio curates per service rather than
   pulling a whole collection — piercing aftercare differs from tattoo aftercare.
3. Reuse your existing card markup from `pi-jewelry-grid` so it looks native. Once
   task 3 is done, render `quick-add` in these cards too.
4. Place it **before `pi_book_detail`** — read about the service, see what you need,
   then book. Products after the booking CTA get ignored.
5. Add to both service templates. **Pull each JSON first**, and push section before
   template.
6. There are also `-base` variants (`page.tattoo-service-detail-base.json`,
   `page.piercing-service-detail-base.json`) — check whether those are the live
   templates before assuming.

### Test

- Each service page shows its own curated products, not a generic list
- Add to cart from a service page works
- A page with no products configured hides the section rather than showing an
  empty heading
- Mobile layout matches the jewelry grid

**Done when:** both service types show relevant, individually-curated products
above the booking CTA.

---

# Task 8 — Cart upsell row

The aftercare spray is €5. That's a textbook cart add-on and the cart offers nothing.

### Steps

1. Add a product list setting for cart add-ons — curated, not algorithmic. The
   catalog is 10 products; recommendations have nothing to work with.
2. Filter out anything already in the cart. Offering someone what they're buying
   destroys trust in the whole row.
3. One-tap add: no variant picker for single-variant add-ons.
4. Cap at 2–3 items. A long row reads as a second storefront.
5. Add to both the `pi-cart` page and the drawer.
6. Hide the row when the cart is empty, and when everything offered is already in it.

### Test

- Add a hoop → aftercare spray offered
- Add the spray → it disappears from the row
- Add every offered item → row hides entirely
- One tap adds without a reload
- Row survives quantity changes elsewhere in the cart

**Done when:** the row only ever offers things not already in the cart, and adding
is one tap.

---

# Task 9 — Volume pricing on jewelry

"Buy 3 studs, save 10%" — natural for body jewelry, currently absent.

### Already exists

`snippets/volume-pricing-info.liquid` — params `variant`, `[unique_id]`,
`[quantity]`, `[show_label]`. Plus `assets/volume-pricing.js` and
`assets/price-per-item.js`.

**Read the doc block at the top.** Line 3: *"Only renders if variant has quantity
rules or volume pricing."* So the snippet is a no-op until you configure quantity
price breaks in Admin. Configure the data **first**, or you'll debug markup that's
working correctly.

### Steps

1. In Admin, set quantity price breaks on one product. Note this needs the right
   plan — check before promising it.
2. Render in `pi-product-detail`:
   `{% render 'volume-pricing-info', variant: product.selected_or_first_available_variant, quantity: 1, show_label: true %}`
3. Also render in cart line items, passing `unique_id: item.index` and
   `quantity: item.quantity` — that's what `unique_id` is for, avoiding duplicate
   popover IDs across lines.
4. Wire `price-per-item.js` so unit price updates as quantity changes.

### Test

- Product with breaks → tiers shown; without → nothing renders (correct)
- Increase quantity past a break → active tier highlights, unit price drops
- Cart line shows the tier it qualified for
- Multiple lines → popovers don't collide (that's the `unique_id` check)

**Done when:** tiers display, highlight at the right quantity, and the cart charges
the tier price.

---

# Task 10 — Back-in-stock notify

No `back_in_stock` match anywhere. Sold-out variants are a dead end — the shopper
leaves and never returns.

### Steps

1. On a sold-out variant, replace the disabled button with an email capture.
2. Store the request. Options: a customer metafield, a metaobject entry, or an app.
   On a test store build it with metaobjects — you'll learn more and it costs nothing.
3. Capture **variant** ID, not product ID. Someone waiting on 16g-4mm doesn't want
   a mail about 18g-7mm.
4. The actual notification send needs a backend or app. On this store, prove capture
   and storage work; wire sending on a real store.
5. Handle the already-subscribed case so double submits don't create duplicates.
6. Respect the consent state from Part 1 task 4 — this is marketing email.

### Test

- Sold-out variant → form instead of a dead button
- Submit → stored record with the correct variant ID
- Available variant → normal add-to-cart, no form
- Switch variant from sold-out to available → the UI swaps correctly
- Submit twice → one record, friendly message

**Done when:** requests are captured per variant, verifiable in Admin.

---

# Task 11 — Bundle / "buy it with"

A single add-to-cart for product + aftercare at a combined price. Distinct from
task 8: this is on the PDP, pre-decision, and adds both items at once.

### Steps

1. Add a bundle-partner setting to `pi-product-detail`, or drive it from a metafield
   so the studio can curate per product.
2. Show both products, the combined price, and the saving.
3. **One form, two line items.** Shopify's `/cart/add` accepts multiple `items[]` —
   this is the part worth learning. Don't fire two sequential requests; you'll get
   a race and a half-added bundle.
4. Apply the discount with an automatic cart-level discount in Admin, not by faking
   a price in Liquid. A displayed price that checkout doesn't honour is a bug.
5. Hide the block if either product is unavailable.

### Test

- Bundle shows both products and a correct saving
- One click → both line items in the cart
- Cart total reflects the discount
- Partner sold out → block hides
- Adding the main product alone still works normally

**Done when:** one click adds both items and checkout charges the bundle price.

---

# Task 12 — Shop this look in articles

The blog runs on native Shopify articles with body layout from
`custom.body_sections` metaobjects. No product embeds anywhere — content and
commerce are fully disconnected.

### Steps

1. Add a product-list block to the `custom.body_sections` metaobject definition so
   products can be placed mid-article, not just at the end.
2. Build the rendering block in `pi-blog-detail`. Reuse jewelry-grid cards.
3. Also add an end-of-article row as the default placement.
4. Support both curated lists and a tag match, so aftercare articles can pull
   aftercare products automatically.
5. The listing pages still fall back to old manual blocks while the blog is empty —
   don't confuse that fallback with your new block failing.

### Test

- Article with products configured → cards render inline at the right position
- Article without → nothing renders, no empty heading
- Add to cart from an article works
- Cards match the jewelry grid on mobile
- Blog listing pages unaffected

**Done when:** articles can sell products inline, and articles without them look
exactly as they do today.

---

## Which tier each task serves

See `BRAND_AND_TICKET_SIZE.md` for the reasoning.

| Task | Tier | Note |
|---|---|---|
| 1 Discount field | Low ticket | Stops abandonment |
| 2 Real recommendations | Both | Identical rows on every PDP today |
| 3 Quick view | Low ticket | Impulse add |
| 4 Sticky add-to-cart | Low ticket | Fewer steps |
| 5 Recently viewed | Both | Return path |
| 6 Free-shipping bar | Low ticket | **Best AOV lever on this catalog** |
| 7 Service cross-sell | **Bridge** | Only task here linking service → product |
| 8 Cart upsell | Low ticket | The €5 spray is the natural add-on |
| 9 Volume pricing | Both | Only helps if people buy multiples — test first |
| 10 Back-in-stock | Low ticket | Recovers lost sales |
| 11 Bundle | Low ticket | Jewelry + aftercare, one click |
| 12 Shop-this-look | Both | Content → commerce |

Nothing in this file serves the high-ticket tier except task 7. Real booking,
artist profiles and studio pages live in `PENDING_FEATURES_TASKS.md`.

---

## Suggested sessions

| Session | Tasks | Why together |
|---|---|---|
| 1 | 1, 2 | Both pure wiring, immediate visible payoff |
| 2 | 3, 4, 5 | All three are Horizon component practice |
| 3 | 6, 8 | Both cart-side, same test loop |
| 4 | 7, 12 | Both content→commerce connections |
| 5 | 9, 10, 11 | Each needs Admin data configured first |

Tasks 1–5 are the highest value per hour — the code exists, you're connecting it.
