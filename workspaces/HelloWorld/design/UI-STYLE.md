# UI Style Specification: Tailwind CSS

**Generated:** 2025-12-19T19:52:15.720Z
**Style ID:** tailwind


## Overview

This document provides comprehensive specifications for implementing the Tailwind CSS UI style system in your application. It includes detailed color palettes, typography scales, spacing systems, and component styles that form the visual foundation of your user interface.

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
- **Hex:** `#F9FAFB`
- **Usage:** Cards, panels, content areas
- **CSS Variable:** `--color-surface`

```css
.card {
  background-color: #F9FAFB;
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


**Blue 600**
- **Hex:** `#2563eb`
- **Usage:** Primary
- **CSS Variable:** `--color-primary-blue-600`

```css
.element {
  background-color: #2563eb;
  /* or */
  background-color: var(--color-primary-blue-600);
}
```


**Blue 700**
- **Hex:** `#1d4ed8`
- **Usage:** Primary dark
- **CSS Variable:** `--color-primary-blue-700`

```css
.element {
  background-color: #1d4ed8;
  /* or */
  background-color: var(--color-primary-blue-700);
}
```


**Indigo 600**
- **Hex:** `#4f46e5`
- **Usage:** Secondary
- **CSS Variable:** `--color-primary-indigo-600`

```css
.element {
  background-color: #4f46e5;
  /* or */
  background-color: var(--color-primary-indigo-600);
}
```


**Sky 500**
- **Hex:** `#0ea5e9`
- **Usage:** Accent
- **CSS Variable:** `--color-primary-sky-500`

```css
.element {
  background-color: #0ea5e9;
  /* or */
  background-color: var(--color-primary-sky-500);
}
```


### Neutral Colors


**White**
- **Hex:** `#ffffff`
- **Usage:** Backgrounds
- **CSS Variable:** `--color-neutral-white`

```css
.element {
  color: #ffffff;
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


**Gray 300**
- **Hex:** `#d1d5db`
- **Usage:** Borders
- **CSS Variable:** `--color-neutral-gray-300`

```css
.element {
  color: #d1d5db;
  /* or */
  color: var(--color-neutral-gray-300);
}
```


**Gray 600**
- **Hex:** `#4b5563`
- **Usage:** Secondary text
- **CSS Variable:** `--color-neutral-gray-600`

```css
.element {
  color: #4b5563;
  /* or */
  color: var(--color-neutral-gray-600);
}
```


**Gray 900**
- **Hex:** `#111827`
- **Usage:** Primary text
- **CSS Variable:** `--color-neutral-gray-900`

```css
.element {
  color: #111827;
  /* or */
  color: var(--color-neutral-gray-900);
}
```


### Semantic Colors


**Green 500**
- **Hex:** `#10b981`
- **Usage:** Success
- **CSS Variable:** `--color-green 500`

```css
.alert-green 500 {
  background-color: #10b981;
  border-color: #10b981;
}
```


**Yellow 500**
- **Hex:** `#f59e0b`
- **Usage:** Warning
- **CSS Variable:** `--color-yellow 500`

```css
.alert-yellow 500 {
  background-color: #f59e0b;
  border-color: #f59e0b;
}
```


**Red 500**
- **Hex:** `#ef4444`
- **Usage:** Error
- **CSS Variable:** `--color-red 500`

```css
.alert-red 500 {
  background-color: #ef4444;
  border-color: #ef4444;
}
```


**Blue 500**
- **Hex:** `#3b82f6`
- **Usage:** Info
- **CSS Variable:** `--color-blue 500`

```css
.alert-blue 500 {
  background-color: #3b82f6;
  border-color: #3b82f6;
}
```


## Typography System

### Typography Scale


**text-6xl**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 3.75rem
- **Font Weight:** 700
- **Font Style:** normal
- **Line Height:** 1
- **CSS Class:** `.text-text-6xl`

```css
.text-text-6xl {
  font-family: Inter, system-ui, sans-serif;
  font-size: 3.75rem;
  font-weight: 700;
  font-style: normal;
  line-height: 1;
}
```

**HTML Usage:**
```html
<h1 class="text-text-6xl">Heading Text</h1>
```


**text-5xl**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 3rem
- **Font Weight:** 700
- **Font Style:** normal
- **Line Height:** 1
- **CSS Class:** `.text-text-5xl`

```css
.text-text-5xl {
  font-family: Inter, system-ui, sans-serif;
  font-size: 3rem;
  font-weight: 700;
  font-style: normal;
  line-height: 1;
}
```

