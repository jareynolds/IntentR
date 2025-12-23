import React, { useState, useEffect } from 'react';
import { Button, PageLayout } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import axios from 'axios';
import { SPEC_URL } from '../api/client';
import { DEFAULT_LAYOUTS, type PageLayoutConfig } from '../components/PageLayout';

interface LayoutConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  structure: {
    header: boolean;
    sidebar: boolean;
    sidebarPosition?: 'left' | 'right';
    footer: boolean;
    contentLayout: 'single' | 'grid' | 'flex' | 'sections';
    maxWidth?: string;
  };
  preview: string;
  isCustom?: boolean;
}

// Predefined modern web layouts
const defaultLayouts: LayoutConfig[] = [
  {
    id: 'dashboard-admin',
    name: 'Dashboard Admin',
    description: 'Classic admin panel with left sidebar navigation, top header, and main content area. Perfect for data-heavy applications and management interfaces.',
    category: 'Web Application',
    structure: {
      header: true,
      sidebar: true,
      sidebarPosition: 'left',
      footer: false,
      contentLayout: 'single',
      maxWidth: '100%',
    },
    preview: 'dashboard-admin',
    isCustom: false,
  },
  {
    id: 'marketing-landing',
    name: 'Marketing/Landing Page',
    description: 'Modern landing page with full-width hero section, feature sections, and call-to-action areas. Ideal for marketing websites and product showcases.',
    category: 'Marketing',
    structure: {
      header: true,
      sidebar: false,
      footer: true,
      contentLayout: 'sections',
      maxWidth: '1200px',
    },
    preview: 'marketing-landing',
    isCustom: false,
  },
  {
    id: 'ecommerce-grid',
    name: 'E-commerce Grid',
    description: 'Product-focused layout with grid system, filters sidebar, and shopping cart. Perfect for online stores and product catalogs.',
    category: 'E-commerce',
    structure: {
      header: true,
      sidebar: true,
      sidebarPosition: 'left',
      footer: true,
      contentLayout: 'grid',
      maxWidth: '1440px',
    },
    preview: 'ecommerce-grid',
    isCustom: false,
  },
  {
    id: 'blog-magazine',
    name: 'Blog/Magazine',
    description: 'Content-focused layout with featured articles, sidebar widgets, and reading-optimized typography. Great for blogs and news sites.',
    category: 'Content',
    structure: {
      header: true,
      sidebar: true,
      sidebarPosition: 'right',
      footer: true,
      contentLayout: 'single',
      maxWidth: '1200px',
    },
    preview: 'blog-magazine',
    isCustom: false,
  },
  {
    id: 'portfolio-showcase',
    name: 'Portfolio Showcase',
    description: 'Visual-first layout with large imagery, project galleries, and minimal navigation. Perfect for creative portfolios and visual presentations.',
    category: 'Creative',
    structure: {
      header: true,
      sidebar: false,
      footer: true,
      contentLayout: 'grid',
      maxWidth: '100%',
    },
    preview: 'portfolio-showcase',
    isCustom: false,
  },
  {
    id: 'saas-platform',
    name: 'SaaS Platform',
    description: 'Modern SaaS interface with top navigation, breadcrumbs, and flexible content areas. Optimized for cloud applications and services.',
    category: 'Web Application',
    structure: {
      header: true,
      sidebar: false,
      footer: false,
      contentLayout: 'flex',
      maxWidth: '1400px',
    },
    preview: 'saas-platform',
    isCustom: false,
  },
  {
    id: 'android-material',
    name: 'Android Material Design',
    description: 'Native Android layout following Material Design 3 guidelines. Features top app bar, bottom navigation, floating action button placement, and mobile-first responsive design.',
    category: 'Mobile',
    structure: {
      header: true,
      sidebar: false,
      footer: true,
      contentLayout: 'single',
      maxWidth: '100%',
    },
    preview: 'android-material',
    isCustom: false,
  },
];

type TabType = 'application' | 'page';

