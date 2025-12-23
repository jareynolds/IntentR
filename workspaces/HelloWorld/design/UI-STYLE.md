# UI Style Specification: Dark Blue

**Generated:** 2025-12-23T19:15:10.290Z
**Style ID:** darkblue


## Overview

This document provides comprehensive specifications for implementing the Dark Blue UI style system in your application. It includes detailed color palettes, typography scales, spacing systems, and component styles that form the visual foundation of your user interface.

## Background Colors

The background colors define the foundational surfaces of your application.

**Main Background**
- **Hex:** `#FFFFFF`
- **Usage:** Page background, body background
- **CSS Variable:** `--color-background`

```css
body {
  background-color: #FFFFFF;
  /* or */
  background-color: var(--color-background);
}
```

**Surface**
- **Hex:** `#F5F5F5`
- **Usage:** Cards, panels, content areas
- **CSS Variable:** `--color-surface`

```css
.card {
  background-color: #F5F5F5;
  /* or */
  background-color: var(--color-surface);
}
```

**Elevated**
- **Hex:** `#FFFFFF`
- **Usage:** Modals, dropdowns, popovers
- **CSS Variable:** `--color-elevated`

```css
.modal {
  background-color: #FFFFFF;
  /* or */
  background-color: var(--color-elevated);
}
```

## Color Palette

### Primary Colors


**Maastricht Blue**
- **Hex:** `#081534`
- **Usage:** Primary dark, headers, key elements
- **CSS Variable:** `--color-primary-maastricht-blue`

```css
.element {
  background-color: #081534;
  /* or */
  background-color: var(--color-primary-maastricht-blue);
}
```


**Dark Cerulean**
- **Hex:** `#133A7C`
- **Usage:** Primary brand color, CTAs, buttons
- **CSS Variable:** `--color-primary-dark-cerulean`

```css
.element {
  background-color: #133A7C;
  /* or */
  background-color: var(--color-primary-dark-cerulean);
}
```


**Lapis Lazuli**
- **Hex:** `#2A6BAC`
- **Usage:** Secondary actions, links
- **CSS Variable:** `--color-primary-lapis-lazuli`

```css
.element {
  background-color: #2A6BAC;
  /* or */
  background-color: var(--color-primary-lapis-lazuli);
}
```


**Picton Blue**
- **Hex:** `#47A8E5`
- **Usage:** Accents, highlights, interactive elements
- **CSS Variable:** `--color-primary-picton-blue`

```css
.element {
  background-color: #47A8E5;
  /* or */
  background-color: var(--color-primary-picton-blue);
}
```


### Neutral Colors


**White**
- **Hex:** `#FFFFFF`
- **Usage:** Backgrounds, cards, contrast
- **CSS Variable:** `--color-neutral-white`

```css
.element {
  color: #FFFFFF;
  /* or */
  color: var(--color-neutral-white);
}
```


**Header Text**
- **Hex:** `#FFFFFF`
- **Usage:** Header text on dark backgrounds
- **CSS Variable:** `--color-neutral-header-text`

```css
.element {
  color: #FFFFFF;
  /* or */
  color: var(--color-neutral-header-text);
}
```


**Silver Sand**
- **Hex:** `#C6C6C6`
- **Usage:** Borders, dividers, disabled states
- **CSS Variable:** `--color-neutral-silver-sand`

```css
.element {
  color: #C6C6C6;
  /* or */
  color: var(--color-neutral-silver-sand);
}
```


**Slogan Gray**
- **Hex:** `#3E5966`
- **Usage:** Secondary text
- **CSS Variable:** `--color-neutral-slogan-gray`

```css
.element {
  color: #3E5966;
  /* or */
  color: var(--color-neutral-slogan-gray);
}
```


**Text Primary**
- **Hex:** `#212121`
- **Usage:** Primary body text
- **CSS Variable:** `--color-neutral-text-primary`

```css
.element {
  color: #212121;
  /* or */
  color: var(--color-neutral-text-primary);
}
```


### Semantic Colors


**Success**
- **Hex:** `#4caf50`
- **Usage:** Success messages, confirmations
- **CSS Variable:** `--color-success`

```css
.alert-success {
  background-color: #4caf50;
  border-color: #4caf50;
}
```


**Warning**
- **Hex:** `#ff9800`
- **Usage:** Warnings, alerts
- **CSS Variable:** `--color-warning`

```css
.alert-warning {
  background-color: #ff9800;
  border-color: #ff9800;
}
```


**Error**
- **Hex:** `#f44336`
- **Usage:** Errors, destructive actions
- **CSS Variable:** `--color-error`

