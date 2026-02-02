# CoinVoyage PayKit Theme Customization - Implementation Plan

## Overview

This document outlines the implementation plan for customizing themes in the CoinVoyage PayKit widget. The PayKit provides both pre-built themes and extensive custom theme options.

---

## 1. Available Pre-built Themes

| Theme | Description | Use Case |
|-------|-------------|----------|
| `auto` | Automatically matches system preference | General purpose |
| `web95` | Retro Windows 95 aesthetic | Nostalgic/fun applications |
| `retro` | Vintage retro style | Gaming/creative platforms |
| `soft` | Soft, rounded, gentle appearance | Consumer-friendly apps |
| `midnight` | Dark midnight color scheme | Dark-mode focused apps |
| `minimal` | Clean, minimal design | Professional/enterprise |
| `rounded` | Extra rounded corners | Modern, friendly UIs |
| `nouns` | Nouns DAO inspired pixelated style | Web3/NFT platforms |

---

## 2. Theme Configuration Locations

### 2.1 Global Theme (Recommended)
- **File:** `app/providers.tsx`
- **Component:** `PayKitProvider`
- **Props:** `theme`, `mode`, `customTheme`
- **Scope:** Applies to all PayButton instances in the app

### 2.2 Per-Button Theme (Override)
- **File:** Any component using `PayButton`
- **Component:** `PayButton`
- **Props:** `theme`, `mode`, `customTheme`
- **Scope:** Overrides global theme for specific button

---

## 3. Implementation Tasks

### Task 1: Choose Base Theme
**Priority:** High
**Estimated Effort:** 5 minutes

**Steps:**
1. Review all available themes visually (test each in browser)
2. Select the theme closest to your brand aesthetic
3. Update `PayKitProvider` with chosen theme:
   - Locate `app/providers.tsx`
   - Find `PayKitProvider` component
   - Set `theme` prop to chosen value

**Acceptance Criteria:**
- [ ] All pre-built themes tested
- [ ] Base theme selected and applied
- [ ] Modal displays with chosen theme

---

### Task 2: Configure Light/Dark Mode
**Priority:** High
**Estimated Effort:** 5 minutes

**Steps:**
1. Determine app's color mode strategy:
   - `"light"` - Always light mode
   - `"dark"` - Always dark mode
   - `"auto"` - Follow system preference
2. Update `PayKitProvider` with `mode` prop
3. Test modal in both light and dark contexts

**Acceptance Criteria:**
- [ ] Mode prop configured
- [ ] Modal respects chosen mode
- [ ] Consistent with app's overall theme

---

### Task 3: Identify Custom Theme Requirements
**Priority:** Medium
**Estimated Effort:** 30 minutes

**Steps:**
1. Document brand colors:
   - Primary color (buttons, accents)
   - Secondary color (backgrounds)
   - Text colors (primary, muted)
   - Border colors
   - Error/success colors
2. Document typography preferences:
   - Font family
   - Font sizes
   - Font weights
3. Document spacing/sizing preferences:
   - Border radius values
   - Padding values
   - Button sizes
4. Create a design spec document or Figma reference

**Acceptance Criteria:**
- [ ] Brand color palette documented
- [ ] Typography specs documented
- [ ] Spacing/sizing preferences documented

---

### Task 4: Implement Custom Theme Object
**Priority:** Medium
**Estimated Effort:** 1-2 hours

**Steps:**
1. Create custom theme configuration object
2. Map brand colors to PayKit CSS variables:

**Available CSS Variables (partial list):**

```
Button Styling:
- --ck-connectbutton-font-size
- --ck-connectbutton-color
- --ck-connectbutton-background
- --ck-connectbutton-hover-color
- --ck-connectbutton-hover-background
- --ck-connectbutton-active-color
- --ck-connectbutton-active-background

Primary Button:
- --ck-primary-button-border-radius
- --ck-primary-button-color
- --ck-primary-button-background
- --ck-primary-button-hover-background

Modal Styling:
- --ck-modal-background
- --ck-modal-box-shadow
- --ck-modal-border-radius

Body/Text:
- --ck-body-color
- --ck-body-color-muted
- --ck-body-background
- --ck-body-background-secondary

Balance Display:
- --ck-connectbutton-balance-color
- --ck-connectbutton-balance-background
```

