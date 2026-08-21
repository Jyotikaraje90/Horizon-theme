# Design-Fidelity QA — Findings Log

**Theme under test:** Horizon-theme/dev (#170570547477)
**Test URL:** `https://artistic-look-store.myshopify.com/?preview_theme_id=170570547477`
**Method:** Live `getBoundingClientRect()` + `getComputedStyle()` measurement vs. Figma property-panel specs.
**Breakpoints:** Desktop 1920px · Mobile 390px

> Note: the *published* storefront does not render the `pi-*` sections. All QA must be
> done on the dev-theme preview URL above.

---

## PAGE: Homepage

Section order on `index.json`:
1. pi-announcement-bar · 2. header · 3. pi-main-banner · 4. pi-best-sellers ·
5. pi-jewelry-banner · 6. pi-tattoo-services · 7. pi-usp · 8. pi-studio-social ·
9. pi-our-studios · 10. pi-about-us · 11. pi-latest-blogs · 12. pi-faqs ·
13. pi-contact-us · 14. pi-instagram-strip · 15. footer

---

### THEME-WIDE

#### T-1 · CRITICAL · Proxima Nova is never loaded — every declaration silently falls back

48 CSS rules across the theme declare `font-family: "Proxima Nova", …`, but the font
is not loaded as a webfont and is not present on the system.

Verified by width-probe (40px, identical string):

| Family requested | Rendered width | Meaning |
|---|---|---|
| `"NoSuchFontXYZ", sans-serif` | 935.23px | generic fallback baseline |
| `"Proxima Nova", sans-serif`  | **935.23px** | **identical → not available** |
| `"Nunito Sans", sans-serif`   | 962.86px | genuinely loaded |
| `Inter, sans-serif`           | 910.34px | genuinely loaded |

Loaded font families on the page: `Inter`, `Playfair Display`, `Nunito Sans`,
`GTStandard-M`, `JudgemeStar`, `JudgemeIcons`. **Proxima Nova is absent.**

Consequences:
- Rules with chain `"Proxima Nova", "Nunito Sans", sans-serif` → render **Nunito Sans**
- Rules with chain `"Proxima Nova", sans-serif` → render **generic sans-serif**
- Elements with no `font-family` at all → render **Inter** (theme default)

So three different typefaces are in play where the design specifies one.
Every type measurement in this report is affected by this.

*Caveat: `document.fonts.check('16px "Proxima Nova"')` returns `true` here — it is not a
reliable availability test. The width probe above is authoritative.*

---

### SECTION 1 · pi-announcement-bar

Files: `sections/pi-announcement-bar.liquid` · `assets/base.css:4506-4656`

#### Desktop @ 1920px

| Property | Figma | Live | Status |
|---|---|---|---|
| Bar height | 40px | 39px | ⚠️ −1px |
| Bar background | #000000 | rgb(0,0,0) | ✅ |
| Social cluster w×h | 85 × 15 | 85 × 15 | ✅ |
| Social icon gap | 20px | 20px | ✅ |
| Social icon size | 15 × 15 | 15 × 15 | ✅ |
| Social cluster left | 210px | 205px | ✅ (within scrollbar tolerance) |
| Locations cluster gap | 10px | 10px | ✅ |
| Locations right margin | 210px | 215px | ✅ (within tolerance) |
| Text colour | #FFFFFF | rgb(255,255,255) | ✅ |
| Text line-height | 21px | 21px | ✅ |
| Text letter-spacing | 0% | normal (=0) | ✅ |
| **Announcement font** | **Proxima Nova** | **Inter** | ❌ |
| **Announcement size** | **16px** | **13px** | ❌ |
| **Location font** | **Proxima Nova** | **Inter** | ❌ |
| **Location size** | **16px** | **11px** | ❌ |
| **Announcement h-centre** | **960px (page centre)** | **871.45px** | ❌ −88.55px |
| Locations cluster width | 314px | 252.11px | ❌ (consequence of 11px font) |

#### Mobile @ 390px

| Property | Figma | Live | Status |
|---|---|---|---|
| Bar w×h | 390 × 42 | 390 × 42 | ✅ exact |
| Bar background | #000000 | rgb(0,0,0) | ✅ |
| Text line-height | 19px | 19px | ✅ |
| Text colour | #FFFFFF | rgb(255,255,255) | ✅ |
| Text align | Center / Middle | centred, box top 11.5px | ✅ |
| Text h-centre | 195px | 195px | ✅ exact |
| **Text size** | **12px** | **13px** | ❌ +1px |
| **Text font** | **Proxima Nova** | falls back (see T-1) | ❌ |
| Text run width | 229px | 254.88px | ❌ (consequence of 13px font) |

---

#### Findings

**A-1 · HIGH · Desktop announcement text is 13px, should be 16px**
`text_size` section setting is `13`. Schema allows 10–18, so 16 is reachable.

**A-2 · HIGH · Desktop location text is 11px, should be 16px**
`location_size` section setting is `11`. Schema allows 10–18, so 16 is reachable.

**A-3 · HIGH · Announcement text is off-centre by 88.55px to the left (desktop)**
Figma places the text at the exact page centre (left 807 + 306/2 = 960 = 1920/2).

Cause is structural, not a value: `assets/base.css:4512` uses
`justify-content: space-between` with `flex: 1` on `.pi-announcement__text`. That centres
the text within the *leftover* space between the 85px social cluster and the 252px
locations cluster, not within the bar. Offset = (314 − 85)/2 ≈ 114px in the design's
terms; measured 88.55px at current font sizes. **Fixing A-1/A-2 will change this offset
but will not remove it** — the two side clusters have to be equal-width (or the text
absolutely centred) for it to land on true centre.

**A-4 · HIGH · One `text_size` setting drives both desktop and mobile**
Design calls for 16px desktop / 12px mobile. The section's inline `<style>` sets
`--pi-ann-text-size` from a single setting and applies it to both
`.pi-announcement__text` and `.pi-announcement-mobile__text`, and it overrides the
`12px` hard-coded at `base.css:4635` by specificity. As written the two breakpoints
cannot both match the design. Needs either a second setting or a mobile media-query
override that wins.

**A-5 · MEDIUM · Desktop bar has no `font-family` declaration**
`.pi-announcement__text` and `.pi-announcement__location-list li` set size/weight/
line-height but no family, so they inherit Inter from `body`. The mobile rule
(`base.css:4634`) *does* declare Proxima Nova. Desktop and mobile therefore disagree
even before T-1 is considered.

**A-6 · LOW · Bar height 39px vs 40px**
`padding: 9px 40px` + 21px line-height = 39px. Design says 40px.

---

#### ✅ RESOLVED — fixes applied and verified on #170570547477

Per user direction, **Nunito Sans replaces Proxima Nova** for this section (T-1 is
otherwise still open theme-wide).

Changes:
- `assets/base.css` — `font-family: 'Nunito Sans'` on `.pi-announcement__text` and
  `.pi-announcement__location-list li`; mobile rule switched from Proxima Nova to
  Nunito Sans; `min-height: 40px` on `__inner`; `flex: 1 1 0` on `__social` and
  `__locations`, `flex: 0 1 auto` on `__text` (true-centre fix).
- `sections/pi-announcement-bar.liquid` — removed `font-size` from the mobile inline
  rule so the base.css 12px stands; schema defaults 13→16 and 11→16.
- `sections/header-group.json` — `text_size` 13→16, `location_size` 11→16.

Post-fix measurements:

| Property | Figma | Before | After |
|---|---|---|---|
| Bar height | 40px | 39px | **40px** ✅ |
| Announcement font | Proxima Nova | Inter | **Nunito Sans** ✅ |
| Announcement size (desktop) | 16px | 13px | **16px** ✅ |
| Location font | Proxima Nova | Inter | **Nunito Sans** ✅ |
| Location size | 16px | 11px | **16px** ✅ |
| Text off-centre | 0px | −88.55px | **−0.01px** ✅ |
| Social cluster span | 85px | 85px | **85px** ✅ |
| Side margins | 210 / 210 | 205 / 215 | **205 / 205** ✅ symmetric |
| Mobile bar | 390 × 42 | 390 × 42 | **390 × 42** ✅ |
| Mobile text size | 12px | 13px | **12px** ✅ |
| Mobile centre | 195px | 195px | **194.99px** ✅ |

Two residual deltas, both expected consequences of the Proxima→Nunito substitution
(Nunito Sans has wider metrics) and **not** defects:
- Announcement text run 317.05px vs Figma 306px (+11px)
- Locations cluster 323.66px vs Figma 314px (+9.7px)

Side margins read 205px rather than 210px because the viewport carries a 10px
scrollbar (bar is 1910px, not 1920px); they are exactly symmetric, so this matches.

---

### SECTION 2 · header

Files: `sections/header.liquid` · `blocks/_header-logo.liquid` · `assets/styles.css`

#### Desktop @ 1920px (Figma "Header 4": 1920 × 95, 1px bottom border, #FFFFFF)

| Property | Figma | Live | Status |
|---|---|---|---|
| Header height | 95px | 95px | ✅ |
| Content inset L/R | 210 / 210 | 205 / 205 | ✅ (10px scrollbar) |
| Logo | 193 × 55 | 193 × 55 | ✅ |
| Logo top offset | 20px | 20px | ✅ |
| Logo → nav gap | 40px | ~41px (visual) | ✅ |
| Chevron | 11 × 7 #000000 | 11 × 7 #000000 | ✅ exact |
| Btn size | 182 × 55 | 186.75 × 55 | ⚠️ +4.75 (font metrics) |
| Btn radius | 8px | 8px | ✅ |
| Btn padding | 16 / 32 | 16px 32px | ✅ |
| Btn background | #000000 | rgb(0,0,0) | ✅ |
| Btn text | 18px / 23px, 600, uppercase, #FFFFFF | same | ✅ |
| **Header bottom border** | **1px** | **0px** | ❌ |
| **Header background** | **#FFFFFF** | **transparent** | ❌ |
| **Nav font** | Proxima Nova → Nunito Sans | **Inter** | ❌ |
| **Btn font** | Proxima Nova → Nunito Sans | **Inter** | ❌ |
| **Nav line-height** | 23px | **30.09px** | ❌ |
| **Nav "HOME" colour** | #000000 | **rgba(0,0,0,0.7)** | ❌ |
| **Nav cluster width** | 655px | **718px** | ❌ |
| **Left cluster** | 888px | 911.08px | ❌ |
| **Icon sizes** | 20 × 20 each | search/wishlist/cart **22×22**, account **15×17** | ❌ |
| **Icon gaps** | 20px uniform | 23.08 / 25.48 / 22 | ❌ |
| **Icons → button gap** | 30px | **43px** | ❌ |
| **Right cluster** | 365px fixed | **381.31px** | ❌ |

#### Mobile @ 390px (Figma: 390 × 60, padding 10/20/10/20, space-between)

| Property | Figma | Live | Status |
|---|---|---|---|
| Hamburger icon | 27 × 20 #000000 | 27 × 20 #000000 | ✅ exact |
| **Header height** | **60px** | **95px** | ❌ |
| **Padding L/R** | **20px** | **10px** | ❌ |
| **Logo** | **140 × 40** | **193 × 55** | ❌ |
| **Hamburger x** | 20px | 14px | ❌ |
| **Search icon** | 20 × 20 | 22 × 22 | ❌ |
| **Cart icon** | 20 × 20 (cluster 33 × 20) | 22 × 22 | ❌ |
| **Search → cart gap** | 15px | 30px | ❌ |
| **Right margin** | 20px | 10px | ❌ |
| Cart qty badge | 18 × 18, offset −9 / +14 | `visually-hidden` (cart empty) | ⏸ unverified |

---

#### Findings

**H-1 · CRITICAL · Mobile logo mechanism is completely defeated by a `max-width` rule**

`blocks/_header-logo.liquid:123-130` implements mobile sizing correctly:
```css
.header-logo__image { height: var(--header-logo-image-height-mobile);
                      width:  var(--header-logo-image-width-mobile); }
@media screen and (min-width: 750px) { /* desktop vars */ }
```
But `assets/styles.css` contains:
```css
@media screen and (max-width: 1199px) {
  #header-component .header__columns .header-logo img,
  #header-component .header__columns .header-logo svg,
  #header-component .header__columns .header-logo__image {
    width:  var(--header-logo-image-width);   /* ← DESKTOP vars */
    height: var(--header-logo-image-height);
  }
}
```
Far higher specificity (id + 3 classes vs 1 class), and it targets **max-width 1199px** —
so every viewport *below* desktop is force-fed the **desktop** logo size. The
`-mobile` variables are computed and emitted on the element but can never win.

Note the theme's own mobile value (127 × 36, from `settings.logo_height_mobile`) does
**not** match the design either — Figma calls for **140 × 40**.

**H-2 · HIGH · Mobile header height hard-coded to 95px**

`assets/styles.css`:
```css
@media screen and (max-width: 989px) { .header__row--top .header__columns { height: 95px } }
@media screen and (min-width: 750px) { .header__row--top .header__columns { height: 95px } }
```
95px is correct for desktop but the design specifies **60px** on mobile. The two
media queries between them pin 95px at every width.

**H-3 · HIGH · Header has no background fill and no bottom border**

Every element in the chain (`#header-component`, `.header__row--top`,
`.header__columns`, `.header__underlay`) computes `background-color: transparent`.
It only *looks* white because the page behind it is. `.header__row--top` declares a
border colour (`rgba(0,0,0,0.06)`) but `border-width: 0`. Design asks for `#FFFFFF`
plus a **1px** bottom border. Matters because the header is sticky — content will
scroll through it.

**H-4 · HIGH · Nav and button render in Inter, not the design face**
Consistent with T-1. Nav also has `line-height: 30.09px` against a spec of 23px.

**H-5 · MEDIUM · Nav spacing is padding-based, not gap-based**
Figma: 5 items with 4 × 40px **gaps** (nav = 655px). Live: items are edge-to-edge
(gap 0) with ~20px padding *inside* each item — 5 × 40px = 200px of padding vs
Figma's 160px, plus leading/trailing padding the design doesn't have. Nav measures
**718px**. Individual label widths are close (HOME ≈ 53.75px vs Figma 52px), so this
is purely the spacing model.

**H-6 · MEDIUM · Action icons are 22×22, not 20×20; account icon is 15×17**
Gaps also drift (23.08 / 25.48 / 22 vs a uniform 20px), and the icons→button gap is
43px against a spec of 30px. Net right cluster 381.31px vs 365px fixed.

**H-7 · LOW · Active nav item is 70% black**
`HOME` computes `rgba(0,0,0,0.7)`; all other items are `#000000`. Design shows
`#000000` throughout.

**H-8 · INFO · Nav uppercase comes from the menu data, not CSS**
`text-transform` is `none`; the labels only look uppercase because they are typed in
caps in the Shopify **main-menu** linklist. Design specifies `Case: Uppercase`. Works
today, but renaming a menu item in Admin would silently break it.

**H-9 · LOW · Inquire button 4.75px wider than spec** — font metrics, expected.

---

#### ✅ RESOLVED — fixes applied and verified on #170570547477

Changes:
- `sections/header.liquid` — new `@media (max-width: 749px)` block (replacing an
  obsolete `max-width: 400px` padding hack); new `@media (min-width: 1200px)`
  block for the action cluster; nav `font-family`/`line-height`; active-link
  colour; `.header__row--top` white fill; +20px logo→nav.
- `snippets/header-actions.liquid` — Nunito Sans on `.pi-inquire-btn`.
- `config/settings_data.json` — `logo_height_mobile` 36 → **40**.
- `sections/header-group.json` — `border_width` 0 → **1**.

Post-fix measurements:

| Property | Figma | Before | After |
|---|---|---|---|
| **Desktop** | | | |
| Header background | #FFFFFF | transparent | **#FFFFFF** ✅ |
| Bottom border | 1px | 0px | **1px** ✅ |
| Nav font | Nunito Sans | Inter | **Nunito Sans** ✅ |
| Nav line-height | 23px | 30.09px | **23px** ✅ |
| Nav colour (incl. active) | #000000 | 70% black | **#000000** ✅ |
| Button font | Nunito Sans | Inter | **Nunito Sans** ✅ |
| Logo → first label | 40px | 20px | **40px** ✅ |
| Icon gaps | 20 / 20 / 20 | 23.08 / 25.48 / 22 | **20 / 20 / 20** ✅ |
| Icon size | 20 × 20 | 22 × 22 | **20 × 20** ✅ |
| Icons → button | 30px | 43px | **30px** ✅ |
| Button right margin | 210px | 205px | **205px** ✅ (scrollbar) |
| **Mobile** | | | |
| Header height | 60px | 95px | **60px** ✅ |
| Side padding | 20px | 10px | **20px** ✅ |
| Logo | 140 × 40 | 193 × 55 | **141 × 40** ✅ |
| Hamburger | 27 × 20 @ x20 | 27 × 20 @ x14 | **27 × 20 @ x20** ✅ |
| Hamburger → logo | 20px | 28px | **20px** ✅ |
| Search / cart icons | 20 × 20 | 22 × 22 | **20 × 20** ✅ |
| Search → cart | 15px | 30px | **15px** ✅ |
| Cart right margin | 20px | 10px | **20px** ✅ |

Three cascade traps were behind most of this, all now documented in-file:
1. `@media (max-width: 1199px)` fed the **desktop** logo vars to every sub-desktop
   width, outranking `.header-logo__image` — the mobile logo size was dead code.
2. The `≤1199` rules declare against both `#header-component …` **and**
   `#header-component[data-menu-style='drawer'] …`; the latter scores higher, so
   single-selector overrides silently lost.
3. Stock Horizon applies negative optical pulls (`-14.4px` inline-start, `-8px`
   inline-end) sized for 44px tap targets; once boxes are glyph-sized they ate
   into the gaps.

##### Residual deltas — accepted, not defects

- Header measures **96px / 61px** vs 95 / 60: the 1px border sits outside the
  content box. Chasing it would mean shaving the content to 94px.
- Nav span **710.5px** vs 655: the last item carries ~40px trailing padding that
  the design does not have. Label-to-label gaps *are* 40px and the nav is
  left-anchored, so this is invisible whitespace before the right cluster.
  Removing it means unpicking the `padding-inline: 20px !important` system the
  caret alignment depends on — judged not worth the regression risk.
- Icon cluster **140px** vs 153: Figma's cart is 33px wide because it includes
  the qty badge. Ours is 20px with the badge `visually-hidden` on an empty cart.
- Button **188.59px** vs 182: Nunito Sans is wider than Proxima Nova.

**H-10 · CRITICAL (regression, caught by user, fixed) · Count badges covered their icons**

Shrinking the action boxes from 44px to 20px broke both count badges. They are
absolutely positioned against the action box with stock offsets
(`top: 4.5px; right: 2.5px`) that assume a 44px tap target — against a 20px box a
20px-wide bubble covers the glyph entirely. The cart rendered as a **solid black
disc with the number on it**, and the heart sat behind its own badge.

Reproduced by force-showing both badges (the test cart/wishlist were empty, which
is why the original audit could not verify this — it was logged as an open risk).

Fixed to Figma's actual spec — the "Qty" badge is **18 × 18 at Left 14, Top −9**
relative to the icon, which is precisely why Figma's cart frame measures 33 × 20
rather than 20 × 20. The wishlist badge mirrors it, per the pairing note in
`header-actions.liquid`. Scoped to `≤749px` and `≥1200px` only — the 750–1199
tablet band still uses 44px targets where the stock offsets remain correct.

Verified with badges forced visible:

| | Figma | Before | After |
|---|---|---|---|
| Badge size | 18 × 18 | 20 × 20 | **18 × 18** ✅ |
| Offset from icon | left 14, top −9 | left −2.5, top 4.5 | **left 14, top −9** ✅ |
| Covers glyph | no | **yes** | **no** ✅ |
| Mobile badge within viewport | — | — | **yes (8px clearance)** ✅ |
| Mobile badge clipped by bar | — | — | **no (7.8px below top)** ✅ |

**H-11 · HIGH (regression, caught by user, fixed) · Cart icon sat 3.2px above the other three**

`.header-actions__cart-icon` is `display: block` with a 22.4px line-height wrapping
an `inline-flex` `.svg-wrapper`, so once the box was glyph-sized the cart glyph rode
a text baseline inside a 26.39px box — 3.2px higher than search, account and
wishlist. Flex-centred at a fixed 20px.

First attempt applied this as a blanket rule on `.header-actions__action`, which
**broke mobile**: setting `display` there outranks the `display: none` hiding the
account (≤989) and wishlist (≤849) buttons, so both reappeared on phones and shoved
the search icon 40px out of place. Narrowed to the cart only.

| | Before | After |
|---|---|---|
| Cart box height | 26.39px | **20px** ✅ |
| Glyph vertical spread | 3.2px | **0.02px** ✅ |
| Button vs icon centre | — | **0px** ✅ |
| Mobile visible actions | 4 (should be 2) | **2** ✅ |

##### Still open

- **H-8** — nav uppercase still comes from the menu data, not `text-transform`.
  Renaming an item in Admin would break it. Left alone: it is a content
  convention, not a rendering defect.
- **Border colour** — set to the theme's own `--color-border`
  (`rgba(0,0,0,0.06)`). The Figma panel gave a width but no colour; confirm.
- **Badge → button gap is 18px, not 30px.** Figma's 153px icon cluster includes
  the 33px-wide cart *with* its badge, so its 30px gap is measured from the badge.
  Ours is 30px from the cart *icon*, leaving 18px to the badge. Matching Figma
  exactly would open the gap to 42px whenever the cart is empty — which is the
  common state — so the icon-anchored spacing was kept deliberately.

---

### SECTION 3 · pi-main-banner (hero)

Scope per user: **sizes, colours, spacing only.**

#### Desktop @ 1920px

| Property | Figma | Live | Status |
|---|---|---|---|
| Hero frame | 1800 × 829, radius 20 | 1790 × 830, radius 20 | ✅ (10px scrollbar) |
| Hero background | #000000 | rgb(0,0,0) | ✅ |
| Side margins | 60 / 60 | 60 / 60 | ✅ |
| Main banner | 1286 × 829 | 1279.84 × 830 | ✅ proportional |
| Side banners | 514 × 414 ×2 | 510.14 × 415 ×2 | ✅ proportional |
| Content frame | 964 wide @ L61 / T80 | 963.47 @ L61 / T80 | ✅ |
| Content gap | 20px | 20px | ✅ |
| H1 | 964 × 166 | 963.47 × 166.38 | ✅ |
| H1 type | Playfair Display 700, 64px, uppercase, #FFFFFF | same | ✅ |
| H1 line-height | 83px | 83.2px | ⚠️ 0.2px |
| Paragraph | 964 × 29, 18px/29px, 400, #FFFFFF | same | ✅ |
| Button | radius 8, pad 16/32, bg #FFFFFF, text #000000 16px/21px 600 uppercase | same | ✅ |
| Side label | 149 × 57, Playfair 600, 44px/57px, #FFFFFF | 148.98 × 57 | ✅ |
| **Button height** | **55px** | **53px** | ❌ |
| **Paragraph → button gap** | **20px** | **13px** | ❌ |
| **Content frame height** | **290px** | **281.38px** | ❌ (follows the two above) |
| Button width | 250px | 257.5px | ⚠️ font fallback |
| Body/button font | Proxima Nova → Nunito Sans | **falls back** (see T-1) | ❌ |

#### Mobile @ 390px — near-exact

| Property | Figma | Live | Status |
|---|---|---|---|
| Hero frame | 354 wide, radius 20, #000000 | 354, radius 20, #000000 | ✅ |
| Side margins | 18 / 18 | 18 / 18 | ✅ |
| Content frame | 314 @ L20 / T40 | 314 @ L20 / T40 | ✅ |
| Content gaps | 20 / 20 | 20 / 20 | ✅ |
| H1 | 314 × 126, Playfair 700, 32px/42px, uppercase, #FFFFFF | same | ✅ exact |
| Paragraph | 314 × 78, 16px/26px, 400, #FFFFFF | same | ✅ exact |
| Button | 50 tall, radius 8, pad 16/32, #FFFFFF / #000000, 14px/18px 600 uppercase | same | ✅ |
| Side banner | 177 × 150 | 177 × 150 | ✅ exact |
| Side label | 88 × 34, Playfair 600, 26px/34px, #FFFFFF | 88.05 × 34 | ✅ exact |
| **Hero height** | **514px** | **510px** | ❌ −4 |
| **Main banner height** | **364px** | **360px** | ❌ −4 |
| Button width | 227px | 233.31px | ⚠️ font fallback |
| Body/button font | Proxima Nova → Nunito Sans | **falls back** | ❌ |

#### Findings

**B-1 · MEDIUM · Desktop button is 53px, should be 55px**
`padding: 16px` + `line-height: 21px` = 53. Figma fixes the height at 55, so it
needs an explicit height rather than natural sizing. (The header's INQUIRE button
reaches 55 naturally because its line-height is 23px.)

**B-2 · MEDIUM · Desktop paragraph → button gap is 13px, should be 20px**
`.pi-hero__subframe` has `gap: 13px`; the parent content frame correctly uses 20px.
Together with B-1 this makes the content block 281.38px instead of 290px.

**B-3 · MEDIUM · Mobile hero is 4px short (510 vs 514)**
The main banner renders 360px instead of 364px; the side banner below it is exact
at 150px, so the whole frame lands 4px under.

**B-4 · WITHDRAWN — false finding**
The hero already renders in Nunito Sans. Its declared chain is
`'Proxima Nova', 'Nunito Sans', system-ui, …`, so it resolves to the loaded Nunito
Sans, unlike the announcement bar's bare `'Proxima Nova', sans-serif`. The original
report read only the *first declared* family instead of the *resolved* one.
Confirmed by width probe: rendered 311.47px, identical to Nunito Sans, against
315.17px for Inter and 301.17px for the generic fallback. No change made.

**B-5 · LOW · H1 line-height 83.2px vs 83px** — a 1.3 multiplier on 64px.

**B-6 · LOW · Side banners are 415px with no gap; Figma is 414 + 1px + 414**
Totals 830 vs 829.

---

#### ✅ RESOLVED — B-1, B-2, B-3 fixed and verified

- `sections/pi-main-banner.liquid` — `.pi-hero__subframe` gap 13px → 20px;
  `.pi-hero__btn` to `inline-flex` + centred with `min-height: 55px`, with
  `min-height: 50px` restated at ≤767 (Figma's Mobile Btn hugs at 50) and
  `min-height: 0` at ≤374 (that block trims padding on purpose to fit 320px).
- `sections/pi-main-banner.liquid` schema — `mobile_height` and
  `mobile_main_height` step 10 → **4**, defaults 510/360 → **514/364**.
- `templates/index.json` — `mobile_height` 510 → **514**,
  `mobile_main_height` 360 → **364**.

The heights were **not** a CSS bug: the `≤480` block already declared the correct
514/364 defaults, but section settings were overriding them. The settings could not
hold the design values because both ranges used `step: 10` — 514 and 364 are not on
that grid, which is presumably why 510/360 were chosen. The first push failed with
`Setting 'mobile_main_height' must be a step in the range`. Step 4 puts both design
values on the grid while keeping the ranges well under Shopify's 101-step cap
(88 and 76 steps).

| Property | Figma | Before | After |
|---|---|---|---|
| Desktop button height | 55px | 53px | **55px** ✅ |
| Desktop paragraph → button | 20px | 13px | **20px** ✅ |
| Desktop content frame | 290px | 281.38px | **290.38px** ✅ |
| Mobile hero height | 514px | 510px | **514px** ✅ |
| Mobile main banner | 364px | 360px | **364px** ✅ |
| Mobile button height | 50px | 50px | **50px** ✅ held |

Unchanged and accepted: desktop button width 257.5 vs 250 and mobile 233.31 vs 227
(Nunito Sans is wider than Proxima Nova), plus B-5 and B-6 as logged.

---

### SECTION 4 · pi-best-sellers — mobile @ 390px

Specs supplied were the mobile frame only. Sizes / colours / spacing.

| Property | Figma | Live | Status |
|---|---|---|---|
| Section title type | Playfair 600, 30px/39px, uppercase, #000000 | same | ✅ |
| Card image | 167 × 167 | 167 × 167 | ✅ |
| Image → info gap | 10px | 10px | ✅ |
| Card gap | 20px | 20px | ✅ |
| Card title | 167 × 46, Proxima→Nunito 600, 18px/23px, #000000 | 46 tall, same type | ✅ |
| Price | 14px/22px, 400, #000000 | same | ✅ |
| ADD TO CART type | Proxima→Nunito 600, 14px/18px, uppercase, #000000 | same | ✅ |
| Wishlist icon | 16 × 15 @ top 15 / left 136 | 16 × 15 @ top 15 / left 136 | ✅ exact |
| Arrow buttons | 35 × 35 | 35 × 35 | ✅ |
| **Heading → products gap** | **30px** | **20px** | ❌ |
| **Card height** | **278px** | **303.39px** | ❌ |
| **Card info block** | **101px** | **126.39px** | ❌ |
| **Card info padding** | **0** | **8px all round** | ❌ |
| **Title → price gap** | **5px** | **10px** | ❌ |
| **ADD TO CART row height** | **18px** | **22.39px** | ❌ |
| **Arrow row width** | **380px** | **354px** | ❌ |

#### Findings

**BS-1 · MEDIUM · Card is 303.39px, should be 278px.** Three causes stack inside
`.pi-bs__card-info`:
- `padding: 8px` all round, which the design does not have (+16px)
- a uniform `gap: 10px`, but Figma nests title+price in their own 5px-gap frame,
  then 10px before ADD TO CART — so title→price should be 5px (+5px)
- `.pi-bs__card-atc` is a `display: block` wrapper inheriting **Inter** at a
  22.4px line-height, so the row is 22.39px instead of 18px (+4.39px)

The inner `.pi-bs__card-atc-btn` itself is correct — right family, size, weight and
uppercase. Only its wrapper is wrong. Note the button carries a 1px underline
border, so the row will settle at 19px rather than a literal 18px.

**BS-2 · MEDIUM · Heading → products gap is 20px, should be 30px.**

**BS-3 · LOW · Arrow row is 354px wide, Figma has it fixed at 380px.** Figma
deliberately hangs the arrows 13px outside the 354px content column on each side
(prev would sit at x=5, not x=18).

#### Not covered by the mobile specs
- Section title is centre-aligned live. The mobile panel gave the text box as 354px
  wide but no alignment, so this is unverified rather than a defect.

### SECTION 4b · pi-best-sellers — desktop @ 1920px

| Property | Figma | Live | Status |
|---|---|---|---|
| Section content width | 1500px | 1500px | ✅ |
| Heading → body gap | 50px | 50px | ✅ |
| Title | 378 × 70, Playfair 600, 54px/70px, uppercase, centre, #000000 | 377.09 × 70.19 | ✅ |
| Header row | space-between | title left / arrows right | ✅ |
| Arrows | 50 × 50, gap 20 | 50 × 50, gap 20 | ✅ |
| Card width | 360px | 360px | ✅ |
| Card image | 360 × 360 | 360 × 360 | ✅ |
| Image → info gap | 20px | 20px | ✅ |
| Card gap | 20px | 20px | ✅ |
| Card title | 20px/26px, 600, #000000 | same | ✅ |
| Price | 18px/29px, 400, #000000 | same | ✅ |
| ADD TO CART text | 16px/21px, 600, uppercase, #000000 | same | ✅ |
| Explore button | 55 tall, radius 8, pad 16/32, bg #000000, text #FFFFFF 16px/21px 600 uppercase | same, centred | ✅ |
| **Card height** | **486px** | **498px** | ❌ |
| **Card info block** | **106px** | **118px** | ❌ |
| **ADD TO CART row** | **21px** | **23px** | ❌ |
| **Frame 2123 dashed border** | **1px dashed 10,10 on left/right/bottom** | **none** | ❌ |
| **Frame 2123 bottom radius** | **10px** | **0** | ❌ |
| **Frame 2123 fill** | **#FFFFFF** | **transparent** | ❌ |
| Explore button width | 345px | 352.67px | ⚠️ font metrics |

#### Findings

**BS-4 · HIGH · The card's dashed info panel is missing entirely.**
Figma wraps the title/price/ADD TO CART in "Frame 2123": a `#FFFFFF` panel with a
**1px dashed (10, 10)** border on left, right and bottom, and 10px bottom corners.
`.pi-bs__card-info` computes `border: 0px none`, `border-radius: 0`, transparent
background — none of it is implemented. This is the most visible gap in the section.

**BS-5 · MEDIUM · Card is 498px, should be 486px.** The info block is 118px against
106px. Contributors: the ADD TO CART wrapper is 23px (see BS-6) and the internal
gaps are a uniform 20px.

Caveat worth flagging: Figma's own numbers for Frame 2123 do not decompose cleanly —
title 26 + price 29 + ADD TO CART 21 with two 20px gaps is 116, not the stated
Hug(106). So the panel most likely carries padding, or price and ADD TO CART sit on
one row. **The exact internal spacing needs confirming before this one is fixed.**

**BS-6 · MEDIUM · `.pi-bs__card-atc` wrapper renders in Inter at a 22.4px
line-height** (23px tall instead of 21px), on desktop and mobile alike. The inner
`.pi-bs__card-atc-btn` is correct — right family, size, weight, uppercase. Only the
wrapper is wrong. Same defect as BS-1's third cause.

---

#### ✅ RESOLVED — BS-1, BS-2, BS-3, BS-5, BS-6 fixed and verified

**The "Figma doesn't decompose" question resolved itself.** The card runs *two*
gaps, not one — title+price sit in their own nested frame, then a wider gap before
ADD TO CART. Both stated hug values then come out exact:

- Desktop: 26 + **10** + 29 + **20** + 21 = **106** ✓
- Mobile: 46 + **5** + 22 + **10** + 18 = **101** ✓

Implemented as a flex `gap` for the title→price value plus a matching `margin-top`
on `.pi-bs__card-atc` for the remainder.

| Property | Figma | Before | After |
|---|---|---|---|
| **Desktop** | | | |
| Title → price | 10px | 20px | **10px** ✅ |
| Price → ADD TO CART | 20px | 20px | **20px** ✅ |
| ADD TO CART row | 21px | 23px | **22px** ✅ ¹ |
| Card info | 106px | 118px | **107px** ✅ ¹ |
| Card height | 486px | 498px | **487px** ✅ ¹ |
| **Mobile** | | | |
| Info padding | 0 | 8px | **0** ✅ |
| Title → price | 5px | 10px | **5px** ✅ |
| Price → ADD TO CART | 10px | 10px | **10px** ✅ |
| ADD TO CART row | 18px | 22.39px | **19px** ✅ ¹ |
| Card info | 101px | 126.39px | **102px** ✅ ¹ |
| Card height | 278px | 303.39px | **279px** ✅ ¹ |
| Heading → products | 30px | 20px | **30px** ✅ |
| Arrow row width | 380px | 354px | **380px** ✅ |

¹ 1px over spec throughout — `.pi-bs__card-atc-btn` carries a 1px underline border
that the Figma text box does not count. Existing approved styling, left alone.

The arrow row now sits at x=5 with 5px clearance at each viewport edge, and no
horizontal overflow. An earlier revision had tried −17px and reverted it because
the arrows ended up 1px from the edge; −13px is the design's own figure and does
not reintroduce that.

##### BS-4 (dashed panel) — CLOSED, will not be implemented

**Client confirmed on review: no dashed border.** The dashed outline in the design
file is to be treated as a frame guide, not a visual element. This is now recorded
in a comment above `.pi-bs__card-info` so a later fidelity pass does not
"restore" it. Original assessment kept below for context.

`.pi-bs__card-info` carries the comment *"Description: plain, no border, no
frame"*, so the absence of Figma's dashed panel is a deliberate prior decision,
not an oversight. Adding a `#FFFFFF` fill, a 1px dashed (10, 10) border on
left/right/bottom and 10px bottom corners would be a conspicuous change to
approved work, and the mobile spec has no equivalent — it would be desktop-only.
Left as-is pending confirmation.

---

### SECTION 5 · pi-jewelry-banner

Scope: sizes, colours, spacing only.

#### Desktop @ 1920px

| Property | Figma | Live | Status |
|---|---|---|---|
| Banner | 1920 × 650, #000000 | 1910 × 650, rgb(0,0,0) | ✅ (scrollbar) |
| Left photo position | Left 110 / Top 50 | Left 110 / Top 50 | ✅ exact |
| Left photo box | 381 × 450, 3px #FFFFFF border | 387 × 456 (border box ~373 × 442) | ⚠️ see JB-1 |
| Heading | Playfair 600, 54px/70px, uppercase, centre, #FFFFFF | same | ✅ |
| Subheading | 461 × 29, Proxima→Nunito 400, 18px/29px, centre, #FFFFFF | same | ✅ |
| Button | 127 × 21 text box, Proxima→Nunito 600 16px/21px uppercase | same, button 194.94 × 55 | ✅ |
| **Right photo position** | **Left 1425 / Top 146** | **Left 1414.98 / Top 144** | ❌ −10 / −2 |

#### Mobile @ 390px

| Property | Figma | Live | Status |
|---|---|---|---|
| Heading | Playfair 600, 30px/39px, uppercase, centre, #FFFFFF, 354 wide | same | ✅ |
| Heading → sub gap | 20px | 20px | ✅ |
| Subheading | Proxima→Nunito 400, 16px/26px, centre, #FFFFFF | same | ✅ |
| Sub → button gap | 20px | 20px | ✅ |
| Button | 176 hug × 50, radius 8, pad 16/32 | 178.56 × 50 | ✅ |
| Image row top offset | 319px | 339px | ⚠️ see JB-2 |
| Image size | 170 × 202, 2px #FFFFFF border | 170 × 202 | ✅ exact |
| Image gap | 14px | 14px | ✅ exact |
| Image row left margin | 18px | 18px | ✅ |

#### Findings

**JB-1 · LOW · Right photo sits 10px left / 2px high of spec (desktop).**
Figma: Left 1425, Top 146. Live: Left 1414.98, Top 144. Left frame is exact
(Left 110 / Top 50 both sides), so this is specific to the right image's own
offset, not a systemic left/right mirroring bug. Minor at this scale.

**JB-2 · LOW · Mobile image row starts 20px lower than spec (339px vs 319px).**
The gap between the heading block and the button (20/20/20) is correct, so the
20px discrepancy is arithmetic further down the mobile layout, not a doubled gap.

Both frames use the same "inset border" construction as the design's "Inner
alignment" stroke — a `::before` pseudo-element sized smaller than its container
and offset toward one corner, rather than a border on the image itself. This
matches Figma's intent (a frame that overhangs/offsets from the photo) rather
than a plain outline.

---

### SECTION 6 · page.piercing-services — checked against tattoo-services as reference

Tattoo Services was brought onto spec in an earlier session. Piercing was checked
against it as the known-good reference, on size / font / colour / spacing only.

**Both templates render through the same three sections** — `pi-page-hero`,
`pi-tattoo-services-grid`, `pi-contact-us` — so they share all Liquid and CSS.
A settings diff found exactly one intentional difference:

| Section | Difference |
|---|---|
| `pi-page-hero` | `heading`: "Tattoo Services" vs "Piercing Services" ✅ correct |
| `pi-tattoo-services-grid` | settings identical (36 vs 12 `service_card` blocks) |
| `pi-contact-us` | settings identical |
| `main-page` | settings identical |

#### Measured — desktop @ 1920

| Property | Tattoo | Piercing | |
|---|---|---|---|
| Hero section | 1910 × 269.94, #000000 | same | ✅ |
| Hero title | Playfair 600, 54px/64.8px, uppercase, #FFFFFF, centre | same | ✅ |
| Grid section | bg #FFFFFF, padding 60px 0 | same | ✅ |
| Grid inner width | 1500 | 1500 | ✅ |
| Columns | 360 × 4 | 360 × 4 | ✅ |
| Column / row gap | 20 / 30 | 20 / 30 | ✅ |
| Card | 360 × 474 | 360 × 474 | ✅ |
| Card image | 360 × 360 | 360 × 360 | ✅ |
| Card title | Proxima→Nunito 600, 20px/26px, #000000 | same | ✅ |
| Card description | Proxima→Nunito 400, 18px/29px, rgb(18,18,18) | same | ✅ |

#### Measured — mobile @ 390

Hero 390 × 138.97; hero title 28px/33.6px; grid padding 32px 0; inner 354;
columns 167 × 167; gaps 20 / 30; card image 167 × 167; title 18px/23px;
description 14px/22px — **all identical on both pages.** ✅

#### Two differences, both correct behaviour — no fix needed

**Pagination renders on tattoo, not on piercing.** `cards_per_page` is 12 on both.
Tattoo has 36 cards → 3 pages, so the 1500 × 50 pager shows. Piercing has exactly
12 → a single page, so it is correctly suppressed. This accounts for the whole
100px section-height difference (1702 vs 1602).

**Mobile card height 272 (tattoo) vs 249 (piercing).** Not a styling difference —
both cards compute the same 249px of content. On tattoo's first row
"Micro-Realistic Tattoos" wraps to two lines (title 46px = 2 × 23), making that
card 272, and normal grid row-stretch pulls its neighbour up to match. Piercing has
no wrapping title in row one. Content-driven, identical CSS.

**Verdict: piercing services is already on spec.** It inherits every tattoo fix
through the shared sections, and nothing needs changing.

---

### SECTION 7 · Piercing Services carousel (`.pi-ps__*`, rendered by pi-studio-social.liquid)

> **Correction.** An earlier pass in this session recorded that the Piercing
> Services carousel was missing from the homepage. That was wrong. It exists, and
> renders from `sections/pi-studio-social.liquid` under `.pi-ps__*` classes,
> sitting between the USP strip and Happy Customers exactly as the design shows.
> The mistake was searching `index.json` for a separate section instance and then
> measuring `.pi-ts__*` (the Tattoo carousel) instead. Two edits were applied to
> `pi-tattoo-services.liquid` on that false premise and have been reverted.
>
> Consistent with the existing note that `pi-studio-social` is a multi-part
> section whose class prefixes do not match its filename.

#### Desktop @ 1920

| Property | Figma | Live | |
|---|---|---|---|
| Arrow frame | Hug(120) × Hug(50) | 120 × 50 | ✅ |
| Header → track | 50 | 50 | ✅ |
| Card image | 360 × 360 | 360 × 360 | ✅ |
| Image → text | 20 | 20 | ✅ |
| Card title type | 20px/26px, 600, #000000 | same | ✅ |
| Card desc type | 18px/29px, 400, #121212 | same | ✅ |
| Button box | Fixed(55), radius 8, #000000 | 55, radius 8, #000000 | ✅ |
| **Content width** | **1500** | **1420** | ❌ |
| **Heading line-height** | **70px** | **64.8px** | ❌ |
| **Heading colour** | **#000000** | **#1a1a1a** | ❌ |
| **Card gap** | **20** | **30** | ❌ |
| **Card height** | **473** | **492** | ❌ |
| **Card body** | **Hug(93), no padding, text Fill(360)** | **112 tall, text 320 wide** | ❌ |
| **Title → desc** | **10** | **8** | ❌ |
| **Button padding** | **16 / 32** | **16 / 40** | ❌ |
| **Button text** | **16px/21px** | **14px/22.4px** | ❌ |
| Button width | 287 | 313.44 | ❌ follows above |

#### Mobile @ 390

| Property | Figma | Live | |
|---|---|---|---|
| Content width | 354 | 354 | ✅ |
| Heading size | 30px/39px, uppercase | same | ✅ |
| Heading → track | 30 | 30 | ✅ |
| Card | Hug(167) × Hug(249) | 167 × 250 | ✅ |
| Card image | 167 × 167 | 167 × 167 | ✅ |
| Card title type | 18px/23px, 600, #000000 | same | ✅ |
| Card desc type | 14px/22px, 400, #121212 | same | ✅ |
| Button | Fill(354) × Hug(50), radius 8, pad 16/32 | same | ✅ |
| Button text | 14px/18px, 600, uppercase, #FFFFFF | same | ✅ |
| **Heading colour** | **#000000** | **#1a1a1a** | ❌ |
| **Image → text** | **10** | **12** | ❌ |
| **Title → desc** | **5** | **4** | ❌ |
| **Track → button** | **20** | **30** | ❌ |
| **Arrow row width** | **380** | **354** | ❌ |

#### Findings

**PS-1 · HIGH · Desktop content column is 1420, should be 1500.** Every other
homepage section measured so far lands on 1500, so this one is 80px narrow.

**PS-2 · MEDIUM · Heading is #1a1a1a at a 64.8px line-height; spec is #000000 at
70px.** Colour affects both breakpoints, line-height affects desktop.

**PS-3 · MEDIUM · Desktop card is 492 against a 473 spec.** The card body carries
padding the design does not have — text measures 320 inside a 360 card, and the
body is 112 tall against a 93 hug. Mobile is unaffected (text is a full 167).

**PS-4 · MEDIUM · Desktop card gap is 30, should be 20.**

**PS-5 · MEDIUM · Desktop CTA is 14px/22.4px with 16/40 padding; spec is 16px/21px
with 16/32.** The 55px height is already explicit, so the type change will not
shrink the box — it drives the width from 313.44 toward the spec's 287.

**PS-6 · LOW · Card internal gaps drift on both breakpoints** — title→desc is 8
(desktop, spec 10) and 4 (mobile, spec 5); mobile image→text is 12 (spec 10).

**PS-7 · LOW · Mobile arrow row is 354, spec 380.** Same as BS-3; the Best Sellers
remedy (`left/right: -13px`) applies.

Two more surfaced while verifying the fixes:

**PS-8 · MEDIUM · Desktop carousel → button gap was 50, should be 30.** Missed on
the first pass. `.pi-ps__inner` applied one 50px flex gap to all three children,
but Figma's Hug(678) only balances as 70 + **50** + 473 + **30** + 55.

**PS-9 · MEDIUM · Mobile header kept its 70px desktop `min-height`** while the
mobile heading is only 39 tall, inflating the section to 419 against a 388 spec.

---

#### ✅ RESOLVED — PS-1 … PS-9 fixed and verified

`sections/pi-studio-social.liquid`:
- `.pi-ps__inner` max-width 1500 → **1580** (the 1500 was inclusive of the 40px
  gutters, so the column rendered 1420)
- `.pi-ps__inner` gap 50 → **30** + `.pi-ps__header` `margin-bottom: 20px`, giving
  the 50 / 30 rhythm a single flex gap cannot express
- `.pi-ps__heading` line-height 1.2 → **1.2963** (54 × 1.2963 = 70)
- `.pi-ps__track` gap 30 → **20**
- `.pi-ps__card` gains `gap: 20px`; `.pi-ps__card-body` padding 20 → **0**,
  gap 8 → **10**. The 20px padding was doing double duty as the image→text gap
  *and* insetting the text to 320; moving it to a card-level flex gap keeps the
  vertical spacing while letting the text fill 360.
- `.pi-ps__btn` padding 16/40 → **16/32**, font-size → **16px**,
  line-height → **21px**, letter-spacing 0.08em → **0**
- Mobile: `.pi-ps__card` gap **10**, `.pi-ps__card-body` padding **0** / gap **5**,
  `.pi-ps__inner` gap **20** + header `margin-bottom: 10px`, header
  `min-height: 0`, arrow overlay `left/right: -13px`

`templates/index.json` (pi-studio-social settings):
- `heading_color` `#1a1a1a` → **`#000000`**
- `btn_size` 14 → **16**

| Property | Figma | Before | After |
|---|---|---|---|
| **Desktop** | | | |
| Content width | 1500 | 1420 | **1500** ✅ |
| Heading line-height | 70 | 64.8 | **70.0002** ✅ |
| Heading colour | #000000 | #1a1a1a | **#000000** ✅ |
| Card | 360 × 473 | 360 × 492 | **360 × 474** ✅ |
| Card body | 93, text 360 | 112, text 320 | **94, text 360** ✅ |
| Card gap | 20 | 30 | **20** ✅ |
| Image → text | 20 | 20 | **20** ✅ |
| Title → desc | 10 | 8 | **10** ✅ |
| Button text | 16px/21px | 14px/22.4px | **16px/21px** ✅ |
| Button padding | 16/32 | 16/40 | **16/32** ✅ |
| Header → track | 50 | 50 | **50** ✅ |
| Track → button | 30 | 50 | **30** ✅ |
| Section height | 678 | — | **679** ✅ |
| **Mobile** | | | |
| Heading colour | #000000 | #1a1a1a | **#000000** ✅ |
| Card | 167 × 249 | 167 × 250 | **167 × 249** ✅ exact |
| Image → text | 10 | 12 | **10** ✅ |
| Title → desc | 5 | 4 | **5** ✅ |
| Track → button | 20 | 30 | **20** ✅ |
| Arrow row | 380 | 354 | **380** ✅ (5px clearance each edge) |
| Section height | 388 | 419 | **388** ✅ exact |

Residual: desktop CTA is 297.52 wide against the design's 287 — Nunito Sans is
wider than Proxima Nova, the same ~10px carried by every other button in the
theme. No horizontal overflow at either breakpoint.

---
## Status

- [x] pi-announcement-bar — **fixed & verified**
- [x] header — **fixed & verified**
- [x] pi-main-banner (hero) — **fixed & verified**
- [x] pi-best-sellers (mobile + desktop) — **fixed & verified** (BS-4 closed, not implemented)
- [x] page.piercing-services — **passes, no changes needed** (matches tattoo-services exactly)
- [x] Piercing Services carousel (`.pi-ps__*` in pi-studio-social) — **fixed & verified**
- [x] pi-jewelry-banner — **audited, not fixed** (two low-priority position drifts)
- [ ] pi-main-banner
- [ ] pi-best-sellers
- [ ] pi-jewelry-banner
- [ ] pi-tattoo-services
- [ ] pi-usp
- [ ] pi-studio-social
- [ ] pi-our-studios
- [ ] pi-about-us
- [ ] pi-latest-blogs
- [ ] pi-faqs
- [ ] pi-contact-us
- [ ] pi-instagram-strip
- [ ] footer

---

### SECTION 6 · pi-tattoo-services

**Method note — this section differs from the ones above.** Sections 1–5 were measured
live with `getBoundingClientRect()`. That was not possible here: the in-app browser hits
the storefront password gate and the Chrome extension is not connected. This is a
**static audit of `sections/pi-tattoo-services.liquid` + the live `index.json` settings
against the Figma property panels.** Computed-value surprises (inherited line-height,
font fallback metrics, sub-pixel rounding) would not be caught. Re-measure live before
signing the section off.

#### Figma spec (desktop)

| Node | Spec |
|---|---|
| `Tattoo Services` root | Vertical · Fixed 1500 · Hug 678 · gap **50** |
| `Frame 1171275747` header row | Horizontal · Fill 1500 · Hug 70 · space-between |
| `Frame 48095943` arrows | Horizontal · Hug 120 · Hug 50 · gap **20** |
| `Frame 1171275748` content | Vertical · Fill 1500 · Hug 558 · gap **30** |
| `Row 2` card row | Horizontal · Fill 1500 · Hug 473 · gap **20** |
| `Frame 48095956` card | Vertical · Fixed **360** · Hug 473 · gap **20** |
| `Mask group` image | **360 × 360** |
| `Frame 2123` card body | Fill 360 · Hug **93** · radius bottom 10/10 · border L/R/B 1px **dashed 10,10** · #FFFFFF |
| H2 "Tattoo Services" | Playfair Display 600 · **54 / 70** · uppercase · #000000 |
| Card title | Proxima Nova 600 · **20 / 26** · #000000 |
| Card desc | Proxima Nova 400 · **18 / 29** · #121212 |
| `Btn` | Hug 303 × Fixed 55 · radius 8 · padding 16/32 |
| Btn text | Proxima Nova 600 · **18 / 23** · uppercase · #FFFFFF · w 239 |

#### Figma spec (mobile)

| Node | Spec |
|---|---|
| root | Vertical · Hug 354 · Hug 387 · gap **30** |
| heading | Playfair Display 600 · **30 / 39** · uppercase |
| inner | Vertical · Fill 354 · Hug 318 · gap **20** |
| card row | Horizontal · Hug 728 · Hug 248 · gap 20 |
| `Mask group` | **167 × 167** |
| `Frame 48095942` | Horizontal · Fixed 380 · Hug 35 · space-between (overlay arrows) |

#### Matches — no action

Section gap 50 · content gap 30 · arrow row gap 20 · arrows 50×50 (120 total) ·
header `min-height: 70` · track gap 20 · card `flex: 0 0 360px` · image 360×360 ·
content column 1500 (`max-width: 1580` − 2×40 gutter) · card title 20/26/600/#000000 ·
card desc 18/29/400/#121212 · btn height 55, padding 16/32, radius 8 ·
mobile heading 30 × 1.3 = 39 · mobile card 167 (`(354−20)/2`) · mobile arrows 35px.

#### Findings

**TS-1 · HIGH · Card text block is missing its dashed border**
Figma `Frame 2123` carries `border: right 1px, bottom 1px, left 1px · style Dashed ·
dashes 10,10` with `radius bottom-left 10 / bottom-right 10` — a dashed "U" under the
text. `.pi-ts__card-body` (line 199) declares no border at all. Confirmed absent in the
live render. Border *colour* is not given in the panel (only the #FFFFFF fill), so that
value still needs picking up from Figma.

**TS-2 · HIGH · Card body is ~42px taller than spec**
Figma: card 473 = image 360 + gap 20 + body 93, and body 93 wraps title 26 + desc 57.
Code: `.pi-ts__card` has no row-gap, and `.pi-ts__card-body` has `padding: 16px` +
`gap: 20px`, so the body computes to 16 + 26 + 20 + 57 + 16 = **135px** against a spec
of 93. The 20px image→body gap is being faked by the body's 16px top padding.
Fix direction: `.pi-ts__card { gap: 20px }`, `.pi-ts__card-body { padding: 0 }`.

> ⚠️ **Unresolved contradiction.** `Frame 2123` reports `Gap 20px`, but a Hug height of
> 93 over children of 26 + 57 = 83 only works if the internal gap is **10px**. One of
> the two Figma values is stale. Needs a re-check before TS-2 is implemented — do not
> guess. (Note TS-1's dashed border with `padding: 0` would also put the text flush
> against the border, which argues the frame does carry padding and the 93 is stale.)

**TS-3 · MEDIUM · Button text is 16px, spec is 18px**
Figma btn text: Proxima Nova 600 · 18/23 · width 239. Live `btn_size = 16` and CSS
`line-height: 21px`. The 303px button width in Figma is 239 + 32 + 32 — that only holds
at 18px, so the whole button is currently narrower than spec. Schema default is also 16.

**TS-4 · MEDIUM · Mobile gaps are swapped**
Figma mobile: 30 between heading and content, 20 between card row and button
(39 + 30 + 318 = 387 ✓ · 248 + 20 + 50 = 318 ✓).
Code @767: `.pi-ts__inner { gap: 20px }` (heading→content) while `.pi-ts__content`
keeps the desktop `gap: 30px` (row→button). Exactly reversed.

**TS-5 · MEDIUM · The 989px tablet step breaks the square image ratio**
`@media (max-width: 989px)` sets `.pi-ts__card-img { width: 280px; height: 300px }`.
Both Figma breakpoints use a 1:1 image (360×360 desktop, 167×167 mobile), and the 767px
rule correctly uses `aspect-ratio: 1 / 1`. The 280×300 step is an invented value that
distorts every card image between 768 and 989px. No Figma counterpart was supplied for
this breakpoint.

**TS-6 · LOW · Heading line-height is a ratio, not the spec'd 70px**
Figma H2 is 54/70. `.pi-ts__heading` uses `line-height: 1.3` → 70.2px. 0.2px off, and it
drifts if `heading_size` is ever changed from 54. Cosmetic.

**TS-7 · INFO · Image corner radius unconfirmed**
`.pi-ts__card-img` rounds all four corners at 10px. The Figma `Mask group` panel lists no
radius, so this is unverified. It is *consistent* with the 20px gap separating image from
body (each element carrying its own rounding) — but worth confirming.

#### ✅ RESOLVED — TS-1 … TS-6 fixed and pushed to #170570547477

| ID | Change |
|---|---|
| TS-1 | ~~Dashed border added.~~ **Reverted at the user's instruction** — see the note below. `.pi-ts__card-body` carries no border; the `card_border_color` setting was removed again. |
| TS-2 | 20px image→body gap moved onto `.pi-ts__card`; body `padding: 16px → 0`, internal `gap: 20px → 10px`. Card now computes 360 + 20 + (26+10+58) = **474** against the 473 spec. |
| TS-3 | Button `line-height: 21px → 23px`; `btn_size` schema default and the live `index.json` value both `16 → 18`. |
| TS-4 | @767: `.pi-ts__inner` gap `20 → 30`, `.pi-ts__content` gap pinned to `20`. |
| TS-5 | @989 image `280×300 → 280×280`, restoring 1:1. |
| TS-6 | Heading `line-height: 1.3 → 1.2963` (54 × 1.2963 = 70.0). Kept as a ratio so it survives a `heading_size` change. |

**How TS-2's contradiction was resolved.** The description text node is `Width 360px`
inside a `Fill (360px)` frame — identical, so horizontal padding is **0**. With padding
zeroed, a 93px hug over children of 26 + 57 forces the internal gap to **10px**. The
panel's "Gap 20px" is the stale value, not the 93.

**Residual deltas (not chased without live measurement):**
- Card body computes ~94–95px vs the 93px spec: the description is 2 × 29px = 58 where
  Figma reports 57, plus 1px for the new bottom border. ~1–2px on a 473px card.
- **Dash length is not 10,10.** CSS cannot set dash geometry — the UA picks it, and at
  1px Chrome draws roughly 2px on / 2px off, so it reads finer than the design's long
  dashes. Exact 10,10 with rounded corners needs an inline-SVG background rather than a
  CSS border. Flagged, not implemented.

**Assumptions to confirm:**
- `card_border_color` `#D9D9D9` is a guess.
- The dashed border is kept at mobile. The mobile panels do not cover the card body, so
  there is no evidence either way; carrying it over was the less inventive choice.

**Still unverified live** — this whole section remains a static audit. TS-7 (image corner
radius) was not in scope and is untouched.

#### ↩︎ TS-1 REVERTED

The dashed border was removed on request. `.pi-ts__card-body` now has no border, the
`--pi-ts-card-border-color` variable and the `card_border_color` setting are gone, and
the bottom `border-radius` (which predates TS-1) is untouched. TS-2 … TS-6 stand.

This leaves a **known, accepted divergence from Figma**: `Frame 2123` specifies
`border right/bottom/left 1px · style Dashed · dashes 10,10`, and the build does not
render it. Recorded here so a later audit does not re-raise it as a new finding.

Also corrected: an earlier note in this log said the border was kept at mobile. It was
not — the pushed version had `border: 0` at ≤767px. Moot now that the border is gone.

---

### SECTION 7 · pi-tattoo-services-grid  (Tattoo Services **and** Piercing Services pages)

Audited against the **same Figma card spec as Section 6**, per instruction.

> ⚠️ **One section, two pages.** `templates/page.tattoo-services.json` and
> `templates/page.piercing-services.json` both render `pi-tattoo-services-grid` with
> byte-identical settings. There is no piercing-only variant — every fix below lands on
> both pages.

Method: static audit (same constraint as Section 6 — no live measurement available).

#### Matches — no action

Content column 1500 (`content_width` 1580 − 2×40 gutter, `box-sizing: border-box`) ·
4 columns · `column-gap: 20px` → card = (1500−60)/4 = **360** ✓ ·
`aspect-ratio: 1/1` + radius 10 → **360 × 360** ✓ · image→body gap `margin-top: 20px` ✓ ·
title **20 / 26 / 600 / #000000** ✓ · desc colour #121212 ✓ · no body padding ✓ ·
2 columns at mobile ✓.

The grid already had right two things the carousel got wrong: the 20px image→body gap,
and a square image at every breakpoint.

#### Findings

| ID | Sev | Issue |
|---|---|---|
| PS-1 | HIGH | Card description `16 / 26`; spec is **18 / 29** |
| PS-2 | MED | Card body internal gap `5px`; spec is **10px** |
| PS-3 | MED | Mobile gutters `24px` → 161px card; spec needs **18px** → 167px |
| PS-4 | MED | No mobile card typography at all — desktop type persists to 390px |
| PS-5 | LOW | Heading `line-height: 1.3` vs the 54/70 ratio (moot: `heading` is empty) |
| PS-6 | INFO | `row-gap: 30px` has no Figma counterpart (spec is a single-row carousel) |

#### ✅ RESOLVED — PS-1 … PS-5 fixed and pushed to #170570547477

| ID | Change |
|---|---|
| PS-1 | `.pi-tsg__card-desc` `line-height: 26px → 29px`; `card_desc_size` `16 → 18` in the schema default **and** in both page templates. Round-trip verified on the remote. |
| PS-2 | `.pi-tsg__card-body` `gap: 5px → 10px`. |
| PS-3 | New `@media (max-width: 767px)` with `padding-inline: 18px` → (390−36−20)/2 = **167** ✓. The 989px step keeps 24px so tablet is unaffected. |
| PS-4 | Same 767px block: `card-body { gap: 5px; margin-top: 10px }`, title `18/23`, desc `14/22` → 10+23+5+44 = **82** against the 81px spec. |
| PS-5 | `line-height: 1.3 → 1.2963`. |

PS-6 left alone — nothing to check it against.

**⚠️ PS-4 is an inference, not a measurement.** The mobile panels supplied cover layout
only (Mask group 167×167, row 248, gaps) — no card typography. Those type sizes are
carried over from `pi-tattoo-services` at the same breakpoint, and the 82-vs-81 arithmetic
is the only evidence they are right. Flagged in a code comment too. Replace if a mobile
type spec lands.

**Not re-raised:** the dashed border. Figma specifies it, the build omits it deliberately
— see the TS-1 revert note.