export const UIFramework: React.FC = () => {
  const { currentWorkspace, updateWorkspace } = useWorkspace();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('application');

  // Application layouts state
  const [layouts, setLayouts] = useState<LayoutConfig[]>(defaultLayouts);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('dashboard-admin');
  const [hasChanges, setHasChanges] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activatedLayoutId, setActivatedLayoutId] = useState<string | null>(null);
  const [showActivationSuccess, setShowActivationSuccess] = useState(false);

  // Page Layout state
  const [pageLayouts, setPageLayouts] = useState<PageLayoutConfig[]>(DEFAULT_LAYOUTS);
  const [selectedPageLayoutId, setSelectedPageLayoutId] = useState<string>('standard');
  const [activePageLayoutId, setActivePageLayoutId] = useState<string | null>(null);
  const [showPageLayoutSuccess, setShowPageLayoutSuccess] = useState(false);
  const [showPageLayoutCustomizeModal, setShowPageLayoutCustomizeModal] = useState(false);
  const [showPageLayoutSaveModal, setShowPageLayoutSaveModal] = useState(false);
  const [newPageLayoutName, setNewPageLayoutName] = useState('');
  const [pageLayoutHasChanges, setPageLayoutHasChanges] = useState(false);

  // Page layout customization state
  const [customShowWizard, setCustomShowWizard] = useState(true);
  const [customShowAIPreset, setCustomShowAIPreset] = useState(true);
  const [customShowUIFramework, setCustomShowUIFramework] = useState(true);
  const [customShowWorkspace, setCustomShowWorkspace] = useState(true);
  const [customShowTitle, setCustomShowTitle] = useState(true);
  const [customShowDescription, setCustomShowDescription] = useState(true);
  const [customShowInfoButton, setCustomShowInfoButton] = useState(true);

  // Current customization state
  const [customHeader, setCustomHeader] = useState(true);
  const [customSidebar, setCustomSidebar] = useState(true);
  const [customSidebarPosition, setCustomSidebarPosition] = useState<'left' | 'right'>('left');
  const [customFooter, setCustomFooter] = useState(false);
  const [customContentLayout, setCustomContentLayout] = useState<'single' | 'grid' | 'flex' | 'sections'>('single');
  const [customMaxWidth, setCustomMaxWidth] = useState('100%');

  // Load custom layouts from workspace
  useEffect(() => {
    if (currentWorkspace?.customUILayouts) {
      setLayouts([...defaultLayouts, ...currentWorkspace.customUILayouts]);
    }
    // Load the saved layout selection and activated layout
    if (currentWorkspace?.selectedUILayout) {
      setSelectedLayoutId(currentWorkspace.selectedUILayout);
      // Set as activated if it exists
      setActivatedLayoutId(currentWorkspace.selectedUILayout);
    }
  }, [currentWorkspace]);

  // Load selected layout data
  useEffect(() => {
    const layout = layouts.find(l => l.id === selectedLayoutId);
    if (layout) {
      setCustomHeader(layout.structure.header);
      setCustomSidebar(layout.structure.sidebar);
      setCustomSidebarPosition(layout.structure.sidebarPosition || 'left');
      setCustomFooter(layout.structure.footer);
      setCustomContentLayout(layout.structure.contentLayout);
      setCustomMaxWidth(layout.structure.maxWidth || '100%');
      setHasChanges(false);
    }
  }, [selectedLayoutId, layouts]);

  // Load custom page layouts from workspace
  useEffect(() => {
    if (currentWorkspace?.customPageLayouts) {
      setPageLayouts([...DEFAULT_LAYOUTS, ...currentWorkspace.customPageLayouts]);
    }
    // Load the saved page layout selection
    if (currentWorkspace?.pageLayoutConfig) {
      const configId = currentWorkspace.pageLayoutConfig.id;
      setSelectedPageLayoutId(configId);
      setActivePageLayoutId(configId);
    }
  }, [currentWorkspace]);

  // Load selected page layout data
  useEffect(() => {
    const layout = pageLayouts.find(l => l.id === selectedPageLayoutId);
    if (layout) {
      setCustomShowWizard(layout.showWizard);
      setCustomShowAIPreset(layout.showAIPreset);
      setCustomShowUIFramework(layout.showUIFramework);
      setCustomShowWorkspace(layout.showWorkspace);
      setCustomShowTitle(layout.showTitle);
      setCustomShowDescription(layout.showDescription);
      setCustomShowInfoButton(layout.showInfoButton);
      setPageLayoutHasChanges(false);
    }
  }, [selectedPageLayoutId, pageLayouts]);

  // Generate specification markdown for a layout
  const generateLayoutSpecification = (layout: LayoutConfig): string => {
    const timestamp = new Date().toISOString();
    const { structure } = layout;

    // Special Android Material Design specification
    if (layout.id === 'android-material') {
      return `# UI Framework Specification: ${layout.name}

**Generated:** ${timestamp}
**Category:** ${layout.category}
**Layout ID:** ${layout.id}
**Platform:** Android (Kotlin/Jetpack Compose)

## Overview

${layout.description}

## Material Design 3 Components

### Top App Bar
✅ **Top App Bar** (Required)
- Displays app title and navigation
- Supports collapsing behavior on scroll
- Contains action icons and overflow menu
- Implementation: \`TopAppBar\` or \`MediumTopAppBar\` composable

### Bottom Navigation
✅ **Bottom Navigation** (Required)
- Primary navigation for top-level destinations
- 3-5 navigation items maximum
- Shows labels with icons
- Implementation: \`NavigationBar\` composable

### Floating Action Button (FAB)
✅ **Floating Action Button** (Recommended)
- Primary action for the screen
- Position: Bottom-right, above bottom navigation
- Implementation: \`FloatingActionButton\` composable

### Navigation Drawer (Optional)
- For apps with 5+ destinations
- Accessed via hamburger menu
- Implementation: \`ModalNavigationDrawer\` composable

## Implementation Guidelines

### Project Setup (build.gradle.kts)

\`\`\`kotlin
dependencies {
    // Jetpack Compose BOM
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Material Icons
    implementation("androidx.compose.material:material-icons-extended")
}
\`\`\`

### Main Layout Structure (Kotlin/Compose)

\`\`\`kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainLayout(
    navController: NavHostController = rememberNavController()
) {
    val currentRoute = navController.currentBackStackEntryAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("App Title") },
                navigationIcon = {
                    IconButton(onClick = { /* Handle menu */ }) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Handle search */ }) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                    IconButton(onClick = { /* Handle more */ }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                    label = { Text("Home") },
                    selected = currentRoute.value?.destination?.route == "home",
                    onClick = { navController.navigate("home") }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                    label = { Text("Search") },
                    selected = currentRoute.value?.destination?.route == "search",
                    onClick = { navController.navigate("search") }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Notifications, contentDescription = "Notifications") },
                    label = { Text("Notifications") },
                    selected = currentRoute.value?.destination?.route == "notifications",
                    onClick = { navController.navigate("notifications") }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                    label = { Text("Profile") },
                    selected = currentRoute.value?.destination?.route == "profile",
                    onClick = { navController.navigate("profile") }
                )
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { /* Handle FAB click */ },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add")
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(paddingValues)
        ) {
            composable("home") { HomeScreen() }
            composable("search") { SearchScreen() }
            composable("notifications") { NotificationsScreen() }
            composable("profile") { ProfileScreen() }
        }
    }
}
\`\`\`

### Material Theme Configuration

\`\`\`kotlin
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = Color(0xFF1A73E8),
            onPrimary = Color.White,
            secondary = Color(0xFF03DAC6),
            surface = Color(0xFF121212),
            background = Color(0xFF121212)
        )
    } else {
        lightColorScheme(
            primary = Color(0xFF1A73E8),
            onPrimary = Color.White,
            secondary = Color(0xFF03DAC6),
            surface = Color.White,
            background = Color(0xFFF5F5F5)
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
\`\`\`

## Screen Layout Patterns

### List Screen Pattern

\`\`\`kotlin
@Composable
fun ListScreen() {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(items) { item ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                ListItem(
                    headlineContent = { Text(item.title) },
                    supportingContent = { Text(item.subtitle) },
                    leadingContent = {
                        Icon(Icons.Default.Article, contentDescription = null)
                    }
                )
            }
        }
    }
}
\`\`\`

### Detail Screen Pattern

\`\`\`kotlin
@Composable
fun DetailScreen(itemId: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Hero image
        AsyncImage(
            model = imageUrl,
            contentDescription = null,
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clip(RoundedCornerShape(12.dp))
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Title
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Content
        Text(
            text = description,
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
\`\`\`

## Accessibility Guidelines

1. **Content Descriptions**: All icons must have contentDescription
2. **Touch Targets**: Minimum 48dp touch target size
3. **Color Contrast**: Follow WCAG 2.1 AA guidelines (4.5:1 minimum)
4. **Screen Readers**: Test with TalkBack
5. **Dynamic Type**: Support font scaling
6. **Semantic Properties**: Use semantics modifier for custom components

## Performance Optimization

1. **Lazy Loading**: Use LazyColumn/LazyRow for lists
2. **Remember State**: Use remember and rememberSaveable appropriately
3. **Stable Keys**: Provide stable keys for list items
4. **Image Loading**: Use Coil or Glide for async image loading
5. **Composition Optimization**: Avoid unnecessary recompositions

## Testing

\`\`\`kotlin
@Test
fun bottomNavigation_displaysAllItems() {
    composeTestRule.setContent {
        MainLayout()
    }

    composeTestRule.onNodeWithText("Home").assertIsDisplayed()
    composeTestRule.onNodeWithText("Search").assertIsDisplayed()
    composeTestRule.onNodeWithText("Notifications").assertIsDisplayed()
    composeTestRule.onNodeWithText("Profile").assertIsDisplayed()
}
\`\`\`

---

**Specification Version:** 1.0
**Last Updated:** ${timestamp}
**Platform Requirements:** Android API 24+ (Android 7.0), Kotlin 1.9+, Jetpack Compose 1.5+
`;
    }

    return `# UI Framework Specification: ${layout.name}

**Generated:** ${timestamp}
**Category:** ${layout.category}
**Layout ID:** ${layout.id}

## Overview

${layout.description}

## Layout Structure

### Components Included

${structure.header ? '✅ **Header**' : '❌ **Header** (Not included)'}
${structure.header ? '- Top navigation bar with logo and primary navigation\n- Sticky/fixed positioning recommended\n- Should include: brand logo, main menu, user profile/actions\n' : ''}

${structure.sidebar ? `✅ **Sidebar** (Position: ${structure.sidebarPosition || 'left'})` : '❌ **Sidebar** (Not included)'}
${structure.sidebar ? `- ${structure.sidebarPosition === 'left' ? 'Left' : 'Right'}-aligned vertical navigation panel
- Should include: navigation links, filters, or contextual actions
- Recommended width: 240-280px
- Consider collapsible/expandable functionality for mobile
` : ''}

${structure.footer ? '✅ **Footer**' : '❌ **Footer** (Not included)'}
${structure.footer ? '- Bottom section with supplementary information\n- Should include: copyright, links, social media, contact info\n- Full-width or constrained based on content layout\n' : ''}

### Content Layout

**Type:** ${structure.contentLayout}

${structure.contentLayout === 'single' ? `
**Single Column Layout**
- Main content area with single vertical flow
- Optimal for: text-heavy content, forms, detailed views
- Implementation:
  \`\`\`css
  .main-content {
    max-width: ${structure.maxWidth};
    margin: 0 auto;
    padding: 24px;
  }
  \`\`\`
` : ''}