**HTML Usage:**
```html
<h1 class="text-text-5xl">Heading Text</h1>
```


**text-4xl**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 2.25rem
- **Font Weight:** 700
- **Font Style:** normal
- **Line Height:** 2.5rem
- **CSS Class:** `.text-text-4xl`

```css
.text-text-4xl {
  font-family: Inter, system-ui, sans-serif;
  font-size: 2.25rem;
  font-weight: 700;
  font-style: normal;
  line-height: 2.5rem;
}
```

**HTML Usage:**
```html
<h1 class="text-text-4xl">Heading Text</h1>
```


**text-3xl**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 1.875rem
- **Font Weight:** 700
- **Font Style:** normal
- **Line Height:** 2.25rem
- **CSS Class:** `.text-text-3xl`

```css
.text-text-3xl {
  font-family: Inter, system-ui, sans-serif;
  font-size: 1.875rem;
  font-weight: 700;
  font-style: normal;
  line-height: 2.25rem;
}
```

**HTML Usage:**
```html
<h1 class="text-text-3xl">Heading Text</h1>
```


**text-2xl**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 1.5rem
- **Font Weight:** 700
- **Font Style:** normal
- **Line Height:** 2rem
- **CSS Class:** `.text-text-2xl`

```css
.text-text-2xl {
  font-family: Inter, system-ui, sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  font-style: normal;
  line-height: 2rem;
}
```

**HTML Usage:**
```html
<h1 class="text-text-2xl">Heading Text</h1>
```


**text-xl**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 1.25rem
- **Font Weight:** 600
- **Font Style:** normal
- **Line Height:** 1.75rem
- **CSS Class:** `.text-text-xl`

```css
.text-text-xl {
  font-family: Inter, system-ui, sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  font-style: normal;
  line-height: 1.75rem;
}
```

**HTML Usage:**
```html
<h1 class="text-text-xl">Heading Text</h1>
```


**text-base**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 1rem
- **Font Weight:** 400
- **Font Style:** normal
- **Line Height:** 1.5rem
- **CSS Class:** `.text-text-base`

```css
.text-text-base {
  font-family: Inter, system-ui, sans-serif;
  font-size: 1rem;
  font-weight: 400;
  font-style: normal;
  line-height: 1.5rem;
}
```

**HTML Usage:**
```html
<h1 class="text-text-base">Heading Text</h1>
```


**text-sm**
- **Font Family:** Inter, system-ui, sans-serif
- **Font Size:** 0.875rem
- **Font Weight:** 400
- **Font Style:** normal
- **Line Height:** 1.25rem
- **CSS Class:** `.text-text-sm`

```css
.text-text-sm {
  font-family: Inter, system-ui, sans-serif;
  font-size: 0.875rem;
  font-weight: 400;
  font-style: normal;
  line-height: 1.25rem;
}
```

**HTML Usage:**
```html
<h1 class="text-text-sm">Heading Text</h1>
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


**2**
- **Size:** 8px
- **CSS Variable:** `--spacing-2`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 8px;
  padding: 8px;
  gap: 8px;
  /* or */
  margin: var(--spacing-2);
}
```


**4**
- **Size:** 16px
- **CSS Variable:** `--spacing-4`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 16px;
  padding: 16px;
  gap: 16px;
  /* or */
  margin: var(--spacing-4);
}
```


**6**
- **Size:** 24px
- **CSS Variable:** `--spacing-6`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 24px;
  padding: 24px;
  gap: 24px;
  /* or */
  margin: var(--spacing-6);
}
```


**8**
- **Size:** 32px
- **CSS Variable:** `--spacing-8`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 32px;
  padding: 32px;
  gap: 32px;
  /* or */
  margin: var(--spacing-8);
}
```


**12**
- **Size:** 48px
- **CSS Variable:** `--spacing-12`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 48px;
  padding: 48px;
  gap: 48px;
  /* or */
  margin: var(--spacing-12);
}
```


**16**
- **Size:** 64px
- **CSS Variable:** `--spacing-16`
- **Usage:** Margins, padding, gaps

```css
.element {
  margin: 64px;
  padding: 64px;
  gap: 64px;
  /* or */
  margin: var(--spacing-16);
}
```


### Spacing Usage Guidelines

- **xs (undefined):** Tight spacing, inline elements, compact layouts
- **sm (undefined):** Default spacing between related elements
- **md (undefined):** Section spacing, card padding
- **lg (undefined):** Large section gaps, major layout divisions
- **xl (undefined):** Hero sections, major page divisions
- **2xl (undefined):** Maximum spacing for dramatic separation