3. Add `customTheme` prop to `PayKitProvider`
4. Test all modal states with custom theme

**Acceptance Criteria:**
- [ ] Custom theme object created
- [ ] All brand colors mapped to CSS variables
- [ ] Modal displays correctly with custom theme
- [ ] All interactive states (hover, active) styled

---

### Task 5: Style the PayButton Trigger
**Priority:** Medium
**Estimated Effort:** 30 minutes

**Steps:**
1. Customize the "Pay With Crypto" button appearance
2. Update `style` prop on `PayButton` component:
   - Background color/gradient
   - Text color
   - Border radius
   - Padding
   - Font size/weight
   - Hover effects (if using custom button)
3. Alternatively, use `PayButton.Custom` for full control:
   - Render completely custom button element
   - Use `show()` function to trigger modal

**Acceptance Criteria:**
- [ ] PayButton matches site design
- [ ] Button has appropriate hover/active states
- [ ] Button is accessible (contrast, focus states)

---

### Task 6: Test Across Devices and Browsers
**Priority:** High
**Estimated Effort:** 1 hour

**Steps:**
1. Test on desktop browsers:
   - Chrome
   - Firefox
   - Safari
   - Edge
2. Test on mobile devices:
   - iOS Safari
   - Android Chrome
3. Test responsive behavior:
   - Modal positioning
   - Button sizing
   - Text readability
4. Test with wallet extensions:
   - MetaMask
   - Phantom
   - Sui Wallet
5. Test accessibility:
   - Keyboard navigation
   - Screen reader compatibility
   - Color contrast

**Acceptance Criteria:**
- [ ] Works on all major browsers
- [ ] Mobile responsive
- [ ] Wallet connections functional
- [ ] Meets accessibility standards

---

### Task 7: Create Theme Variants (Optional)
**Priority:** Low
**Estimated Effort:** 2-3 hours

**Steps:**
1. Create multiple theme configurations for different contexts:
   - Default theme
   - High contrast theme
   - Seasonal/promotional themes
2. Implement theme switching logic
3. Store theme preference (localStorage/database)
4. Add UI for theme selection if user-configurable

**Acceptance Criteria:**
- [ ] Multiple themes available
- [ ] Theme switching works smoothly
- [ ] User preference persisted

---

## 4. File Structure Reference

```
coinvoyage-payment/
├── app/
│   ├── providers.tsx      # PayKitProvider with theme config
│   ├── page.tsx           # PayButton implementation
│   ├── globals.css        # Global styles & overrides
│   └── layout.tsx         # Root layout
├── lib/
│   └── themes.ts          # (Optional) Custom theme definitions
├── .env.local             # API key configuration
└── THEME_CUSTOMIZATION_PLAN.md  # This document
```

---

## 5. Quick Reference: Applying a Theme

### Pre-built Theme
```
PayKitProvider props:
  - apiKey: "your-api-key"
  - theme: "soft" | "web95" | "retro" | "midnight" | "minimal" | "rounded" | "nouns"
  - mode: "light" | "dark" | "auto"
```

### Custom Theme
```
PayKitProvider props:
  - apiKey: "your-api-key"
  - theme: "soft" (base theme)
  - mode: "dark"
  - customTheme: {
      "--ck-primary-button-background": "#your-color",
      "--ck-body-background": "#your-color",
      ... (other CSS variables)
    }
```

---

## 6. Resources

- **CoinVoyage Docs:** https://docs.coinvoyage.io/overview/sdk-reference
- **Theme Examples:** Test each theme in development environment
- **Support:** help@coinvoyage.io

---

## 7. Checklist Summary

- [ ] Task 1: Choose Base Theme
- [ ] Task 2: Configure Light/Dark Mode
- [ ] Task 3: Identify Custom Theme Requirements
- [ ] Task 4: Implement Custom Theme Object
- [ ] Task 5: Style the PayButton Trigger
- [ ] Task 6: Test Across Devices and Browsers
- [ ] Task 7: Create Theme Variants (Optional)

---

*Document created: January 12, 2026*
*Last updated: January 12, 2026*
