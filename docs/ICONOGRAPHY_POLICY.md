# MANDATORY REPOSITORY RULE: FLATICON ICONOGRAPHY ONLY

## 1. Core Rule

- **NEVER use unicode emojis** (e.g., ⚽, 🏆, 🥇, 🥈, 🥉, 🎯, ⚡, 🔔, 📣, 📊, 👥, 🗓️, 📍, ⏱️, 💥, 🏃, 👤, ➕, ➔, ★) in templates, TS helper functions, notification payloads, or HTML comments.
- **NEVER use image-URL based icons** for standard UI indicators.
- **ALWAYS use Flaticon UIcons** (`<i class="fi fi-rr-..."></i>` or `<i class="fi fi-sr-..."></i>`).

## 2. Icon Standard Mappings

- **Sports Icons**:
  - Football: `fi fi-rr-football`
  - Cricket: `fi fi-rr-bowling`
  - Badminton / Default: `fi fi-rr-trophy`
- **Rankings & Medals**:
  - 1st Place: `<i class="fi fi-rr-medal text-amber-400"></i> 1`
  - 2nd Place: `<i class="fi fi-rr-medal text-slate-300"></i> 2`
  - 3rd Place: `<i class="fi fi-rr-medal text-amber-600"></i> 3`
- **Navigation & Actions**:
  - Arrows: `<i class="fi fi-rr-angle-small-right"></i>` or `<i class="fi fi-rr-arrow-right"></i>`
  - Add / New: `<i class="fi fi-rr-plus"></i>`
  - Default Login / Star: `<i class="fi fi-rr-star text-amber-400"></i>`
  - Notifications: `<i class="fi fi-rr-bell"></i>`
  - Invitations: `<i class="fi fi-rr-envelope"></i>`
  - Venues: `<i class="fi fi-rr-marker"></i>`
  - Calendar / Fixtures: `<i class="fi fi-rr-calendar"></i>`
  - Top Scorers / Targets: `<i class="fi fi-rr-target"></i>`

## 3. Enforcement

- Any new features, components, dialogs, or helper functions MUST adhere strictly to Flaticons.
- If a helper method in TS returns an icon class name (e.g. `getSportIconClass()`), it MUST return a `fi fi-rr-*` CSS string, NOT an emoji.
