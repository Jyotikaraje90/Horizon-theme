# Brand and Ticket Size — Strategy Layer

Store: `artistic-look-store.myshopify.com` (test store)
Written: 2026-09-10

This sits **above** `TASKS_MERCHANDISING_STEPS.md`. That file says *how* to build.
This one says *which of it matters, and why* — based on what the catalog actually
contains, not on assumptions.

---

## What ticket size means

**Ticket size = average order value (AOV)** — what a customer spends per order.

```
Revenue = Traffic × Conversion Rate × Average Order Value
```

Three multipliers. Merchandising work moves the last two. Nothing in the
merchandising list moves traffic — that's SEO, schema, analytics and local search,
all in `PENDING_FEATURES_TASKS.md`.

Why it drives design decisions: **low-ticket and high-ticket stores need opposite
treatment.**

| | Low ticket (€5–€30) | High ticket (€200+) |
|---|---|---|
| Buyer needs | Speed, no friction | Trust, evidence, reassurance |
| Decision time | Seconds | Days or weeks |
| Right pattern | Impulse add, quick view, bundles | Consultation, portfolio, deposit |
| Wrong move | Adding steps | Rushing to checkout |
| AOV lever | More items per order | Higher-value single booking |

Give a €500 buyer a quick-add button and they don't convert. Give a €5 buyer a
consultation form and they leave.

---

## The verified price ladder

Pulled live from the store's own UCP catalog endpoint, not estimated:

| Product | Price | Variants | Description |
|---|---|---|---|
| Aftercare Spray | €5.00 | 1 | empty |
| Minimalist Silver Loop | €16.99 | 1 | empty |
| Minimalist Silver Loop **M** | €16.99 | 1 | empty |
| necklace | €21.00 | 1 | empty |
| Silver Opal Crescent Cuff **S** | €21.99 | 10 | 363 chars |
| Gold Opal Hoop | €24.99 | 1 | empty |
| Gold Opal Hoop **G** | €24.99 | 1 | empty |
| Piercing care set | €26.99 | 10 | 66 chars |
| Gold Opal Nose Barbell | €27.99 | 1 | empty |
| Gold Opal Nose Barbell **G** | €27.99 | 1 | empty |

**Ten products. €5.00 to €27.99. Median ≈ €22.**

Method note: the endpoint reports `has_next_page: true`, but paging the cursor 16
times returned the same 10 products every time. So either the catalog really is 10
products and the flag is unreliable, or the cursor parameter needs a different name
than I used. Worth re-checking from Admin once the Shopify connector is
reconnected. Everything below holds either way — these 10 are what an AI agent and
a shopper actually see.

**Correction to an earlier note:** I previously wrote "7 of 10 products have an
empty description." It's **8 of 10** — only the Crescent Cuff (363 chars) and the
Piercing care set (66 chars) have any text at all.

---

## The structural problem

**Your entire purchasable catalog is low-ticket. The high-ticket product isn't
purchasable at all.**

`snippets/pi-is-service-product.liquid` lists 24 in-studio services — blackwork,
conch piercing, dotwork and mandala tattoos, helix, septum, watercolour, and so on.
**None of them appear in the catalog endpoint.** They carry no price a shopper or
an agent can see. They're deliberately kept out of search (the snippet's whole
purpose), and the only path to one is an enquiry form that
`templates/page.book-appointment.json` renders as `pi-contact-us` — no calendar, no
slot, no deposit.

So the money works like this:

```
Tattoo / piercing service   →  the real revenue  →  NOT SELLABLE on the site
Jewelry & aftercare €5–€28  →  the accessory tail →  fully sellable
```

You are monetising the tail and leaving the body on the table.

**The consequence for ticket size:** cart upsells and bundles operate on a €5–€28
base. Stack them perfectly and you move AOV from roughly €22 to maybe €35. Making
one service bookable with a deposit adds a multiple of that in a single
transaction. **No amount of merchandising on a €22 catalog competes with making the
€200+ product purchasable.**

That's the honest strategic read, and it's why the merchandising list alone doesn't
answer your question.

---

## Brand — what this store is actually selling

The mistake would be positioning this as a jewelry brand. It isn't. Nobody
searching for a €17 silver loop needs *your* €17 silver loop — that's a commodity
with a thousand substitutes.

**What can't be substituted is the studio.** The artists, the hygiene standards,
the portfolio, the two locations. The jewelry sells *because* the studio is
trusted, not alongside it.

Brand work therefore means making the studio credible, and that's what makes both
tiers convert:

| Brand asset | State today |
|---|---|
| Judge.me reviews | Installed and wired — your strongest trust signal |
| Portfolio / gallery | `pi-our-work-gallery` exists |
| Artists | **Only a dropdown option in a form.** No profiles, no portfolios, no specialisms |
| Studios | `pi-our-studios` exists, but no per-location page, map, or LocalBusiness schema |
| Instagram | **Fake** — 6 manual image pickers presented as a live feed |
| Design consistency | Broken — collection pages render stock Horizon inside a custom `pi-*` store |
| Product descriptions | 8 of 10 empty. A €28 product with no description reads as unfinished |

Two of those actively damage brand rather than merely missing: **a fake feed and a
stock-theme collection page.** A shopper who clicks a nav category lands somewhere
that looks like a different, cheaper website.

---

## Which merchandising tasks matter for which tier

From `TASKS_MERCHANDISING_STEPS.md`:

### Serve the low-ticket tier — remove friction, add items
These are correctly aimed at a €5–€28 catalog. Build them.

| Task | Effect |
|---|---|
| 1 Discount field | Stops abandonment |
| 3 Quick view | Impulse add from the grid |
| 6 Free-shipping bar | **Highest AOV lever available on this catalog** |
| 8 Cart upsell | The €5 spray is a textbook add-on |
| 11 Bundle | Jewelry + aftercare in one click |
| 4 Sticky add-to-cart | Fewer steps |

### Serve the high-ticket tier — build trust, then capture
Currently almost nothing serves this, and it's where the money is.

| Task | Effect |
|---|---|
| 7 Service-page cross-sell | The one bridge between tiers that exists in the list |
| Part 1 task 9 — real booking | **The single highest-value item in either document** |
| Part 1 task 13 — artist profiles | High-ticket buyers choose a person, not a studio |
| Part 1 task 12 — studio pages + LocalBusiness | Local intent is how studios get booked |

### Serve both
| Task | Effect |
|---|---|
| 2 Real recommendations | Currently shows identical products on every PDP |
| 5 Recently viewed | Return path for a multi-day decision |
| 12 Shop-this-look | Content → commerce |
| 9 Volume pricing | Only helps if people buy multiples — test before investing |
| 10 Back-in-stock | Recovers lost low-ticket sales |

---

## What I'd actually do, in order

**1. Write the 8 missing product descriptions.**
Cheapest task in any of these documents. Fixes AI discoverability, SEO, and the
"unfinished" impression on a €28 product simultaneously. No code.

**2. Make one service bookable with a deposit.**
Not all 24 — one, end to end. This is the only change that alters the business
model rather than optimising the margins on it.

**3. Free-shipping bar (task 6).**
Best AOV-per-hour on the low-ticket catalog, and the threshold is easy to set
sensibly against a €22 median.

**4. Fix the two brand-damaging items.**
The collection template and the fake Instagram feed. Both are visible to every
visitor.

**5. Then the wiring tasks (1, 3, 4, 5).**
The JS already exists; these are cheap once the above is settled.

**6. Artist profiles.**
Turns "a studio" into "the person who will tattoo me" — the actual high-ticket
decision.

---

## Catalog hygiene blocking all of it

Fix before measuring anything, because these corrupt your data:

- **Duplicate products** — `Gold Opal Hoop` / `Gold Opal Hoop G`, `Minimalist
  Silver Loop` / `M`, `Gold Opal Nose Barbell` / `G` are the same items at the same
  price. Duplicates split reviews, inventory and analytics.
- **`Silver Opal Crescent Cuff S`** — the trailing letters look like internal
  variant markers leaked into titles. Note only the silver sibling appears in the
  catalog; the gold and bronze crescents don't, so check their publication status.
- **A product titled `necklace`**, lowercase.
- **`Piercing care set`** has variant options named `Silver Opal Crescent Cuff
  (color)` / `(Size)` — another product's title leaking in.

All four are store-data changes. **Get explicit approval before editing the
catalog** — none of this is a theme change.

---

## One-line answers to your question

**What is e-commerce here?** Not a jewelry shop. A studio whose credibility sells
two very different tickets: a €22 accessory and a €200+ appointment.

**What should you build?** The €22 side is nearly done and the task list finishes
it. The €200+ side barely exists — that's where the work is.

**Brand?** The studio and its artists, not the jewelry. Everything else follows.

**Ticket size?** €22 today, capped around €35 by merchandising alone. Uncapped the
moment a service becomes bookable.
