# Design System Implementation Comparison

## Purpose
This document compares the reverse-engineered design system files with the current Intentr UI implementation to help debug styling issues.

## Available Files

### 1. Intentr Default / Figma Design System
**File:** `/design-systems/intentr-default-reverse-engineered.html`
**Source:** Reverse-engineered from https://vest-hazel-54208462.figma.site/
**CSS:** `/design-systems/intentr ds_files/f9c3dafbf49c2a2d951bb41a41c3b88d36028835.css`

### 2. Ford Design System
**File:** `/design-systems/ford-design-system.html`
**Source:** Reverse-engineered from uploaded assets

## Reverse-Engineered Specifications

### Spacing System
- **Base unit:** `--spacing: .25rem` (4px)
- **p-6:** `calc(var(--spacing) * 6)` = `1.5rem` (24px) padding
- **gap-6:** `calc(var(--spacing) * 6)` = `1.5rem` (24px) gap
- **mb-2:** `calc(var(--spacing) * 2)` = `0.5rem` (8px) margin bottom
- **mb-4:** `calc(var(--spacing) * 4)` = `1rem` (16px) margin bottom

### Card Component Structure (from design system)
```html
<div data-slot="card"
     class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6 hover:shadow-lg transition-shadow cursor-pointer">
  <!-- Icon wrapper (optional) -->
  <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
    <svg class="w-6 h-6 text-blue-500">...</svg>
  </div>

  <!-- Title -->
  <h3 class="mb-2">Card Title</h3>

  <!-- Description -->
  <p class="text-sm text-grey-600">Card description text...</p>

  <!-- Actions (optional) -->
  <button>Action Button</button>
</div>
```

### Key Classes Breakdown

#### Outer Card Div
- `bg-card` - White background (semantic color)
- `text-card-foreground` - Default text color (semantic)
- `flex flex-col` - Vertical flex layout
- `gap-6` - 24px spacing between all children
- `rounded-xl` - Large border radius
- `border` - Default border (color from theme)
- `p-6` - 24px padding on all sides
- `hover:shadow-lg` - Large shadow on hover
- `transition-shadow` - Smooth shadow transition
- `cursor-pointer` - Pointer cursor on hover

#### Icon Wrapper
- `w-12 h-12` - 48px × 48px square
- `bg-blue-100` - Light blue background (varies by card)
- `rounded-lg` - Rounded corners
- `flex items-center justify-center` - Center icon
- `mb-4` - 16px bottom margin

#### Icon
- `w-6 h-6` - 24px × 24px
- `text-blue-500` - Blue color (varies by card)

#### Title (h3)
- `mb-2` - 8px bottom margin
- Uses default h3 styling (no custom classes)

#### Description (p)
- `text-sm` - Small text size
- `text-grey-600` - Medium grey color

### Button Specifications (from design system)
```html
<button data-slot="button"
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap
               text-sm font-medium transition-all
               disabled:pointer-events-none disabled:opacity-50
               outline-none focus-visible:ring-2 focus-visible:ring-offset-2
               h-10 rounded-md px-6
               bg-orange-500 hover:bg-orange-600 text-white">
  Button Text
</button>
```

#### Button Classes
- `inline-flex items-center justify-center` - Flexbox centering
- `gap-2` - 8px gap between children (icon + text)
- `whitespace-nowrap` - No text wrapping
- `text-sm font-medium` - 14px medium weight
- `transition-all` - Smooth transitions
- `h-10` - 40px height
- `rounded-md` - Medium border radius
- `px-6` - 24px horizontal padding
- `bg-orange-500` - Orange background (primary variant)
- `hover:bg-orange-600` - Darker on hover
- `text-white` - White text

## Current Intentr Implementation

### Card Component
**Location:** `src/components/Card.tsx`

```typescript
<div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6 hover:shadow-lg transition-shadow cursor-pointer">
  {children}
</div>
```

### Button Component
**Location:** `src/components/Button.tsx`

```typescript
const classes = `
  inline-flex items-center justify-center gap-2 whitespace-nowrap
  text-sm font-medium transition-all
  disabled:pointer-events-none disabled:opacity-50
  outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  h-10 rounded-md px-6
  ${variantClasses[variant]}
  ${className}
`.trim().replace(/\s+/g, ' ');
```

## Comparison Notes

### ✅ Matches Design System
1. Card padding: 24px (`p-6`)
2. Card gap: 24px (`gap-6`)
3. Title margin: 8px (`mb-2`)
4. Icon wrapper margin: 16px (`mb-4`)
5. Button height: 40px (`h-10`)
6. Button padding: 24px horizontal (`px-6`)
7. Semantic colors: `bg-card`, `text-card-foreground`
8. All Tailwind utility classes

### ⚠️ Potential Issues to Check
1. **CSS Variables:** Ensure `--spacing: .25rem` is defined in theme
2. **Color Mapping:** Verify `bg-card` and `text-card-foreground` map to correct colors
3. **Font Loading:** Check if fonts match design system
4. **Line Heights:** Verify default line-height settings
5. **Border Colors:** Ensure `border` uses correct theme color

## Debugging Steps

1. **Open Design System File:**
   - Visit `/design-systems/intentr-default-reverse-engineered.html`
   - Inspect a card element
   - Note computed CSS values in browser DevTools

2. **Open Intentr Dashboard:**
   - Visit `/` (Dashboard)
   - Inspect a card element
   - Compare computed CSS values

3. **Check Differences:**
   - Compare padding values (should be 24px)
   - Compare gap values (should be 24px)
   - Compare margin values
   - Compare colors
   - Compare fonts

4. **CSS Loading:**
   - Verify `/design-systems/intentr ds_files/...css` loads correctly
   - Check for CSS conflicts
   - Ensure Tailwind CSS generates correct utilities

## Quick Visual Test

### Design System Card (Expected)
- 24px padding on all sides
- 24px spacing between icon, title, description, button
- Icon: 48px square with 16px bottom margin
- Title: 8px bottom margin
- White background
- Subtle border
- Shadow on hover

### Intentr UI Card (Current)
- Should match above exactly
- If not, inspect computed styles in DevTools
- Compare with design system HTML

## Links

- **Design System (Reverse-Engineered):** [/design-systems/intentr-default-reverse-engineered.html](/design-systems/intentr-default-reverse-engineered.html)
- **Ford Design System:** [/design-systems/ford-design-system.html](/design-systems/ford-design-system.html)
- **Original Figma Site:** [https://vest-hazel-54208462.figma.site/](https://vest-hazel-54208462.figma.site/)