## Button Styles

### Primary Button

**Colors:**
- Background: `#2563eb`
- Hover: `#1d4ed8`
- Text: `#FFFFFF`

**Implementation:**

```css
.btn-primary {
  background-color: #2563eb;
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
  background-color: #1d4ed8;
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
- Background: `#6b7280`
- Hover: `#4b5563`
- Text: `#FFFFFF`

**Implementation:**

```css
.btn-secondary {
  background-color: #6b7280;
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
  background-color: #4b5563;
}
```

```html
<button class="btn-secondary">Secondary Action</button>
```

### Accent Button

**Colors:**
- Background: `#0ea5e9`
- Hover: `#0284c7`
- Text: `#FFFFFF`

**Implementation:**

```css
.btn-accent {
  background-color: #0ea5e9;
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
  background-color: #0284c7;
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
  --color-surface: #F9FAFB;
  --color-elevated: #FFFFFF;

  /* Primary Colors */
  --color-primary-blue-600: #2563eb;
  --color-primary-blue-700: #1d4ed8;
  --color-primary-indigo-600: #4f46e5;
  --color-primary-sky-500: #0ea5e9;

  /* Neutral Colors */
  --color-neutral-white: #ffffff;
  --color-neutral-header-text: #FFFFFF;
  --color-neutral-gray-300: #d1d5db;
  --color-neutral-gray-600: #4b5563;
  --color-neutral-gray-900: #111827;

  /* Semantic Colors */
  --color-green 500: #10b981;
  --color-yellow 500: #f59e0b;
  --color-red 500: #ef4444;
  --color-blue 500: #3b82f6;

  /* Spacing */
  --spacing-2: 8px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-12: 48px;
  --spacing-16: 64px;

  /* Typography */
  --font-family-text-6xl: Inter, system-ui, sans-serif;
  --font-size-text-6xl: 3.75rem;
  --font-weight-text-6xl: 700;
  --font-style-text-6xl: normal;
  --line-height-text-6xl: 1;
  --font-family-text-5xl: Inter, system-ui, sans-serif;
  --font-size-text-5xl: 3rem;
  --font-weight-text-5xl: 700;
  --font-style-text-5xl: normal;
  --line-height-text-5xl: 1;
  --font-family-text-4xl: Inter, system-ui, sans-serif;
  --font-size-text-4xl: 2.25rem;
  --font-weight-text-4xl: 700;
  --font-style-text-4xl: normal;
  --line-height-text-4xl: 2.5rem;
  --font-family-text-3xl: Inter, system-ui, sans-serif;
  --font-size-text-3xl: 1.875rem;
  --font-weight-text-3xl: 700;
  --font-style-text-3xl: normal;
  --line-height-text-3xl: 2.25rem;
  --font-family-text-2xl: Inter, system-ui, sans-serif;
  --font-size-text-2xl: 1.5rem;
  --font-weight-text-2xl: 700;
  --font-style-text-2xl: normal;
  --line-height-text-2xl: 2rem;
  --font-family-text-xl: Inter, system-ui, sans-serif;
  --font-size-text-xl: 1.25rem;
  --font-weight-text-xl: 600;
  --font-style-text-xl: normal;
  --line-height-text-xl: 1.75rem;
  --font-family-text-base: Inter, system-ui, sans-serif;
  --font-size-text-base: 1rem;
  --font-weight-text-base: 400;
  --font-style-text-base: normal;
  --line-height-text-base: 1.5rem;
  --font-family-text-sm: Inter, system-ui, sans-serif;
  --font-size-text-sm: 0.875rem;
  --font-weight-text-sm: 400;
  --font-style-text-sm: normal;
  --line-height-text-sm: 1.25rem;

  /* Button Styles */
  --btn-primary-bg: #2563eb;
  --btn-primary-hover: #1d4ed8;
  --btn-primary-color: #FFFFFF;

  --btn-secondary-bg: #6b7280;
  --btn-secondary-hover: #4b5563;
  --btn-secondary-color: #FFFFFF;

  --btn-accent-bg: #0ea5e9;
  --btn-accent-hover: #0284c7;
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
- Primary text on white background should use dark colors (#111827)
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
**Last Updated:** 2025-12-19T19:52:15.720Z

**Note:** This specification should be reviewed and updated whenever the UI style is modified to ensure consistency across the application.