```css
.alert-error {
  background-color: #f44336;
  border-color: #f44336;
}
```


**Info**
- **Hex:** `#47A8E5`
- **Usage:** Information, help text
- **CSS Variable:** `--color-info`

```css
.alert-info {
  background-color: #47A8E5;
  border-color: #47A8E5;
}
```


## Typography System

### Typography Scale


**Display 1**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 6rem
- **Font Weight:** 300
- **Font Style:** normal
- **Line Height:** 1
- **CSS Class:** `.text-display-1`

```css
.text-display-1 {
  font-family: Inter, system-ui, sans-serif;
  font-size: 6rem;
  font-weight: 300;
  font-style: normal;
  line-height: 1;
}
```

**HTML Usage:**
```html
<h1 class="text-display-1">Heading Text</h1>
```


**Display 2**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 3.75rem
- **Font Weight:** 300
- **Font Style:** normal
- **Line Height:** 1
- **CSS Class:** `.text-display-2`

```css
.text-display-2 {
  font-family: Inter, system-ui, sans-serif;
  font-size: 3.75rem;
  font-weight: 300;
  font-style: normal;
  line-height: 1;
}
```

**HTML Usage:**
```html
<h1 class="text-display-2">Heading Text</h1>
```


**Headline**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 3rem
- **Font Weight:** 400
- **Font Style:** normal
- **Line Height:** 1.2
- **CSS Class:** `.text-headline`

```css
.text-headline {
  font-family: Inter, system-ui, sans-serif;
  font-size: 3rem;
  font-weight: 400;
  font-style: normal;
  line-height: 1.2;
}
```

**HTML Usage:**
```html
<h1 class="text-headline">Heading Text</h1>
```


**Title**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 2.125rem
- **Font Weight:** 500
- **Font Style:** normal
- **Line Height:** 1.3
- **CSS Class:** `.text-title`

```css
.text-title {
  font-family: Inter, system-ui, sans-serif;
  font-size: 2.125rem;
  font-weight: 500;
  font-style: normal;
  line-height: 1.3;
}
```

**HTML Usage:**
```html
<h1 class="text-title">Heading Text</h1>
```


**Subheading**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 1.5rem
- **Font Weight:** 400
- **Font Style:** normal
- **Line Height:** 1.5
- **CSS Class:** `.text-subheading`

```css
.text-subheading {
  font-family: Inter, system-ui, sans-serif;
  font-size: 1.5rem;
  font-weight: 400;
  font-style: normal;
  line-height: 1.5;
}
```

**HTML Usage:**
```html
<h1 class="text-subheading">Heading Text</h1>
```


**Body 1**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 1rem
- **Font Weight:** 400
- **Font Style:** normal
- **Line Height:** 1.6
- **CSS Class:** `.text-body-1`

```css
.text-body-1 {
  font-family: Inter, system-ui, sans-serif;
  font-size: 1rem;
  font-weight: 400;
  font-style: normal;
  line-height: 1.6;
}
```

**HTML Usage:**
```html
<h1 class="text-body-1">Heading Text</h1>
```


**Body 2**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 0.875rem
- **Font Weight:** 400
- **Font Style:** normal
- **Line Height:** 1.5
- **CSS Class:** `.text-body-2`

```css
.text-body-2 {
  font-family: Inter, system-ui, sans-serif;
  font-size: 0.875rem;
  font-weight: 400;
  font-style: normal;
  line-height: 1.5;
}
```

**HTML Usage:**
```html
<h1 class="text-body-2">Heading Text</h1>
```


**Caption**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 0.75rem
- **Font Weight:** 400
- **Font Style:** normal
- **Line Height:** 1.4
- **CSS Class:** `.text-caption`

```css
.text-caption {
  font-family: Inter, system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 400;
  font-style: normal;
  line-height: 1.4;
}
```

**HTML Usage:**
```html
<h1 class="text-caption">Heading Text</h1>
```


### Font Stack Recommendation

Use a modern, cross-platform font stack for optimal readability:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
               'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
               sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

## Spacing System

### Spacing Scale


**xs**
- **Size:** 8px
- **CSS Variable:** `--spacing-xs`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 8px;
  padding: 8px;
  gap: 8px;
  /* or */
  margin: var(--spacing-xs);
}
```


**sm**
- **Size:** 16px
- **CSS Variable:** `--spacing-sm`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 16px;
  padding: 16px;
  gap: 16px;
  /* or */
  margin: var(--spacing-sm);
}
```