${structure.contentLayout === 'grid' ? `
**Grid Layout**
- Multi-column grid system for cards or items
- Optimal for: product catalogs, image galleries, dashboard widgets
- Implementation:
  \`\`\`css
  .content-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
    max-width: ${structure.maxWidth};
    margin: 0 auto;
    padding: 24px;
  }
  \`\`\`
- Recommended: 2-4 columns on desktop, 1-2 on tablet, 1 on mobile
` : ''}

${structure.contentLayout === 'flex' ? `
**Flexible Flex Layout**
- Flexible container with dynamic sizing
- Optimal for: responsive interfaces, mixed content types
- Implementation:
  \`\`\`css
  .content-flex {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    max-width: ${structure.maxWidth};
    margin: 0 auto;
    padding: 24px;
  }

  .flex-item {
    flex: 1 1 300px;
  }
  \`\`\`
` : ''}

${structure.contentLayout === 'sections' ? `
**Sectioned Layout**
- Full-width sections with alternating backgrounds
- Optimal for: landing pages, marketing sites, storytelling
- Implementation:
  \`\`\`css
  .section {
    width: 100%;
    padding: 80px 24px;
  }

  .section-content {
    max-width: ${structure.maxWidth};
    margin: 0 auto;
  }

  .section:nth-child(even) {
    background-color: #f5f5f5;
  }
  \`\`\`
` : ''}

### Container & Spacing

**Max Width:** ${structure.maxWidth}
- ${structure.maxWidth === '100%' ? 'Full-width layout without constraints' : `Constrained to ${structure.maxWidth} for optimal readability`}
- Content should be centered within viewport
- Add appropriate padding/margins for breathing room

## Implementation Guidelines

### HTML Structure

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${layout.name}</title>
</head>
<body>
  <div class="app-container">
${structure.header ? `    <!-- Header -->
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
` : ''}
    <!-- Main Layout -->
    <div class="app-main">
${structure.sidebar && structure.sidebarPosition === 'left' ? `      <!-- Left Sidebar -->
      <aside class="app-sidebar sidebar-left">
        <nav class="sidebar-nav">
          <!-- Navigation items -->
        </nav>
      </aside>
` : ''}
      <!-- Main Content -->
      <main class="app-content">
        <div class="content-wrapper">
          <!-- Your content here -->
        </div>
      </main>
${structure.sidebar && structure.sidebarPosition === 'right' ? `
      <!-- Right Sidebar -->
      <aside class="app-sidebar sidebar-right">
        <!-- Sidebar content -->
      </aside>
` : ''}
    </div>
${structure.footer ? `
    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <p>&copy; 2024 Company Name. All rights reserved.</p>
        <!-- Additional footer content -->
      </div>
    </footer>
` : ''}
  </div>
