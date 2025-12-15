# Quick Start: Figma Workspace Integration

## 🚀 Get Started in 3 Steps

### Step 1: Configure Figma (One-Time)
1. Open http://localhost:5173/integrations
2. Click **Configure** on "Figma API"
3. Enter your Figma Personal Access Token
   - Get from: https://www.figma.com/developers/api
   - Settings → Account → Personal Access Tokens
4. Click **Save Configuration**

### Step 2: Add Team URL to Workspace
1. Open http://localhost:5173/workspaces
2. Create a new workspace OR edit existing one
3. In "Figma Team URL" field, paste your team URL
   - Go to Figma → Your Team Files
   - Copy browser URL (looks like: `https://www.figma.com/files/team/123456/Team-Name`)
4. Click **Create** or **Save Changes**

### Step 3: Select Figma Files
1. Open http://localhost:5173/designs
2. You'll see all your Figma projects automatically
3. Click **Select Files** on any project
4. Choose the files you want
5. Click **Save X Files**

## ✅ That's It!

Your selected Figma files are now available in the workspace and will persist across sessions.

## 🎯 What You Can Do Now

- **View All Projects**: See all projects from your Figma team
- **Browse Files**: Click any project to see its files with thumbnails
- **Select Specific Files**: Choose only the files you need for this workspace
- **Quick Access**: Selected files show at the top with thumbnails and links
- **Remove Files**: Click "Remove" on any file to unselect it

## 🔍 Visual Guide

```
1. Workspaces Page
   ┌─────────────────────────────┐
   │ Create Workspace            │
   ├─────────────────────────────┤
   │ Name: My Project            │
   │ Description: ...            │
   │ Figma Team URL: [paste]  ←  │  Paste your team URL here
   └─────────────────────────────┘

2. Designs Page
   ┌─────────────────────────────┐
   │ Selected Files (2)          │  ← Your selected files appear here
   ├─────────────────────────────┤
   │ [thumbnail] File 1 [Remove] │
   │ [thumbnail] File 2 [Remove] │
   └─────────────────────────────┘

   ┌─────────────────────────────┐
   │ Figma Projects              │  ← Projects from your team
   ├─────────────────────────────┤
   │ 🎨 Design System            │
   │    2 files selected         │
   │    [Select Files]           │
   └─────────────────────────────┘

3. File Selection Modal
   ┌─────────────────────────────┐
   │ Select Files - Design Sys   │
   ├─────────────────────────────┤
   │ ☑ [thumbnail] Homepage      │  ← Check files you want
   │ ☑ [thumbnail] Components    │
   │ ☐ [thumbnail] Archive       │
   │                             │
   │ [Save 2 Files] [Cancel]     │
   └─────────────────────────────┘
```

## 💡 Tips

- **One Token**: You only need to configure Figma integration once
- **Multiple Workspaces**: Each workspace can have a different team URL
- **Same Team**: Multiple workspaces can share the same team URL
- **Update Anytime**: Edit workspace to change or add team URL later
- **Refresh Projects**: Click 🔄 Refresh button to update projects list

## ⚠️ Important Notes

- Make sure your Figma token has access to the team you're trying to use
- Team URL must be from the files page (not a specific file URL)
- Changes to selected files are saved immediately

## 🐛 Common Issues

**"No projects found"**
- Check your team URL is correct
- Verify your Figma token has access to that team

**"Figma Not Configured"**
- Go to Integrations page and configure Figma first

**"Figma Team URL Not Configured"**
- Edit your workspace and add the team URL

## 🎉 You're Ready!

The feature is live and ready to use at http://localhost:5173

For detailed documentation, see: `FIGMA_WORKSPACE_INTEGRATION.md`