**md**
- **Size:** 24px
- **CSS Variable:** `--spacing-md`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 24px;
  padding: 24px;
  gap: 24px;
  /* or */
  margin: var(--spacing-md);
}
```


**lg**
- **Size:** 32px
- **CSS Variable:** `--spacing-lg`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 32px;
  padding: 32px;
  gap: 32px;
  /* or */
  margin: var(--spacing-lg);
}
```


**xl**
- **Size:** 48px
- **CSS Variable:** `--spacing-xl`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 48px;
  padding: 48px;
  gap: 48px;
  /* or */
  margin: var(--spacing-xl);
}
```


**2xl**
- **Size:** 64px
- **CSS Variable:** `--spacing-2xl`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 64px;
  padding: 64px;
  gap: 64px;
  /* or */
  margin: var(--spacing-2xl);
}
```


### Spacing Usage Guidelines

- **xs (8px):** Tight spacing, inline elements, compact layouts
- **sm (16px):** Default spacing between related elements
- **md (24px):** Section spacing, card padding
- **lg (32px):** Large section gaps, major layout divisions
- **xl (48px):** Hero sections, major page divisions
- **2xl (64px):** Maximum spacing for dramatic separation

## Button Styles

### Primary Button

**Colors:**
- Background: `#133A7C`
- Hover: `#081534`
- Text: `#FFFFFF`

**Implementation:**

```css
.btn-primary {
  background-color: #133A7C;
  color: #FFFFFF;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-primary:hover {
  background-color: #081534;
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}
```

```html
<button class="btn-primary">Primary Action</button>
```

### Secondary Button

**Colors:**
- Background: `#2A6BAC`
- Hover: `#133A7C`
- Text: `#FFFFFF`

**Implementation:**

```css
.btn-secondary {
  background-color: #2A6BAC;
  color: #FFFFFF;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-secondary:hover {
  background-color: #133A7C;
}
```

```html
<button class="btn-secondary">Secondary Action</button>
```

### Accent Button

**Colors:**
- Background: `#47A8E5`
- Hover: `#2A6BAC`
- Text: `#FFFFFF`

**Implementation:**

```css
.btn-accent {
  background-color: #47A8E5;
  color: #FFFFFF;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-accent:hover {
  background-color: #2A6BAC;
}
```

```html
<button class="btn-accent">Accent Action</button>
```

## CSS Variables Implementation

For easier maintenance and theming, implement CSS variables:

```css
:root {
  /* Background Colors */
  --color-background: #FFFFFF;
  --color-surface: #F5F5F5;
  --color-elevated: #FFFFFF;

  /* Primary Colors */
  --color-primary-maastricht-blue: #081534;
  --color-primary-dark-cerulean: #133A7C;
  --color-primary-lapis-lazuli: #2A6BAC;
  --color-primary-picton-blue: #47A8E5;

  /* Neutral Colors */
  --color-neutral-white: #FFFFFF;
  --color-neutral-header-text: #FFFFFF;
  --color-neutral-silver-sand: #C6C6C6;
  --color-neutral-slogan-gray: #3E5966;
  --color-neutral-text-primary: #212121;

  /* Semantic Colors */
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-error: #f44336;
  --color-info: #47A8E5;

  /* Spacing */
  --spacing-xs: 8px;
  --spacing-sm: 16px;
  --spacing-md: 24px;
  --spacing-lg: 32px;
  --spacing-xl: 48px;
  --spacing-2xl: 64px;

  /* Typography */
  --font-family-display-1: Inter, system-ui, sans-serif;
  --font-size-display-1: 6rem;
  --font-weight-display-1: 300;
  --font-style-display-1: normal;
  --line-height-display-1: 1;
  --font-family-display-2: Inter, system-ui, sans-serif;
  --font-size-display-2: 3.75rem;
  --font-weight-display-2: 300;
  --font-style-display-2: normal;
  --line-height-display-2: 1;
  --font-family-headline: Inter, system-ui, sans-serif;
  --font-size-headline: 3rem;
  --font-weight-headline: 400;
  --font-style-headline: normal;
  --line-height-headline: 1.2;
  --font-family-title: Inter, system-ui, sans-serif;
  --font-size-title: 2.125rem;
  --font-weight-title: 500;
  --font-style-title: normal;
  --line-height-title: 1.3;
  --font-family-subheading: Inter, system-ui, sans-serif;
  --font-size-subheading: 1.5rem;
  --font-weight-subheading: 400;
  --font-style-subheading: normal;
  --line-height-subheading: 1.5;
  --font-family-body-1: Inter, system-ui, sans-serif;
  --font-size-body-1: 1rem;
  --font-weight-body-1: 400;
  --font-style-body-1: normal;
  --line-height-body-1: 1.6;
  --font-family-body-2: Inter, system-ui, sans-serif;
  --font-size-body-2: 0.875rem;
  --font-weight-body-2: 400;
  --font-style-body-2: normal;
  --line-height-body-2: 1.5;
  --font-family-caption: Inter, system-ui, sans-serif;
  --font-size-caption: 0.75rem;
  --font-weight-caption: 400;
  --font-style-caption: normal;
  --line-height-caption: 1.4;

  /* Button Styles */
  --btn-primary-bg: #133A7C;
  --btn-primary-hover: #081534;
  --btn-primary-color: #FFFFFF;

  --btn-secondary-bg: #2A6BAC;
  --btn-secondary-hover: #133A7C;
  --btn-secondary-color: #FFFFFF;

  --btn-accent-bg: #47A8E5;
  --btn-accent-hover: #2A6BAC;
  --btn-accent-color: #FFFFFF;
}
```

