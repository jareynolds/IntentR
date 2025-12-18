# UI Framework Specification: Dashboard Admin

**Generated:** 2025-12-17T01:18:47.560Z
**Category:** Web Application
**Layout ID:** dashboard-admin

## Overview

Classic admin panel with left sidebar navigation, top header, and main content area. Perfect for data-heavy applications and management interfaces.

## Layout Structure

### Components Included

✅ **Header**
- Top navigation bar with logo and primary navigation
- Sticky/fixed positioning recommended
- Should include: brand logo, main menu, user profile/actions


✅ **Sidebar** (Position: left)
- Left-aligned vertical navigation panel
- Should include: navigation links, filters, or contextual actions
- Recommended width: 240-280px
- Consider collapsible/expandable functionality for mobile


❌ **Footer** (Not included)


### Content Layout

**Type:** single


**Single Column Layout**
- Main content area with single vertical flow
- Optimal for: text-heavy content, forms, detailed views
- Implementation:
  ```css
  .main-content {
    max-width: 100%;
    margin: 0 auto;
    padding: 24px;
  }
  ```








### Container & Spacing

**Max Width:** 100%
- Full-width layout without constraints
- Content should be centered within viewport
- Add appropriate padding/margins for breathing room

## Implementation Guidelines

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Admin</title>
</head>
<body>
  <div class="app-container">
    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <div class="logo">Brand Logo</div>
        <nav class="main-nav">
          <ul>
            <li><a href="#">Link 1</a></li>
            <li><a href="#">Link 2</a></li>
            <li><a href="#">Link 3</a></li>
          </ul>
        </nav>
        <div class="header-actions">
          <!-- User profile, notifications, etc. -->
        </div>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="app-main">
      <!-- Left Sidebar -->
      <aside class="app-sidebar sidebar-left">
        <nav class="sidebar-nav">
          <!-- Navigation items -->
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="app-content">
        <div class="content-wrapper">
          <!-- Your content here -->
        </div>
      </main>

    </div>

  </div>
</body>
</html>
```

### CSS Base Structure

```css
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
  line-height: 1.6;
  color: #333;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Header */
.app-header {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-content {
  max-width: none;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.main-nav ul {
  display: flex;
  list-style: none;
  gap: 24px;
}

.main-nav a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
}

.main-nav a:hover {
  color: #0066cc;
}


/* Main layout */
.app-main {
  flex: 1;
  display: flex;

}

/* Sidebar */
.app-sidebar {
  width: 260px;
  background: #f8f9fa;
  border-right: 1px solid #e0e0e0;
  padding: 24px 16px;
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    left: -260px;
    right: auto;
    top: 0;
    height: 100vh;
    transition: transform 0.3s ease;
    z-index: 999;
  }

  .app-sidebar.open {
    transform: translateX(260px);
  }
}


/* Content area */
.app-content {
  flex: 1;
  padding: 24px;
  background: #ffffff;
}

.content-wrapper {
  max-width: 100%;

}


```

### React/Component Implementation

For React applications:

```jsx
// Layout.jsx
import React from 'react';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <Header />
      <div className="app-main">
        <Sidebar position="left" />
        <main className="app-content">
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
```

## Responsive Breakpoints

Recommended breakpoints for this layout:

- **Mobile:** < 768px
  - Sidebar: Collapsible/drawer style
  - Header: Hamburger menu
  - Content: Single column, full-width padding reduced

- **Tablet:** 768px - 1024px
  - Sidebar: Consider toggle visibility
  - Content: Adjust grid columns (if applicable)
  - Maintain comfortable reading width

- **Desktop:** > 1024px
  - Full layout as designed
  - Sidebar: Always visible
  - Optimal spacing and proportions

## Accessibility Considerations

1. **Semantic HTML:** Use proper HTML5 semantic elements
2. **ARIA Labels:** Add appropriate ARIA labels for screen readers
3. **Keyboard Navigation:** Ensure all interactive elements are keyboard accessible
4. **Focus Indicators:** Clear focus states for keyboard navigation
5. **Skip Links:** Add skip-to-content links after header
6. **Color Contrast:** Maintain WCAG AA compliance (4.5:1 for normal text)

## Performance Optimization

1. **Lazy Loading:** Consider lazy loading sidebar content
2. **Code Splitting:** Split by routes/sections for better load times
3. **CSS Optimization:** Use CSS containment for sidebar
4. **Image Optimization:** Compress and use appropriate formats (WebP, AVIF)

## Browser Support

This layout should support:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Additional Notes

- Consider using CSS Grid or Flexbox for layout flexibility
- Implement smooth transitions for interactive elements
- Test thoroughly on different screen sizes and devices
- Ensure consistent spacing using design tokens
- Consider sidebar state persistence (open/closed)
- 

## Integration with UI Styles

This layout should be used in conjunction with the active UI Styles (colors, typography, spacing) configured in the UI Styles page. Reference the UI Styles specification for:

- Color palette (primary, neutral, semantic colors)
- Typography scale (font sizes, weights, line heights)
- Spacing system (margins, padding, gaps)
- Button styles (primary, secondary, accent)

---

**Specification Version:** 1.0
**Last Updated:** 2025-12-17T01:18:47.560Z