</body>
</html>
\`\`\`

### CSS Base Structure

\`\`\`css
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

${structure.header ? `/* Header */
.app-header {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-content {
  max-width: ${structure.maxWidth === '100%' ? 'none' : structure.maxWidth};
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
` : ''}

/* Main layout */
.app-main {
  flex: 1;
  display: ${structure.sidebar ? 'flex' : 'block'};
${structure.maxWidth === '100%' ? '' : `  max-width: ${structure.maxWidth};
  margin: 0 auto;
  width: 100%;`}
}

${structure.sidebar ? `/* Sidebar */
.app-sidebar {
  width: 260px;
  background: #f8f9fa;
  border-${structure.sidebarPosition === 'left' ? 'right' : 'left'}: 1px solid #e0e0e0;
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
    left: ${structure.sidebarPosition === 'left' ? '-260px' : 'auto'};
    right: ${structure.sidebarPosition === 'right' ? '-260px' : 'auto'};
    top: 0;
    height: 100vh;
    transition: transform 0.3s ease;
    z-index: 999;
  }

  .app-sidebar.open {
    transform: translateX(${structure.sidebarPosition === 'left' ? '260px' : '-260px'});
  }
}
` : ''}

/* Content area */
.app-content {
  flex: 1;
  padding: 24px;
  background: #ffffff;
}

.content-wrapper {
  max-width: ${structure.maxWidth};
${structure.maxWidth !== '100%' ? '  margin: 0 auto;\n' : ''}
}

${structure.footer ? `/* Footer */
.app-footer {
  background: #2c3e50;
  color: #ffffff;
  padding: 32px 24px;
  margin-top: auto;
}

.footer-content {
  max-width: ${structure.maxWidth === '100%' ? 'none' : structure.maxWidth};
  margin: 0 auto;
  text-align: center;
}
` : ''}
\`\`\`

### React/Component Implementation

For React applications:

\`\`\`jsx
// Layout.jsx
import React from 'react';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="app-container">
${structure.header ? `      <Header />
` : ''}      <div className="app-main">
${structure.sidebar ? `        <Sidebar position="${structure.sidebarPosition}" />
` : ''}        <main className="app-content">
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
${structure.footer ? `      <Footer />
` : ''}    </div>
  );
};

export default Layout;
\`\`\`

## Responsive Breakpoints

Recommended breakpoints for this layout:

- **Mobile:** < 768px
  - ${structure.sidebar ? 'Sidebar: Collapsible/drawer style' : ''}
  - ${structure.header ? 'Header: Hamburger menu' : ''}
  - Content: Single column, full-width padding reduced

- **Tablet:** 768px - 1024px
  - ${structure.sidebar ? 'Sidebar: Consider toggle visibility' : ''}
  - Content: Adjust grid columns (if applicable)
  - Maintain comfortable reading width

- **Desktop:** > 1024px
  - Full layout as designed
  - ${structure.sidebar ? 'Sidebar: Always visible' : ''}
  - Optimal spacing and proportions

## Accessibility Considerations

1. **Semantic HTML:** Use proper HTML5 semantic elements
2. **ARIA Labels:** Add appropriate ARIA labels for screen readers
3. **Keyboard Navigation:** Ensure all interactive elements are keyboard accessible
4. **Focus Indicators:** Clear focus states for keyboard navigation
5. **Skip Links:** Add skip-to-content links ${structure.header ? 'after header' : ''}
6. **Color Contrast:** Maintain WCAG AA compliance (4.5:1 for normal text)

## Performance Optimization

1. **Lazy Loading:** Consider lazy loading ${structure.sidebar ? 'sidebar content' : 'content sections'}
2. **Code Splitting:** Split by routes/sections for better load times
3. **CSS Optimization:** Use CSS containment for ${structure.sidebar ? 'sidebar' : 'independent sections'}
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
- ${structure.sidebar ? 'Consider sidebar state persistence (open/closed)' : ''}
- ${structure.footer ? 'Footer should stick to bottom even with minimal content' : ''}

## Integration with UI Styles

This layout should be used in conjunction with the active UI Styles (colors, typography, spacing) configured in the UI Styles page. Reference the UI Styles specification for:

- Color palette (primary, neutral, semantic colors)
- Typography scale (font sizes, weights, line heights)
- Spacing system (margins, padding, gaps)
- Button styles (primary, secondary, accent)

---

**Specification Version:** 1.0
**Last Updated:** ${timestamp}
`;
  };

  // Save specification to file system
  const saveLayoutSpecification = async (layout: LayoutConfig) => {
    if (!currentWorkspace?.projectFolder) {
      console.warn('No project folder configured for workspace');
      return;
    }

    try {
      const specification = generateLayoutSpecification(layout);
      const fileName = 'UI-FRAMEWORK.md';

      // Call backend API to save the file (port 4001 is the workspace server)
      await axios.post(`${SPEC_URL}/api/save-specification`, {
        fileName: fileName,
        content: specification,
        workspacePath: currentWorkspace.projectFolder,
        subfolder: 'design'
      });

      console.log(`✅ Layout specification saved: ${fileName}`);
    } catch (error) {
      console.error('Failed to save layout specification:', error);
      // Don't show alert to user, just log the error
    }
  };

  const handleSelectLayout = (layoutId: string) => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Switch layout anyway?')) {
        setSelectedLayoutId(layoutId);
      }
    } else {
      setSelectedLayoutId(layoutId);
    }
  };

  const handleActivateLayout = async () => {
    const layout = layouts.find(l => l.id === selectedLayoutId);
    if (!layout || !currentWorkspace) return;

    try {
      // Update workspace with selected layout
      await updateWorkspace(currentWorkspace.id, { selectedUILayout: selectedLayoutId });

      // Save specification file
      await saveLayoutSpecification(layout);

      // Set as activated
      setActivatedLayoutId(selectedLayoutId);

      // Show success message
      setShowActivationSuccess(true);
      setTimeout(() => setShowActivationSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to activate layout:', error);
      alert('Failed to activate layout. Please try again.');
    }
  };

  const handleCustomize = () => {
    setShowCustomizeModal(true);
  };

  const handleSaveCustom = async () => {
    if (!currentWorkspace || !newLayoutName.trim()) {
      alert('Please enter a layout name');
      return;
    }

    const newLayout: LayoutConfig = {
      id: `custom-${Date.now()}`,
      name: newLayoutName,
      description: 'Custom layout configuration',
      category: 'Custom',
      structure: {
        header: customHeader,
        sidebar: customSidebar,
        sidebarPosition: customSidebarPosition,
        footer: customFooter,
        contentLayout: customContentLayout,
        maxWidth: customMaxWidth,
      },
      preview: 'custom',
      isCustom: true,
    };

    const customLayouts = currentWorkspace.customUILayouts || [];
    const updatedCustomLayouts = [...customLayouts, newLayout];

    await updateWorkspace(currentWorkspace.id, {
      customUILayouts: updatedCustomLayouts,
    });

    setLayouts([...defaultLayouts, ...updatedCustomLayouts]);
    setSelectedLayoutId(newLayout.id);

    // Don't save specification yet - user must click "Activate" button

    setShowSaveModal(false);
    setShowCustomizeModal(false);
    setNewLayoutName('');
    setHasChanges(false);
  };

  const handleDeleteCustom = async () => {
    if (!currentWorkspace) return;

    const layout = layouts.find(l => l.id === selectedLayoutId);
    if (!layout || !layout.isCustom) {
      alert('Can only delete custom layouts');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${layout.name}"?`)) {
      return;
    }

    const customLayouts = currentWorkspace.customUILayouts || [];
    const updatedCustomLayouts = customLayouts.filter(l => l.id !== selectedLayoutId);

    await updateWorkspace(currentWorkspace.id, {
      customUILayouts: updatedCustomLayouts,
    });

    setLayouts([...defaultLayouts, ...updatedCustomLayouts]);
    setSelectedLayoutId('dashboard-admin');
  };

  // Page Layout handlers
  const handleSelectPageLayout = (layoutId: string) => {
    if (pageLayoutHasChanges) {
      if (confirm('You have unsaved changes. Switch layout anyway?')) {
        setSelectedPageLayoutId(layoutId);
      }
    } else {
      setSelectedPageLayoutId(layoutId);
    }
  };

  const handleActivatePageLayout = async () => {
    const layout = pageLayouts.find(l => l.id === selectedPageLayoutId);
    if (!layout || !currentWorkspace) return;

    try {
      // Update workspace with selected page layout
      await updateWorkspace(currentWorkspace.id, { pageLayoutConfig: layout });

      // Set as activated
      setActivePageLayoutId(selectedPageLayoutId);

      // Show success message
      setShowPageLayoutSuccess(true);
      setTimeout(() => setShowPageLayoutSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to activate page layout:', error);
      alert('Failed to activate page layout. Please try again.');
    }
  };

  const handleCustomizePageLayout = () => {
    setShowPageLayoutCustomizeModal(true);
  };

  const handleSaveCustomPageLayout = async () => {
    if (!currentWorkspace || !newPageLayoutName.trim()) {
      alert('Please enter a layout name');
      return;
    }

    const newLayout: PageLayoutConfig = {
      id: `custom-page-${Date.now()}`,
      name: newPageLayoutName,
      showWizard: customShowWizard,
      showAIPreset: customShowAIPreset,
      showUIFramework: customShowUIFramework,
      showWorkspace: customShowWorkspace,
      showTitle: customShowTitle,
      showDescription: customShowDescription,
      showInfoButton: customShowInfoButton,
    };

    const customLayouts = currentWorkspace.customPageLayouts || [];
    const updatedCustomLayouts = [...customLayouts, newLayout];

    await updateWorkspace(currentWorkspace.id, {
      customPageLayouts: updatedCustomLayouts,
    });

    setPageLayouts([...DEFAULT_LAYOUTS, ...updatedCustomLayouts]);
    setSelectedPageLayoutId(newLayout.id);

    setShowPageLayoutSaveModal(false);
    setShowPageLayoutCustomizeModal(false);
    setNewPageLayoutName('');
    setPageLayoutHasChanges(false);
  };

  const handleDeleteCustomPageLayout = async () => {
    if (!currentWorkspace) return;

    const layout = pageLayouts.find(l => l.id === selectedPageLayoutId);
    if (!layout || layout.isDefault) {
      alert('Can only delete custom layouts');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${layout.name}"?`)) {
      return;
    }

    const customLayouts = currentWorkspace.customPageLayouts || [];
    const updatedCustomLayouts = customLayouts.filter(l => l.id !== selectedPageLayoutId);

    await updateWorkspace(currentWorkspace.id, {
      customPageLayouts: updatedCustomLayouts,
    });

    setPageLayouts([...DEFAULT_LAYOUTS, ...updatedCustomLayouts]);
    setSelectedPageLayoutId('standard');
  };

  const categories = ['all', ...Array.from(new Set(layouts.map(l => l.category)))];
  const filteredLayouts = filterCategory === 'all'
    ? layouts
    : layouts.filter(l => l.category === filterCategory);

  const selectedLayout = layouts.find(l => l.id === selectedLayoutId);

  if (!currentWorkspace) {
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <h2 className="text-2xl font-semibold mb-4">UI Framework</h2>
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <p>Please select a workspace to configure UI layouts.</p>
        </div>
      </div>
    );
  }

  const selectedPageLayout = pageLayouts.find(l => l.id === selectedPageLayoutId);

  return (
    <PageLayout
      title="UI Framework"
      quickDescription="Choose and customize layouts for your application and pages."
      detailedDescription="The UI Framework page allows you to configure two types of layouts: Application Layouts (the overall structure of your web application) and Page Layouts (what header elements appear on each page within IntentR)."
    >

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '24px',
        borderBottom: '2px solid #e0e0e0',
      }}>
        <button
          onClick={() => setActiveTab('application')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'application' ? '3px solid #133A7C' : '3px solid transparent',
            color: activeTab === 'application' ? '#133A7C' : '#666',
            fontWeight: activeTab === 'application' ? '600' : '400',
            fontSize: '15px',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s ease',
          }}
        >
          Application Layouts
        </button>
        <button
          onClick={() => setActiveTab('page')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'page' ? '3px solid #133A7C' : '3px solid transparent',
            color: activeTab === 'page' ? '#133A7C' : '#666',
            fontWeight: activeTab === 'page' ? '600' : '400',
            fontSize: '15px',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s ease',
          }}
        >
          Page Layouts
        </button>
      </div>

      {/* Application Layouts Tab */}
      {activeTab === 'application' && (
        <>
          {/* Category Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: '500', fontSize: '15px' }}>Filter by category:</span>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: filterCategory === cat ? '2px solid #133A7C' : '1px solid #ccc',
              backgroundColor: filterCategory === cat ? '#E8F4FB' : 'white',
              color: filterCategory === cat ? '#133A7C' : '#666',
              fontWeight: filterCategory === cat ? '600' : '400',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {filteredLayouts.map(layout => (
          <div
            key={layout.id}
            onClick={() => handleSelectLayout(layout.id)}
            style={{
              padding: '24px',
              border: selectedLayoutId === layout.id ? '3px solid #133A7C' : '1px solid #e0e0e0',
              borderRadius: '12px',
              backgroundColor: selectedLayoutId === layout.id ? '#E8F4FB' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedLayoutId === layout.id ? '0 4px 12px rgba(19, 58, 124, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {/* Preview */}
            <div style={{
              height: '180px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ddd',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <LayoutPreview layout={layout} />
            </div>

            {/* Info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: '#081534' }}>
                {layout.name}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {layout.isCustom && (
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#47A8E5',
                    color: 'white',
                    fontSize: '11px',
                    borderRadius: '4px',
                    fontWeight: '600',
                  }}>
                    CUSTOM
                  </span>
                )}
                {activatedLayoutId === layout.id && (
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    fontSize: '11px',
                    borderRadius: '4px',
                    fontWeight: '600',
                  }}>
                    ✓ ACTIVE
                  </span>
                )}
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', lineHeight: '1.5' }}>
              {layout.description}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#f0f0f0', borderRadius: '4px', color: '#333' }}>
                {layout.category}
              </span>
              {layout.structure.header && (
                <span style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#e8f5e9', borderRadius: '4px', color: '#2e7d32' }}>
                  Header
                </span>
              )}
              {layout.structure.sidebar && (
                <span style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#e3f2fd', borderRadius: '4px', color: '#1565c0' }}>
                  Sidebar
                </span>
              )}
              {layout.structure.footer && (
                <span style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#fff3e0', borderRadius: '4px', color: '#e65100' }}>
                  Footer
                </span>
              )}
            </div>

            {selectedLayoutId === layout.id && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd', display: 'flex', gap: '8px' }}>
                <Button
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCustomize();
                  }}
                  style={{ flex: 1, fontSize: '14px', padding: '8px 12px' }}
                >
                  Customize
                </Button>
                {layout.isCustom && (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustom();
                    }}
                    style={{ fontSize: '14px', padding: '8px 12px', color: '#dc3545', borderColor: '#dc3545' }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Activate Layout Section */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'white',
        padding: '24px',
        borderTop: '2px solid #e0e0e0',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
        marginTop: '32px',
        marginLeft: '-16px',
        marginRight: '-16px',
        marginBottom: '-16px',
        borderRadius: '12px 12px 0 0',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, marginBottom: '8px', color: '#081534' }}>
              {selectedLayout ? selectedLayout.name : 'No layout selected'}
            </h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              {selectedLayout
                ? activatedLayoutId === selectedLayoutId
                  ? '✓ This layout is currently active for this workspace'
                  : 'Click "Activate Layout" to use this layout for your workspace'
                : 'Select a layout above to activate it'
              }
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleActivateLayout}
            disabled={!selectedLayout || activatedLayoutId === selectedLayoutId}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: activatedLayoutId === selectedLayoutId ? '#ccc' : '#133A7C',
              cursor: activatedLayoutId === selectedLayoutId ? 'not-allowed' : 'pointer',
              minWidth: '200px',
            }}
          >
            {activatedLayoutId === selectedLayoutId ? '✓ Activated' : 'Activate Layout'}
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {showActivationSuccess && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#4caf50',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideInRight 0.3s ease-out',
        }}>
          <span style={{ fontSize: '24px' }}>✓</span>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px' }}>Layout Activated!</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>UI-FRAMEWORK.md has been generated</div>
          </div>
        </div>
      )}

      {/* Customize Modal */}
      {showCustomizeModal && selectedLayout && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCustomizeModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '32px',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Customize Layout</h3>
            <p style={{ marginBottom: '24px', color: '#666', fontSize: '14px' }}>
              Adjust the structure of your layout. Save as a new custom layout when done.
            </p>

            {/* Structure Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customHeader}
                    onChange={(e) => {
                      setCustomHeader(e.target.checked);
                      setHasChanges(true);
                    }}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: '500' }}>Include Header</span>
                </label>
                <p style={{ marginLeft: '26px', marginTop: '4px', fontSize: '13px', color: '#666' }}>
                  Top navigation bar with logo and menu
                </p>
              </div>

              {/* Sidebar */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customSidebar}
                    onChange={(e) => {
                      setCustomSidebar(e.target.checked);
                      setHasChanges(true);
                    }}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: '500' }}>Include Sidebar</span>
                </label>
                <p style={{ marginLeft: '26px', marginTop: '4px', fontSize: '13px', color: '#666' }}>
                  Vertical navigation or filter panel
                </p>
                {customSidebar && (
                  <div style={{ marginLeft: '26px', marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px' }}>Position:</label>
                    <select
                      value={customSidebarPosition}
                      onChange={(e) => {
                        setCustomSidebarPosition(e.target.value as 'left' | 'right');
                        setHasChanges(true);
                      }}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customFooter}
                    onChange={(e) => {
                      setCustomFooter(e.target.checked);
                      setHasChanges(true);
                    }}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: '500' }}>Include Footer</span>
                </label>
                <p style={{ marginLeft: '26px', marginTop: '4px', fontSize: '13px', color: '#666' }}>
                  Bottom section with links and information
                </p>
              </div>

              {/* Content Layout */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  Content Layout:
                </label>
                <select
                  value={customContentLayout}
                  onChange={(e) => {
                    setCustomContentLayout(e.target.value as any);
                    setHasChanges(true);
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
                >
                  <option value="single">Single Column</option>
                  <option value="grid">Grid System</option>
                  <option value="flex">Flexible Flex Layout</option>
                  <option value="sections">Sectioned Layout</option>
                </select>
              </div>

              {/* Max Width */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  Max Width:
                </label>
                <select
                  value={customMaxWidth}
                  onChange={(e) => {
                    setCustomMaxWidth(e.target.value);
                    setHasChanges(true);
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
                >
                  <option value="100%">Full Width (100%)</option>
                  <option value="1440px">Extra Large (1440px)</option>
                  <option value="1200px">Large (1200px)</option>
                  <option value="960px">Medium (960px)</option>
                  <option value="768px">Small (768px)</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e0e0e0' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomizeModal(false);
                  // Reset to selected layout
                  const layout = layouts.find(l => l.id === selectedLayoutId);
                  if (layout) {
                    setCustomHeader(layout.structure.header);
                    setCustomSidebar(layout.structure.sidebar);
                    setCustomSidebarPosition(layout.structure.sidebarPosition || 'left');
                    setCustomFooter(layout.structure.footer);
                    setCustomContentLayout(layout.structure.contentLayout);
                    setCustomMaxWidth(layout.structure.maxWidth || '100%');
                    setHasChanges(false);
                  }
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowSaveModal(true)}
                disabled={!hasChanges}
                style={{ flex: 1 }}
              >
                Save as New Layout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}
          onClick={() => setShowSaveModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '32px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Save Custom Layout</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Enter a name for your custom layout. It will be saved to this workspace.
            </p>
            <input
              type="text"
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
              placeholder="e.g., My Custom Dashboard"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginBottom: '20px',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveModal(false);
                  setNewLayoutName('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveCustom}
                disabled={!newLayoutName.trim()}
              >
                Save Layout
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Page Layouts Tab */}
      {activeTab === 'page' && (
        <>
          {/* Description */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>About Page Layouts</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.6' }}>
              Page Layouts control which header elements appear on each page within IntentR. This includes the wizard navigation, AI/UI preset indicators, workspace bar, page title, and description. Choose a preset or create a custom configuration.
            </p>
          </div>

          {/* Page Layout Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {pageLayouts.map(layout => (
              <div
                key={layout.id}
                onClick={() => handleSelectPageLayout(layout.id)}
                style={{
                  padding: '20px',
                  border: selectedPageLayoutId === layout.id ? '3px solid #133A7C' : '1px solid #e0e0e0',
                  borderRadius: '12px',
                  backgroundColor: selectedPageLayoutId === layout.id ? '#E8F4FB' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedPageLayoutId === layout.id ? '0 4px 12px rgba(19, 58, 124, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                }}
              >
                {/* Preview */}
                <div style={{
                  height: '120px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid #ddd',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <PageLayoutPreview layout={layout} />
                </div>

                {/* Info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: '#081534' }}>
                    {layout.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {layout.isDefault && (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        fontSize: '10px',
                        borderRadius: '4px',
                        fontWeight: '600',
                      }}>
                        DEFAULT
                      </span>
                    )}
                    {!layout.isDefault && (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#47A8E5',
                        color: 'white',
                        fontSize: '10px',
                        borderRadius: '4px',
                        fontWeight: '600',
                      }}>
                        CUSTOM
                      </span>
                    )}
                    {activePageLayoutId === layout.id && (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        fontSize: '10px',
                        borderRadius: '4px',
                        fontWeight: '600',
                      }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Feature tags */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {layout.showWizard && (
                    <span style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#e8f5e9', borderRadius: '4px', color: '#2e7d32' }}>
                      Wizard
                    </span>
                  )}
                  {layout.showAIPreset && (
                    <span style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#e3f2fd', borderRadius: '4px', color: '#1565c0' }}>
                      AI Preset
                    </span>
                  )}
                  {layout.showUIFramework && (
                    <span style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#fff3e0', borderRadius: '4px', color: '#e65100' }}>
                      UI Framework
                    </span>
                  )}
                  {layout.showWorkspace && (
                    <span style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#fce4ec', borderRadius: '4px', color: '#c2185b' }}>
                      Workspace
                    </span>
                  )}
                  {layout.showTitle && (
                    <span style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#f3e5f5', borderRadius: '4px', color: '#7b1fa2' }}>
                      Title
                    </span>
                  )}
                  {layout.showInfoButton && (
                    <span style={{ fontSize: '10px', padding: '3px 6px', backgroundColor: '#e0f2f1', borderRadius: '4px', color: '#00695c' }}>
                      Info
                    </span>
                  )}
                </div>

                {selectedPageLayoutId === layout.id && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd', display: 'flex', gap: '8px' }}>
                    <Button
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCustomizePageLayout();
                      }}
                      style={{ flex: 1, fontSize: '13px', padding: '8px 12px' }}
                    >
                      Customize
                    </Button>
                    {!layout.isDefault && (
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomPageLayout();
                        }}
                        style={{ fontSize: '13px', padding: '8px 12px', color: '#dc3545', borderColor: '#dc3545' }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Activate Page Layout Section */}
          <div style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'white',
            padding: '24px',
            borderTop: '2px solid #e0e0e0',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
            marginTop: '32px',
            marginLeft: '-16px',
            marginRight: '-16px',
            marginBottom: '-16px',
            borderRadius: '12px 12px 0 0',
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, marginBottom: '8px', color: '#081534' }}>
                  {selectedPageLayout ? selectedPageLayout.name : 'No layout selected'}
                </h3>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  {selectedPageLayout
                    ? activePageLayoutId === selectedPageLayoutId
                      ? 'This layout is currently active for this workspace'
                      : 'Click "Activate Layout" to use this configuration'
                    : 'Select a layout above to activate it'
                  }
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleActivatePageLayout}
                disabled={!selectedPageLayout || activePageLayoutId === selectedPageLayoutId}
                style={{
                  padding: '14px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: activePageLayoutId === selectedPageLayoutId ? '#ccc' : '#133A7C',
                  cursor: activePageLayoutId === selectedPageLayoutId ? 'not-allowed' : 'pointer',
                  minWidth: '200px',
                }}
              >
                {activePageLayoutId === selectedPageLayoutId ? 'Activated' : 'Activate Layout'}
              </Button>
            </div>
          </div>

          {/* Page Layout Success Message */}
          {showPageLayoutSuccess && (
            <div style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: '#4caf50',
              color: 'white',
              padding: '16px 24px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '24px' }}>&#10003;</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>Page Layout Activated!</div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Changes will apply to all pages</div>
              </div>
            </div>
          )}

          {/* Page Layout Customize Modal */}
          {showPageLayoutCustomizeModal && selectedPageLayout && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => setShowPageLayoutCustomizeModal(false)}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  padding: '32px',
                  borderRadius: '12px',
                  maxWidth: '550px',
                  width: '90%',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Customize Page Layout</h3>
                <p style={{ marginBottom: '24px', color: '#666', fontSize: '14px' }}>
                  Toggle which header elements appear on pages. Save as a new layout when done.
                </p>

                {/* Toggle Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Wizard Navigation */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={customShowWizard}
                      onChange={(e) => {
                        setCustomShowWizard(e.target.checked);
                        setPageLayoutHasChanges(true);
                      }}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>Wizard Navigation</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>Step-by-step workflow navigation bar</span>
                    </div>
                  </label>

                  {/* AI Preset Indicator */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={customShowAIPreset}
                      onChange={(e) => {
                        setCustomShowAIPreset(e.target.checked);
                        setPageLayoutHasChanges(true);
                      }}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>AI Preset Badge</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>Shows active AI governance level (1-5)</span>
                    </div>
                  </label>

                  {/* UI Framework Indicator */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={customShowUIFramework}
                      onChange={(e) => {
                        setCustomShowUIFramework(e.target.checked);
                        setPageLayoutHasChanges(true);
                      }}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>UI Framework Badge</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>Shows selected application layout</span>
                    </div>
                  </label>

                  {/* Workspace Bar */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={customShowWorkspace}
                      onChange={(e) => {
                        setCustomShowWorkspace(e.target.checked);
                        setPageLayoutHasChanges(true);
                      }}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>Workspace Name</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>Displays current workspace name</span>
                    </div>
                  </label>

                  {/* Page Title */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={customShowTitle}
                      onChange={(e) => {
                        setCustomShowTitle(e.target.checked);
                        setPageLayoutHasChanges(true);
                      }}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>Page Title</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>Shows the page name heading</span>
                    </div>
                  </label>

                  {/* Description */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={customShowDescription}
                      onChange={(e) => {
                        setCustomShowDescription(e.target.checked);
                        setPageLayoutHasChanges(true);
                      }}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>Quick Description</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>Brief description below the title</span>
                    </div>
                  </label>

                  {/* Info Button */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={customShowInfoButton}
                      onChange={(e) => {
                        setCustomShowInfoButton(e.target.checked);
                        setPageLayoutHasChanges(true);
                      }}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>Info Button</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>Expandable detailed description</span>
                    </div>
                  </label>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e0e0e0' }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPageLayoutCustomizeModal(false);
                      // Reset to selected layout
                      const layout = pageLayouts.find(l => l.id === selectedPageLayoutId);
                      if (layout) {
                        setCustomShowWizard(layout.showWizard);
                        setCustomShowAIPreset(layout.showAIPreset);
                        setCustomShowUIFramework(layout.showUIFramework);
                        setCustomShowWorkspace(layout.showWorkspace);
                        setCustomShowTitle(layout.showTitle);
                        setCustomShowDescription(layout.showDescription);
                        setCustomShowInfoButton(layout.showInfoButton);
                        setPageLayoutHasChanges(false);
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setShowPageLayoutSaveModal(true)}
                    disabled={!pageLayoutHasChanges}
                    style={{ flex: 1 }}
                  >
                    Save as New Layout
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Page Layout Save Modal */}
          {showPageLayoutSaveModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1001,
              }}
              onClick={() => setShowPageLayoutSaveModal(false)}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  padding: '32px',
                  borderRadius: '12px',
                  maxWidth: '500px',
                  width: '90%',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Save Custom Page Layout</h3>
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  Enter a name for your custom page layout.
                </p>
                <input
                  type="text"
                  value={newPageLayoutName}
                  onChange={(e) => setNewPageLayoutName(e.target.value)}
                  placeholder="e.g., Minimal Development"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '15px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    marginBottom: '20px',
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPageLayoutSaveModal(false);
                      setNewPageLayoutName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveCustomPageLayout}
                    disabled={!newPageLayoutName.trim()}
                  >
                    Save Layout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
};

// Page Layout Preview Component
const PageLayoutPreview: React.FC<{ layout: PageLayoutConfig }> = ({ layout }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '6px',
      backgroundColor: '#fff',
    }}>
      {/* Wizard */}
      {layout.showWizard && (
        <div style={{
          height: '12px',
          backgroundColor: '#e3f2fd',
          borderRadius: '2px',
          marginBottom: '4px',
          display: 'flex',
          gap: '2px',
          padding: '2px',
        }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ flex: 1, backgroundColor: i <= 2 ? '#1976d2' : '#90caf9', borderRadius: '1px' }} />
          ))}
        </div>
      )}

      {/* AI Preset / UI Framework Row */}
      {(layout.showAIPreset || layout.showUIFramework) && (
        <div style={{
          height: '10px',
          display: 'flex',
          gap: '4px',
          marginBottom: '4px',
        }}>
          {layout.showAIPreset && (
            <div style={{ width: '40px', backgroundColor: '#e8f5e9', borderRadius: '2px' }} />
          )}
          {layout.showUIFramework && (
            <div style={{ width: '50px', backgroundColor: '#fff3e0', borderRadius: '2px' }} />
          )}
        </div>
      )}

      {/* Workspace Bar */}
      {layout.showWorkspace && (
        <div style={{
          height: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '2px',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '4px',
        }}>
          <div style={{ width: '30px', height: '6px', backgroundColor: '#bdbdbd', borderRadius: '1px' }} />
        </div>
      )}

      {/* Title */}
      {layout.showTitle && (
        <div style={{
          height: '14px',
          backgroundColor: '#081534',
          borderRadius: '2px',
          marginBottom: '4px',
          width: '60%',
        }} />
      )}

      {/* Description + Info */}
      {layout.showDescription && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '4px',
        }}>
          <div style={{ flex: 1, height: '8px', backgroundColor: '#e0e0e0', borderRadius: '2px' }} />
          {layout.showInfoButton && (
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#133A7C',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '8px',
              fontWeight: 'bold',
            }}>i</div>
          )}
        </div>
      )}

      {/* Content placeholder */}
      <div style={{ flex: 1, backgroundColor: '#fafafa', borderRadius: '2px', border: '1px dashed #ddd' }} />
    </div>
  );
};