## Component Examples

### Card Component

```css
.card {
  background-color: var(--color-neutral-white);
  border: 1px solid var(--color-neutral-gray-300);
  border-radius: 8px;
  padding: var(--spacing-md);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-title {
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-title);
  color: var(--color-primary-maastricht-blue);
  margin-bottom: var(--spacing-sm);
}

.card-content {
  font-size: var(--font-size-body-1);
  line-height: var(--line-height-body-1);
  color: var(--color-neutral-text-primary);
}
```

### Form Input

```css
.form-input {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--font-size-body-1);
  border: 1px solid var(--color-neutral-gray-300);
  border-radius: 6px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary-dark-cerulean);
  box-shadow: 0 0 0 3px rgba(19, 58, 124, 0.1);
}

.form-input:disabled {
  background-color: var(--color-neutral-gray-100);
  cursor: not-allowed;
}

.form-input.error {
  border-color: var(--color-error);
}
```

### Alert Component

```css
.alert {
  padding: var(--spacing-md);
  border-radius: 6px;
  margin-bottom: var(--spacing-md);
}

.alert-success {
  background-color: color-mix(in srgb, var(--color-success) 15%, white);
  border-left: 4px solid var(--color-success);
  color: var(--color-success);
}

.alert-warning {
  background-color: color-mix(in srgb, var(--color-warning) 15%, white);
  border-left: 4px solid var(--color-warning);
  color: var(--color-warning);
}

.alert-error {
  background-color: color-mix(in srgb, var(--color-error) 15%, white);
  border-left: 4px solid var(--color-error);
  color: var(--color-error);
}

.alert-info {
  background-color: color-mix(in srgb, var(--color-info) 15%, white);
  border-left: 4px solid var(--color-info);
  color: var(--color-info);
}
```

## Accessibility Considerations

### Color Contrast

Ensure all text meets WCAG 2.1 AA standards (minimum 4.5:1 contrast ratio for normal text):

- Test all color combinations using tools like WebAIM Contrast Checker
- Primary text on white background should use dark colors (#212121)
- Light text on dark backgrounds should use white or very light colors

### Focus States

Always provide clear focus indicators:

```css
button:focus-visible,
input:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-primary-dark-cerulean);
  outline-offset: 2px;
}
```

### Semantic HTML

Use proper HTML5 semantic elements with your styles:

- `<button>` for clickable actions
- `<a>` for navigation links
- `<input>`, `<select>`, `<textarea>` for form controls
- Proper heading hierarchy (`<h1>` → `<h6>`)

## Dark Mode Support (Optional)

If implementing dark mode, create an alternative color scheme:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Invert neutral colors */
    --color-neutral-white: #1a1a1a;
    --color-neutral-text-primary: #ffffff;
    --color-neutral-gray-300: #444444;

    /* Adjust other colors for dark mode */
    /* ... */
  }
}
```

## Browser Support

This style system should support:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Integration with UI Framework

This UI Style specification should be used in conjunction with the active UI Framework (layout structure) configured in the UI Framework page. Together they form your complete design system.

## Additional Resources

- **Design Tokens:** Consider using a design token system like Style Dictionary for multi-platform support
- **CSS Preprocessors:** Can be adapted for Sass/LESS with variables or mixins
- **CSS-in-JS:** Can be integrated with styled-components, Emotion, or other CSS-in-JS libraries
- **Tailwind CSS:** Can be configured to match these values in tailwind.config.js

---

**Specification Version:** 1.0
**Last Updated:** 2025-12-23T19:15:10.290Z

**Note:** This specification should be reviewed and updated whenever the UI style is modified to ensure consistency across the application.
