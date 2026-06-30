# PuertoInk Shopify Theme — Work Completed

**Theme:** Horizon-theme / dev (ID: #170570547477)
**Branch:** dev
**Last Updated:** 2026-06-30

---

## Overview

Custom Shopify theme built on top of the Horizon base theme for **Puerto Ink** — a tattoo and piercing studio chain with locations in Crete, Athens, Antwerp, and Amsterdam. All custom sections use the `pi-` prefix.

---

## Pages Built

### 1. Home Page (`templates/index.json`)

Sections rendered in order:

| # | Section File | Description |
|---|---|---|
| 1 | `pi-main-banner` | Hero banner — full-width main image + two side banners (Tattoos / Piercings) with CTA button |
| 2 | `pi-best-sellers` | Product grid pulling from `best-sellers` collection, up to 8 products, with explore link |
| 3 | `pi-jewelry-banner` | Full-width jewelry promotional banner with background image, left/right mask images, heading, and CTA |
| 4 | `pi-tattoo-services` | 4-card grid showcasing tattoo styles (Realistic, Micro-Realistic, Blackwork, Fine Line) |
| 5 | `pi-usp` | USP strip (Authentic / Premium / Inclusive / Creative icons) over a background image |
| 6 | `pi-studio-social` | Combined section: Piercing Services cards + Happy Customers testimonial + Trusted By celebrity grid |
| 7 | `pi-our-studios` | 4-city studio cards with hover images (Crete, Athens, Antwerp, Amsterdam) over dark overlay background |
| 8 | `pi-about-us` | Two-column about section with dual images, body text, and two CTAs |
| 9 | `pi-latest-blogs` | 3-card manual blog post grid with image, date, title, and link |
| 10 | `pi-faqs` | Accordion FAQ section with 5 questions, collapsible answers |
| 11 | `pi-contact-us` | Contact form with 4 location tabs (Crete, Athens, Antwerp, Amsterdam), background image |
| 12 | `pi-instagram-strip` | Static 6-image Instagram strip |

---

### 2. About Us Page (`templates/page.about.json`)

Sections rendered in order:

| # | Section File | Description |
|---|---|---|
| 1 | `pi-page-hero` | Full-width page hero with heading "About Us" and background image |
| 2 | `pi-founders` | Founders story — 4 rich-text paragraphs with image, covering history from 2016 to global expansion |
| 3 | `pi-team-banner` | Team introduction with full-width team photo and descriptive text |
| 4 | `pi-vision` | Vision section with heading, subheading, rich text, and image |
| 5 | `pi-usp` | USP strip (reused component) |
| 6 | `pi-trusted-by` | Celebrity/notable client grid with names and photos |
| 7 | `pi-our-studios` | Studio city cards (reused component) |
| 8 | `pi-faqs` | FAQ accordion (reused component) |
| 9 | `pi-contact-us` | Contact form (reused component) |
| 10 | `pi-instagram-strip` | Instagram strip (reused component) |

---

## Custom Sections Created

### `sections/pi-main-banner.liquid` (613 lines)
Hero section for the homepage. Three-panel layout: large main banner on the left with headline, subheading, and CTA button; two stacked smaller banners on the right with labels (Tattoos / Piercings).

### `sections/pi-announcement-bar.liquid` (293 lines)
Custom announcement bar with marquee-style scrolling text, configurable message, and background color.

### `sections/pi-usp.liquid` (412 lines)
USP (Unique Selling Points) strip with icon + label pairs over a background image with configurable overlay opacity. Supports up to 4 USP blocks.

### `sections/pi-best-sellers.liquid` (816 lines)
Product collection grid with heading, configurable collection source, max products count, and an "Explore" CTA link below the grid.

### `sections/pi-tattoo-services.liquid` (692 lines)
Service card grid. Each card has an image, title, and description. Supports up to N cards as blocks. Includes a section-level CTA button.

### `sections/pi-jewelry-banner.liquid` (571 lines)
Wide promotional banner with a full-width background image, overlapping left and right mask images, centered heading/subheading/CTA.

### `sections/pi-about-us.liquid` (407 lines)
Two-column layout: stacked image pair on one side, heading/subheading/body text/dual CTA buttons on the other.

### `sections/pi-founders.liquid` (349 lines)
Founders story section with a large image and four rich-text content blocks arranged alongside it.

### `sections/pi-vision.liquid` (374 lines)
Vision section with heading, subheading, rich-text body, and a side image.

### `sections/pi-team-banner.liquid` (247 lines)
Full-width team banner with heading, descriptive text, and a full-width team photo.

### `sections/pi-trusted-by.liquid` (465 lines)
"Trusted By The Best" celebrity grid. Each block is a photo + name pair. Includes decorative image and a CTA button.

### `sections/pi-happy-customers.liquid` (722 lines)
Customer testimonials section with rating stars, review text, avatar, author name, and role.

### `sections/pi-instagram-strip.liquid` (194 lines)
Static horizontal strip of 6 configurable Instagram-style square images.

### `sections/pi-jewelry-banner.liquid` — see above

### `sections/pi-latest-blogs.liquid` (520 lines)
Manual blog post grid with 3 cards. Each card has an image, date, title, and link. Includes a heading and "View All" CTA.

### `sections/pi-newsletter-footer.liquid` (614 lines)
Newsletter signup section with heading, subtext, email input, and submit button.

### `sections/pi-our-studios.liquid` (473 lines)
Studio location grid. Each block represents a city. Hover reveals a city image. Section has a dark overlay background image.

### `sections/pi-page-hero.liquid` (215 lines)
Reusable full-width page hero with configurable heading, background image, and overlay opacity. Used at the top of inner pages.

### `sections/pi-studio-social.liquid` (766 lines)
Combined multi-purpose section with three sub-layouts:
- Piercing Services cards (image, title, description)
- Happy Customers testimonial with star rating
- Trusted By celebrity photo grid with decorative element

### `sections/pi-tattoo-services.liquid` — see above

### `sections/pi-contact-us.liquid` (464 lines)
Contact form section with name, email, phone, message fields. Location tabs as blocks (Crete, Athens, Antwerp, Amsterdam). Background image with overlay.

### `sections/pi-faqs.liquid` (442 lines)
Accordion-style FAQ. Each block is a question/answer pair. Includes a "View All FAQs" CTA button.

---

## Modified Files

### `sections/header.liquid`
Modified to integrate custom header layout with the PI brand styling.

### `snippets/header-actions.liquid`
Updated header action icons/links.

### `sections/pi-main-banner.liquid`
Iteratively refined — image sizing rules updated to use `width:100%; height:auto` for wide banners to prevent zoom/blur at sub-native viewport widths.

### `assets/base.css`
Global CSS additions for custom PI components and layout overrides.

### `config/settings_data.json`
Theme global settings updated (colors, fonts, etc.).

### `sections/header-group.json` / `sections/footer-group.json`
Header and footer group configurations updated.

### `sections/product-list.liquid`
Product listing section adjustments.

---

## Templates

| Template | Purpose |
|---|---|
| `templates/index.json` | Home page — 12 PI sections |
| `templates/page.about.json` | About Us page — 10 sections including page hero |
| `templates/page.contact.json` | Contact page |

---

## Key Conventions & Rules

- **Push command:** Always `shopify theme push --only <file>` — never full push (overwrites live settings).
- **Target theme:** Always push to **Horizon-theme/dev (ID #170570547477)**, never the Development theme.
- **JSON files:** Always pull `templates/*.json` and `config/*.json` from remote before editing — local copies are stale. Pull → edit → push.
- **Image sizing:** Wide banners use `width:100%; height:auto`. No fixed heights with `object-fit:cover` unless image dimensions are verified.
- **No torn edges:** No ink/brush-stroke overlay effects on images. Clean `overflow:hidden` cropping only.
- **No unsolicited edits:** Do not modify any section already approved by the client unless explicitly asked.