// Layout Preview Component
const LayoutPreview: React.FC<{ layout: LayoutConfig }> = ({ layout }) => {
  const { structure } = layout;

  // Special preview for Android Material Design
  if (layout.id === 'android-material') {
    return (
      <div style={{
        width: '60%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '4px',
        margin: '0 auto',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '2px solid #333',
      }}>
        {/* Status bar */}
        <div style={{
          height: '8px',
          backgroundColor: '#1a73e8',
          borderRadius: '4px 4px 0 0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingRight: '4px',
          gap: '2px',
        }}>
          <div style={{ width: '6px', height: '4px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '1px' }} />
          <div style={{ width: '8px', height: '4px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '1px' }} />
        </div>
        {/* Top App Bar */}
        <div style={{
          height: '20px',
          backgroundColor: '#1a73e8',
          display: 'flex',
          alignItems: 'center',
          padding: '0 6px',
          gap: '6px',
        }}>
          <div style={{ width: '10px', height: '10px', display: 'flex', flexDirection: 'column', gap: '1px', justifyContent: 'center' }}>
            <div style={{ width: '10px', height: '2px', backgroundColor: 'white' }} />
            <div style={{ width: '10px', height: '2px', backgroundColor: 'white' }} />
            <div style={{ width: '10px', height: '2px', backgroundColor: 'white' }} />
          </div>
          <span style={{ color: 'white', fontSize: '8px', fontWeight: '500' }}>App Title</span>
        </div>
        {/* Content */}
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          position: 'relative',
        }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: '20px', backgroundColor: '#e8f0fe', borderRadius: '2px' }} />
          ))}
          {/* FAB */}
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '16px',
            height: '16px',
            backgroundColor: '#1a73e8',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
          }}>+</div>
        </div>
        {/* Bottom Navigation */}
        <div style={{
          height: '20px',
          backgroundColor: 'white',
          borderTop: '1px solid #e0e0e0',
          borderRadius: '0 0 4px 4px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}>
          {['🏠', '🔍', '📱', '👤'].map((icon, i) => (
            <div key={i} style={{ fontSize: '10px', opacity: i === 0 ? 1 : 0.5 }}>{icon}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '8px',
    }}>
      {/* Header */}
      {structure.header && (
        <div style={{
          height: '16px',
          backgroundColor: '#133A7C',
          borderRadius: '2px',
          marginBottom: '4px',
        }} />
      )}

      {/* Main content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '4px',
      }}>
        {/* Sidebar */}
        {structure.sidebar && structure.sidebarPosition === 'left' && (
          <div style={{
            width: '30%',
            backgroundColor: '#2A6BAC',
            borderRadius: '2px',
          }} />
        )}

        {/* Content */}
        <div style={{
          flex: 1,
          backgroundColor: '#E8F4FB',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#666',
          padding: '4px',
        }}>
          {structure.contentLayout === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px', width: '100%', height: '100%' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ backgroundColor: 'white', borderRadius: '1px' }} />
              ))}
            </div>
          )}
          {structure.contentLayout === 'sections' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', height: '100%' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: '1px' }} />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {structure.sidebar && structure.sidebarPosition === 'right' && (
          <div style={{
            width: '30%',
            backgroundColor: '#2A6BAC',
            borderRadius: '2px',
          }} />
        )}
      </div>

      {/* Footer */}
      {structure.footer && (
        <div style={{
          height: '12px',
          backgroundColor: '#3E5966',
          borderRadius: '2px',
          marginTop: '4px',
        }} />
      )}
    </div>
  );
};
