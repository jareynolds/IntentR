import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API endpoint to save specification markdown
app.post('/api/save-specification', async (req, res) => {
  try {
    const { fileName, content, workspacePath, subfolder } = req.body;

    if (!fileName || !content) {
      return res.status(400).json({ error: 'fileName and content are required' });
    }

    // Determine target folder - use subfolder if provided, default to 'specifications'
    const targetSubfolder = subfolder || 'specifications';

    // Determine specifications path
    let specificationsPath;
    if (workspacePath) {
      // Use workspace-specific folder
      // Resolve relative workspace path from project root (one level up from web-ui)
      specificationsPath = path.join(__dirname, '..', workspacePath, targetSubfolder);
    } else {
      // Fallback to default specifications folder (one level up from web-ui)
      specificationsPath = path.join(__dirname, '..', 'specifications');
    }

    // Ensure specifications folder exists
    try {
      await fs.access(specificationsPath);
    } catch {
      await fs.mkdir(specificationsPath, { recursive: true });
    }

    // Write the markdown file
    const filePath = path.join(specificationsPath, fileName);
    await fs.writeFile(filePath, content, 'utf-8');

    res.json({
      success: true,
      message: `File saved successfully`,
      path: path.relative(workspacePath || path.join(__dirname, '..'), filePath)
    });
  } catch (error) {
    console.error('Error saving specification:', error);
    res.status(500).json({
      error: 'Failed to save specification',
      details: error.message
    });
  }
});

// API endpoint to save multiple specification files
app.post('/api/save-specifications', async (req, res) => {
  try {
    const { files, images, workspacePath, subfolder } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    // Determine target folder - use subfolder if provided, default to 'specifications'
    const targetSubfolder = subfolder || 'specifications';

    // Determine specifications path
    let specificationsPath;
    if (workspacePath) {
      // Use workspace-specific folder
      // Resolve relative workspace path from project root (one level up from web-ui)
      specificationsPath = path.join(__dirname, '..', workspacePath, targetSubfolder);
    } else {
      // Fallback to default specifications folder (one level up from web-ui)
      specificationsPath = path.join(__dirname, '..', 'specifications');
    }

    // Ensure specifications folder exists
    try {
      await fs.access(specificationsPath);
    } catch {
      await fs.mkdir(specificationsPath, { recursive: true });
    }

    // Write all markdown files
    const savedFiles = [];
    for (const file of files) {
      if (!file.fileName || !file.content) {
        continue;
      }
      const filePath = path.join(specificationsPath, file.fileName);
      await fs.writeFile(filePath, file.content, 'utf-8');
      savedFiles.push(path.relative(workspacePath || path.join(__dirname, '..'), filePath));
    }

    // Write all image files
    const savedImages = [];
    if (images && Array.isArray(images)) {
      for (const image of images) {
        if (!image.fileName || !image.data) {
          continue;
        }

        // Parse data URL to extract base64 data
        const matches = image.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          const filePath = path.join(specificationsPath, image.fileName);
          await fs.writeFile(filePath, buffer);
          savedImages.push(path.relative(workspacePath || path.join(__dirname, '..'), filePath));

          // Save metadata (position, dimensions, tags, connections) as companion .json file
          const metadataFileName = image.fileName.replace(/\.[^.]+$/, '.json');
          const metadataFilePath = path.join(specificationsPath, metadataFileName);
          const metadata = {
            fileName: image.fileName,
            x: image.x || 50,
            y: image.y || 50,
            width: image.width || 300,
            height: image.height || 200,
            tags: image.tags || [],
            textContent: image.textContent || '',
            cardName: image.cardName || '',
            connectedTo: image.connectedTo || [],
            connectedFrom: image.connectedFrom || []
          };
          await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2), 'utf-8');
        }
      }
    }

    res.json({
      success: true,
      message: `${savedFiles.length} markdown files and ${savedImages.length} image files saved successfully`,
      files: savedFiles,
      images: savedImages,
      path: specificationsPath
    });
  } catch (error) {
    console.error('Error saving specifications:', error);
    res.status(500).json({
      error: 'Failed to save specifications',
      details: error.message
    });
  }
});

// API endpoint to read specification files from workspace
app.post('/api/read-specifications', async (req, res) => {
  try {
    const { workspacePath, subfolder } = req.body;

    // Determine target folder - use subfolder if provided, default to 'specifications'
    const targetSubfolder = subfolder || 'specifications';

    // Determine specifications path
    let specificationsPath;
    if (workspacePath) {
      // Check if workspacePath is absolute or relative
      if (path.isAbsolute(workspacePath)) {
        specificationsPath = path.join(workspacePath, targetSubfolder);
      } else {
        // Use workspace-specific folder relative to project root
        specificationsPath = path.join(__dirname, '..', workspacePath, targetSubfolder);
      }
    } else {
      // Fallback to default specifications folder
      specificationsPath = path.join(__dirname, '..', 'specifications');
    }

    console.log(`[read-specifications] Looking for files in: ${specificationsPath}`);

    // Check if specifications folder exists
    try {
      await fs.access(specificationsPath);
    } catch {
      console.log(`[read-specifications] Folder not found: ${specificationsPath}`);
      return res.json({
        success: true,
        files: [],
        images: [],
        message: `No specifications folder found at: ${specificationsPath}`
      });
    }

    // Read all files in the specifications folder
    const allFiles = await fs.readdir(specificationsPath);
    console.log(`[read-specifications] Found ${allFiles.length} total files:`, allFiles.slice(0, 10));

    // Filter for IDEA-* files
    const ideaMarkdownFiles = allFiles.filter(f => f.startsWith('IDEA-') && f.endsWith('.md'));
    const ideaImageFiles = allFiles.filter(f => f.startsWith('IDEA-') && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f));
    console.log(`[read-specifications] Found ${ideaMarkdownFiles.length} IDEA-*.md files and ${ideaImageFiles.length} IDEA-* images`);

    // Read markdown files
    const markdownContents = [];
    for (const fileName of ideaMarkdownFiles) {
      const filePath = path.join(specificationsPath, fileName);
      const content = await fs.readFile(filePath, 'utf-8');
      markdownContents.push({ fileName, content });
    }

    // Read image files as base64
    const imageContents = [];
    for (const fileName of ideaImageFiles) {
      const filePath = path.join(specificationsPath, fileName);
      const buffer = await fs.readFile(filePath);
      const base64Data = buffer.toString('base64');

      // Determine mime type
      let mimeType = 'image/png';
      if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (fileName.endsWith('.gif')) {
        mimeType = 'image/gif';
      } else if (fileName.endsWith('.webp')) {
        mimeType = 'image/webp';
      } else if (fileName.endsWith('.svg')) {
        mimeType = 'image/svg+xml';
      }

      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      // Read companion metadata file if it exists
      const metadataFileName = fileName.replace(/\.[^.]+$/, '.json');
      const metadataFilePath = path.join(specificationsPath, metadataFileName);
      let metadata = {};
      try {
        const metadataContent = await fs.readFile(metadataFilePath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      } catch {
        // Metadata file doesn't exist or is invalid, use defaults
      }

      imageContents.push({ fileName, data: dataUrl, metadata });
    }

    res.json({
      success: true,
      files: markdownContents,
      images: imageContents,
      path: specificationsPath
    });
  } catch (error) {
    console.error('Error reading specifications:', error);
    res.status(500).json({
      error: 'Failed to read specifications',
      details: error.message
    });
  }
});

// API endpoint to read enabler specification files (ENB-*.md)
app.post('/api/read-enabler-specifications', async (req, res) => {
  try {
    const { workspacePath } = req.body;

    // Enabler files are stored in the definition folder
    let specificationsPath;
    if (workspacePath) {
      specificationsPath = path.join(__dirname, '..', workspacePath, 'definition');
    } else {
      specificationsPath = path.join(__dirname, '..', 'specifications');
    }

    // Check if definition folder exists
    try {
      await fs.access(specificationsPath);
    } catch {
      return res.json({
        success: true,
        enablers: [],
        message: 'No definition folder found'
      });
    }

    // Read all files in the specifications folder
    const allFiles = await fs.readdir(specificationsPath);

    // Filter for ENB-*.md files
    const enablerFiles = allFiles.filter(f => f.startsWith('ENB-') && f.endsWith('.md'));

    // Parse each enabler file
    const enablers = [];
    for (const fileName of enablerFiles) {
      const filePath = path.join(specificationsPath, fileName);
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse metadata from markdown
      const metadata = parseEnablerMetadata(content);
      enablers.push({
        fileName,
        filePath: path.relative(path.join(__dirname, '..'), filePath),
        content,
        ...metadata
      });
    }

    res.json({
      success: true,
      enablers,
      count: enablers.length,
      path: specificationsPath
    });
  } catch (error) {
    console.error('Error reading enabler specifications:', error);
    res.status(500).json({
      error: 'Failed to read enabler specifications',
      details: error.message
    });
  }
});

// Helper function to parse enabler metadata from markdown content
function parseEnablerMetadata(content) {
  const metadata = {
    name: '',
    type: 'Enabler',
    id: '',
    capabilityId: '',
    owner: '',
    status: '',
    approval: '',
    priority: '',
    analysisReview: '',
    codeReview: '',
    purpose: '',
    functionalRequirements: [],
    nonFunctionalRequirements: []
  };

  // Extract title (first # heading)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    metadata.name = titleMatch[1].trim();
  }

  // Extract metadata fields
  const metadataPatterns = {
    name: /\*\*Name\*\*:\s*(.+)/,
    id: /\*\*ID\*\*:\s*(.+)/,
    capabilityId: /\*\*Capability ID\*\*:\s*(.+)/,
    owner: /\*\*Owner\*\*:\s*(.+)/,
    status: /\*\*Status\*\*:\s*(.+)/,
    approval: /\*\*Approval\*\*:\s*(.+)/,
    priority: /\*\*Priority\*\*:\s*(.+)/,
    analysisReview: /\*\*Analysis Review\*\*:\s*(.+)/,
    codeReview: /\*\*Code Review\*\*:\s*(.+)/
  };

  for (const [key, pattern] of Object.entries(metadataPatterns)) {
    const match = content.match(pattern);
    if (match) {
      metadata[key] = match[1].trim();
    }
  }

  // Extract purpose (from Technical Overview section)
  const purposeMatch = content.match(/###\s*Purpose\s*\n([\s\S]*?)(?=\n##|\n###|$)/);
  if (purposeMatch) {
    metadata.purpose = purposeMatch[1].trim().split('\n')[0].trim();
  }

  // Extract functional requirements (table rows)
  const frTableMatch = content.match(/## Functional Requirements[\s\S]*?\|[\s\S]*?\|([\s\S]*?)(?=\n##|$)/);
  if (frTableMatch) {
    const rows = frTableMatch[1].split('\n').filter(row => row.includes('|') && !row.includes('----'));
    metadata.functionalRequirements = rows.map(row => {
      const cols = row.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 3) {
        return { id: cols[0], name: cols[1], requirement: cols[2], status: cols[3] || '', priority: cols[4] || '' };
      }
      return null;
    }).filter(Boolean);
  }

  // Extract non-functional requirements (table rows)
  const nfrTableMatch = content.match(/## Non-Functional Requirements[\s\S]*?\|[\s\S]*?\|([\s\S]*?)(?=\n##|$)/);
  if (nfrTableMatch) {
    const rows = nfrTableMatch[1].split('\n').filter(row => row.includes('|') && !row.includes('----'));
    metadata.nonFunctionalRequirements = rows.map(row => {
      const cols = row.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 3) {
        return { id: cols[0], name: cols[1], requirement: cols[2], type: cols[3] || '', status: cols[4] || '' };
      }
      return null;
    }).filter(Boolean);
  }

  return metadata;
}

// API endpoint to delete a specification file
app.post('/api/delete-specification', async (req, res) => {
  try {
    const { fileName, workspacePath, subfolder } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    // Determine target folder - use subfolder if provided, default to 'specifications'
    const targetSubfolder = subfolder || 'specifications';

    // Determine target path
    let targetPath;
    if (workspacePath) {
      targetPath = path.join(__dirname, '..', workspacePath, targetSubfolder);
    } else {
      targetPath = path.join(__dirname, '..', 'specifications');
    }

    const filePath = path.join(targetPath, fileName);

    // Security check: ensure the file is within the target folder
    const resolvedPath = path.resolve(filePath);
    const resolvedTargetPath = path.resolve(targetPath);
    if (!resolvedPath.startsWith(resolvedTargetPath)) {
      return res.status(403).json({ error: 'Access denied: path outside target folder' });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the file
    await fs.unlink(filePath);

    res.json({
      success: true,
      message: `File ${fileName} deleted successfully`,
      deletedFile: fileName
    });
  } catch (error) {
    console.error('Error deleting specification:', error);
    res.status(500).json({
      error: 'Failed to delete specification',
      details: error.message
    });
  }
});

// =====================
// GIT VERSION CONTROL API
// =====================

// Helper function to get workspace path
function getWorkspacePath(workspace) {
  if (!workspace) {
    return path.join(__dirname, '..');
  }
  if (path.isAbsolute(workspace)) {
    return workspace;
  }
  return path.join(__dirname, '..', workspace);
}

// Helper function to execute git command in workspace
async function gitExec(workspace, command) {
  const cwd = getWorkspacePath(workspace);
  console.log(`[git] Executing in ${cwd}: git ${command}`);
  const { stdout, stderr } = await execAsync(`git ${command}`, { cwd, maxBuffer: 1024 * 1024 * 10 });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

// GET /git/status - Get current git status for workspace
app.get('/git/status', async (req, res) => {
  try {
    const { workspace } = req.query;

    // Get current branch (handle case where repo has no commits yet)
    let branch = 'main';
    try {
      const branchResult = await gitExec(workspace, 'rev-parse --abbrev-ref HEAD');
      branch = branchResult.stdout;
    } catch (branchError) {
      // Repository might have no commits yet - try symbolic ref
      try {
        const symbolicResult = await gitExec(workspace, 'symbolic-ref --short HEAD');
        branch = symbolicResult.stdout || 'main';
      } catch {
        branch = 'main'; // Ultimate fallback
      }
    }

    // Get status (porcelain for parsing)
    const statusResult = await gitExec(workspace, 'status --porcelain');
    const statusLines = statusResult.stdout.split('\n').filter(Boolean);

    const staged = [];
    const unstaged = [];
    const untracked = [];

    for (const line of statusLines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const fileName = line.substring(3);

      if (indexStatus === '?' && workTreeStatus === '?') {
        untracked.push(fileName);
      } else if (indexStatus !== ' ' && indexStatus !== '?') {
        staged.push(fileName);
      }
      if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
        unstaged.push(fileName);
      }
    }

    // Get ahead/behind counts (if remote exists)
    let ahead = 0;
    let behind = 0;
    try {
      const trackingResult = await gitExec(workspace, `rev-list --left-right --count HEAD...@{upstream}`);
      const parts = trackingResult.stdout.split('\t');
      if (parts.length === 2) {
        ahead = parseInt(parts[0], 10) || 0;
        behind = parseInt(parts[1], 10) || 0;
      }
    } catch {
      // No upstream branch configured
    }

    res.json({
      status: {
        branch,
        isClean: statusLines.length === 0,
        staged,
        unstaged,
        untracked,
        ahead,
        behind
      }
    });
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({ error: 'Failed to get git status', details: error.message });
  }
});

// GET /git/log - Get commit history
app.get('/git/log', async (req, res) => {
  try {
    const { workspace, file, limit = 50 } = req.query;

    // Custom format: hash|shortHash|message|author|date|relativeDate
    const format = '%H|%h|%s|%an|%aI|%ar';
    let command = `log -${limit} --format="${format}"`;

    // If file specified, show history for that file
    if (file) {
      command += ` -- "${file}"`;
    }

    const result = await gitExec(workspace, command);
    const lines = result.stdout.split('\n').filter(Boolean);

    const commits = lines.map(line => {
      const [hash, shortHash, message, author, date, relativeDate] = line.split('|');
      return { hash, shortHash, message, author, date, relativeDate };
    });

    res.json({ commits });
  } catch (error) {
    console.error('Error getting git log:', error);
    res.status(500).json({ error: 'Failed to get git log', details: error.message });
  }
});

// POST /git/commit - Create a new commit (checkpoint)
app.post('/git/commit', async (req, res) => {
  try {
    const { workspace, message, files } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Commit message is required' });
    }

    const cwd = getWorkspacePath(workspace);

    // Stage files - always use 'git add -A' for reliability
    // The client-provided files list may be stale or from a different workspace
    // Using 'git add -A' stages all changes in the current workspace
    if (files && files.length > 0) {
      // Try to add specific files, but skip ones that don't exist
      let addedAny = false;
      for (const file of files) {
        try {
          // Check if file exists in the workspace before adding
          const filePath = path.join(cwd, file);
          await fs.access(filePath);
          await gitExec(workspace, `add "${file}"`);
          addedAny = true;
        } catch (fileError) {
          // File doesn't exist in this workspace, skip it
          console.log(`[git] Skipping file not in workspace: ${file}`);
        }
      }

      // If no specific files were added, fall back to adding all changes
      if (!addedAny) {
        console.log('[git] No specific files added, falling back to git add -A');
        await gitExec(workspace, 'add -A');
      }
    } else {
      // Stage all changes
      await gitExec(workspace, 'add -A');
    }

    // Create commit
    const escapedMessage = message.replace(/"/g, '\\"');
    const result = await gitExec(workspace, `commit -m "${escapedMessage}"`);

    // Get the new commit hash
    const hashResult = await gitExec(workspace, 'rev-parse HEAD');

    res.json({
      success: true,
      hash: hashResult.stdout,
      message: result.stdout
    });
  } catch (error) {
    console.error('Error creating commit:', error);
    if (error.message.includes('nothing to commit')) {
      return res.status(400).json({ error: 'Nothing to commit', details: 'No changes staged' });
    }
    res.status(500).json({ error: 'Failed to create commit', details: error.message });
  }
});

// GET /git/show - Show details of a specific commit
app.get('/git/show', async (req, res) => {
  try {
    const { workspace, hash } = req.query;

    if (!hash) {
      return res.status(400).json({ error: 'Commit hash is required' });
    }

    // Get commit details
    const format = '%H|%h|%s|%an|%aI|%ar|%b';
    const result = await gitExec(workspace, `show -s --format="${format}" ${hash}`);
    const [commitHash, shortHash, subject, author, date, relativeDate, body] = result.stdout.split('|');

    // Get files changed
    const filesResult = await gitExec(workspace, `show --name-status --format="" ${hash}`);
    const changedFiles = filesResult.stdout.split('\n').filter(Boolean).map(line => {
      const [status, ...fileParts] = line.split('\t');
      return { status, file: fileParts.join('\t') };
    });

    res.json({
      commit: {
        hash: commitHash,
        shortHash,
        message: subject,
        body: body || '',
        author,
        date,
        relativeDate,
        changedFiles
      }
    });
  } catch (error) {
    console.error('Error showing commit:', error);
    res.status(500).json({ error: 'Failed to show commit', details: error.message });
  }
});

// POST /git/revert - Revert workspace to a specific commit
app.post('/git/revert', async (req, res) => {
  try {
    const { workspace, hash } = req.body;

    if (!hash) {
      return res.status(400).json({ error: 'Commit hash is required' });
    }

    // Check for uncommitted changes first
    const statusResult = await gitExec(workspace, 'status --porcelain');
    if (statusResult.stdout.trim()) {
      return res.status(400).json({
        error: 'Uncommitted changes exist',
        details: 'Please commit or stash your changes before reverting'
      });
    }

    // Reset to the specified commit
    await gitExec(workspace, `checkout ${hash} -- .`);

    res.json({
      success: true,
      message: `Workspace reverted to commit ${hash}`
    });
  } catch (error) {
    console.error('Error reverting:', error);
    res.status(500).json({ error: 'Failed to revert', details: error.message });
  }
});

// POST /git/branch - Create a new branch
app.post('/git/branch', async (req, res) => {
  try {
    const { workspace, name, checkout = true } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    // Sanitize branch name
    const safeName = name.replace(/[^a-zA-Z0-9-_\/]/g, '-');

    if (checkout) {
      await gitExec(workspace, `checkout -b ${safeName}`);
    } else {
      await gitExec(workspace, `branch ${safeName}`);
    }

    res.json({
      success: true,
      branch: safeName,
      message: `Branch '${safeName}' created${checkout ? ' and checked out' : ''}`
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    if (error.message.includes('already exists')) {
      return res.status(400).json({ error: 'Branch already exists', details: error.message });
    }
    res.status(500).json({ error: 'Failed to create branch', details: error.message });
  }
});

// POST /git/checkout - Switch to a different branch
app.post('/git/checkout', async (req, res) => {
  try {
    const { workspace, branch } = req.body;

    if (!branch) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    // Check for uncommitted changes
    const statusResult = await gitExec(workspace, 'status --porcelain');
    if (statusResult.stdout.trim()) {
      return res.status(400).json({
        error: 'Uncommitted changes exist',
        details: 'Please commit or stash your changes before switching branches'
      });
    }

    await gitExec(workspace, `checkout ${branch}`);

    res.json({
      success: true,
      branch,
      message: `Switched to branch '${branch}'`
    });
  } catch (error) {
    console.error('Error switching branch:', error);
    res.status(500).json({ error: 'Failed to switch branch', details: error.message });
  }
});

// GET /git/branches - List all branches
app.get('/git/branches', async (req, res) => {
  try {
    const { workspace } = req.query;

    // Get all local branches
    const result = await gitExec(workspace, 'branch -a --format="%(refname:short)|%(objectname:short)|%(committerdate:relative)"');
    const lines = result.stdout.split('\n').filter(Boolean);

    const branches = lines.map(line => {
      const [name, hash, lastCommit] = line.split('|');
      return {
        name,
        hash,
        lastCommit,
        isRemote: name.startsWith('origin/')
      };
    });

    // Get current branch
    const currentResult = await gitExec(workspace, 'rev-parse --abbrev-ref HEAD');

    res.json({
      branches,
      current: currentResult.stdout
    });
  } catch (error) {
    console.error('Error listing branches:', error);
    res.status(500).json({ error: 'Failed to list branches', details: error.message });
  }
});

// POST /git/pull - Pull changes from remote
app.post('/git/pull', async (req, res) => {
  try {
    const { workspace } = req.body;

    const result = await gitExec(workspace, 'pull');

    res.json({
      success: true,
      message: result.stdout || 'Already up to date'
    });
  } catch (error) {
    console.error('Error pulling:', error);
    if (error.message.includes('conflict')) {
      return res.status(409).json({ error: 'Merge conflict', details: error.message });
    }
    res.status(500).json({ error: 'Failed to pull', details: error.message });
  }
});

// POST /git/push - Push changes to remote
app.post('/git/push', async (req, res) => {
  try {
    const { workspace, setUpstream = false, token } = req.body;
    const cwd = getWorkspacePath(workspace);

    // Get current branch
    const branchResult = await gitExec(workspace, 'rev-parse --abbrev-ref HEAD');
    const currentBranch = branchResult.stdout;

    // If token provided, configure git to use it for this push
    if (token) {
      // Get the current remote URL
      let remoteUrl = '';
      try {
        const remoteResult = await gitExec(workspace, 'remote get-url origin');
        remoteUrl = remoteResult.stdout;
      } catch {
        return res.status(400).json({ error: 'No remote configured', details: 'Please add a remote repository first' });
      }

      // Construct authenticated URL
      // Convert https://github.com/user/repo.git to https://token@github.com/user/repo.git
      let authUrl = remoteUrl;
      if (remoteUrl.startsWith('https://')) {
        // Remove any existing credentials from URL
        authUrl = remoteUrl.replace(/https:\/\/[^@]*@/, 'https://');
        // Add token
        authUrl = authUrl.replace('https://', `https://${token}@`);
      }

      // Push using the authenticated URL directly (without modifying stored remote)
      let command = `push ${authUrl} ${currentBranch}`;
      if (setUpstream) {
        command = `push -u ${authUrl} ${currentBranch}`;
      }

      try {
        const { stdout, stderr } = await execAsync(`git ${command}`, { cwd, maxBuffer: 1024 * 1024 * 10 });
        res.json({
          success: true,
          message: stdout || stderr || 'Changes pushed successfully'
        });
      } catch (pushError) {
        // Clean up error message to not expose token
        const cleanError = pushError.message.replace(token, '***TOKEN***');
        throw new Error(cleanError);
      }
    } else {
      // No token - use default git push (relies on system credentials)
      let command = 'push';
      if (setUpstream) {
        command = `push -u origin ${currentBranch}`;
      }

      const result = await gitExec(workspace, command);

      res.json({
        success: true,
        message: result.stdout || result.stderr || 'Changes pushed successfully'
      });
    }
  } catch (error) {
    console.error('Error pushing:', error);
    res.status(500).json({ error: 'Failed to push', details: error.message });
  }
});

// POST /git/pr - Create a pull request (using gh CLI)
app.post('/git/pr', async (req, res) => {
  try {
    const { workspace, title, description, base = 'main', head } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'PR title is required' });
    }

    const cwd = getWorkspacePath(workspace);

    // Check if gh CLI is available
    try {
      await execAsync('gh --version');
    } catch {
      return res.status(503).json({
        error: 'GitHub CLI not available',
        details: 'Please install GitHub CLI (gh) to create pull requests'
      });
    }

    // Push current branch first (with upstream)
    const branchResult = await gitExec(workspace, 'rev-parse --abbrev-ref HEAD');
    const currentBranch = branchResult.stdout;

    try {
      await gitExec(workspace, `push -u origin ${currentBranch}`);
    } catch {
      // Branch might already be pushed
    }

    // Create PR using gh CLI
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedBody = (description || '').replace(/"/g, '\\"');

    const { stdout } = await execAsync(
      `gh pr create --title "${escapedTitle}" --body "${escapedBody}" --base ${base} --head ${head || currentBranch}`,
      { cwd }
    );

    // Extract PR URL from output
    const urlMatch = stdout.match(/https:\/\/github\.com\/[^\s]+/);

    res.json({
      success: true,
      url: urlMatch ? urlMatch[0] : null,
      message: stdout
    });
  } catch (error) {
    console.error('Error creating PR:', error);
    res.status(500).json({ error: 'Failed to create pull request', details: error.message });
  }
});

// GET /git/diff - Get diff of pending changes
app.get('/git/diff', async (req, res) => {
  try {
    const { workspace, file } = req.query;

    let command = 'diff';
    if (file) {
      command += ` -- "${file}"`;
    }

    const result = await gitExec(workspace, command);

    res.json({
      diff: result.stdout,
      hasDiff: result.stdout.length > 0
    });
  } catch (error) {
    console.error('Error getting diff:', error);
    res.status(500).json({ error: 'Failed to get diff', details: error.message });
  }
});

// GET /git/config - Get git configuration for workspace
app.get('/git/config', async (req, res) => {
  try {
    const { workspace } = req.query;
    const cwd = getWorkspacePath(workspace);

    // Check if .git directory exists
    try {
      await fs.access(path.join(cwd, '.git'));
    } catch {
      return res.json({ initialized: false });
    }

    // Get user config
    let userName = '';
    let userEmail = '';
    try {
      const nameResult = await gitExec(workspace, 'config user.name');
      userName = nameResult.stdout;
    } catch { /* not configured */ }

    try {
      const emailResult = await gitExec(workspace, 'config user.email');
      userEmail = emailResult.stdout;
    } catch { /* not configured */ }

    // Get remote URL
    let remoteUrl = '';
    let remoteName = '';
    try {
      const remoteResult = await gitExec(workspace, 'remote -v');
      const lines = remoteResult.stdout.split('\n');
      if (lines.length > 0 && lines[0]) {
        const parts = lines[0].split(/\s+/);
        remoteName = parts[0] || '';
        remoteUrl = parts[1] || '';
      }
    } catch { /* no remote */ }

    // Get current branch
    let currentBranch = '';
    try {
      const branchResult = await gitExec(workspace, 'rev-parse --abbrev-ref HEAD');
      currentBranch = branchResult.stdout;
    } catch { /* no commits yet */ }

    res.json({
      initialized: true,
      userName,
      userEmail,
      remoteUrl,
      remoteName,
      currentBranch
    });
  } catch (error) {
    console.error('Error getting git config:', error);
    res.status(500).json({ error: 'Failed to get git config', details: error.message });
  }
});

// POST /git/config - Set git configuration for workspace
app.post('/git/config', async (req, res) => {
  try {
    const { workspace, userName, userEmail } = req.body;

    if (userName) {
      await gitExec(workspace, `config user.name "${userName}"`);
    }

    if (userEmail) {
      await gitExec(workspace, `config user.email "${userEmail}"`);
    }

    res.json({ success: true, message: 'Git configuration updated' });
  } catch (error) {
    console.error('Error setting git config:', error);
    res.status(500).json({ error: 'Failed to set git config', details: error.message });
  }
});

// POST /git/init - Initialize a new git repository
app.post('/git/init', async (req, res) => {
  try {
    const { workspace, userName, userEmail } = req.body;
    const cwd = getWorkspacePath(workspace);

    // Check if already initialized
    try {
      await fs.access(path.join(cwd, '.git'));
      return res.status(400).json({ error: 'Repository already initialized' });
    } catch {
      // Good, not initialized yet
    }

    // Initialize repository
    await gitExec(workspace, 'init');

    // Set user config if provided
    if (userName) {
      await gitExec(workspace, `config user.name "${userName}"`);
    }

    if (userEmail) {
      await gitExec(workspace, `config user.email "${userEmail}"`);
    }

    // Create initial .gitignore
    const gitignorePath = path.join(cwd, '.gitignore');
    const gitignoreContent = `# Dependencies
node_modules/

# Build outputs
dist/
build/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
`;

    try {
      await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');
    } catch {
      // Ignore if can't create .gitignore
    }

    res.json({ success: true, message: 'Repository initialized successfully' });
  } catch (error) {
    console.error('Error initializing git:', error);
    res.status(500).json({ error: 'Failed to initialize repository', details: error.message });
  }
});

// POST /git/remote - Add or update remote
app.post('/git/remote', async (req, res) => {
  try {
    const { workspace, url, name = 'origin' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Remote URL is required' });
    }

    // Check if remote exists
    try {
      await gitExec(workspace, `remote get-url ${name}`);
      // Remote exists, update it
      await gitExec(workspace, `remote set-url ${name} "${url}"`);
    } catch {
      // Remote doesn't exist, add it
      await gitExec(workspace, `remote add ${name} "${url}"`);
    }

    res.json({ success: true, message: `Remote '${name}' set to ${url}` });
  } catch (error) {
    console.error('Error setting remote:', error);
    res.status(500).json({ error: 'Failed to set remote', details: error.message });
  }
});

// POST /git/create-repo - Create a new GitHub repository
app.post('/git/create-repo', async (req, res) => {
  try {
    const { workspace, name, private: isPrivate = true, token } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    if (!token) {
      return res.status(400).json({ error: 'GitHub token is required' });
    }

    // Create repo using GitHub API
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        private: isPrivate,
        auto_init: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create GitHub repository');
    }

    const repoData = await response.json();
    const repoUrl = repoData.clone_url;

    // Add remote to local repo
    try {
      await gitExec(workspace, `remote get-url origin`);
      await gitExec(workspace, `remote set-url origin "${repoUrl}"`);
    } catch {
      await gitExec(workspace, `remote add origin "${repoUrl}"`);
    }

    res.json({
      success: true,
      url: repoUrl,
      htmlUrl: repoData.html_url,
      message: `Repository created: ${repoData.full_name}`
    });
  } catch (error) {
    console.error('Error creating repo:', error);
    res.status(500).json({ error: 'Failed to create repository', details: error.message });
  }
});

// POST /generate-readme - Generate README.md from conception folder using AI
app.post('/generate-readme', async (req, res) => {
  try {
    const { workspace, apiKey } = req.body;

    if (!workspace) {
      return res.status(400).json({ error: 'Workspace path is required' });
    }

    const cwd = getWorkspacePath(workspace);
    const conceptionPath = path.join(cwd, 'conception');

    // Check if conception folder exists
    try {
      await fs.access(conceptionPath);
    } catch {
      return res.status(400).json({
        error: 'Conception folder not found',
        details: `No conception folder found at ${conceptionPath}. README generation requires conception documents.`
      });
    }

    // Read all markdown files from conception folder
    const files = await fs.readdir(conceptionPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      return res.status(400).json({
        error: 'No markdown files in conception folder',
        details: 'README generation requires at least one .md file in the conception folder.'
      });
    }

    // Read content of all markdown files
    const conceptionContent = [];
    for (const file of mdFiles) {
      const filePath = path.join(conceptionPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      conceptionContent.push(`## ${file}\n\n${content}`);
    }

    const combinedContent = conceptionContent.join('\n\n---\n\n');

    // Get API key from request or environment
    const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return res.status(400).json({
        error: 'Anthropic API key required',
        details: 'Please configure your Anthropic API key in Settings or set ANTHROPIC_API_KEY environment variable.'
      });
    }

    // Build the prompt for README generation
    const prompt = `You are a technical writer creating a professional GitHub README.md file.

Based on the following conception documents for a software project, create a comprehensive README.md that follows GitHub best practices.

## CONCEPTION DOCUMENTS:

${combinedContent}

## INSTRUCTIONS:

Generate a professional README.md that includes:

1. **Project Title and Description** - Clear, concise explanation of what the project does
2. **Features** - Key features and capabilities (bullet points)
3. **Getting Started** - Prerequisites, installation, and setup instructions
4. **Usage** - Basic usage examples and how to run the application
5. **Configuration** - Environment variables and configuration options (if mentioned)
6. **Project Structure** - Brief overview of the codebase organization (if applicable)
7. **Contributing** - Brief contribution guidelines
8. **License** - Placeholder for license information

IMPORTANT:
- Use proper Markdown formatting with headers, code blocks, and bullet points
- Keep it concise but informative
- If start/stop scripts are mentioned, document them
- Include any environment variables or configuration mentioned in the conception docs
- Make assumptions about standard practices if information is missing
- Output ONLY the README.md content, no explanations or preamble

Generate the README.md now:`;

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.content || result.content.length === 0) {
      throw new Error('Empty response from Anthropic API');
    }

    const readmeContent = result.content[0].text;

    // Write README.md to workspace root
    const readmePath = path.join(cwd, 'README.md');
    await fs.writeFile(readmePath, readmeContent, 'utf-8');

    console.log(`Generated README.md at ${readmePath}`);

    res.json({
      success: true,
      message: 'README.md generated successfully',
      path: 'README.md',
      content: readmeContent
    });

  } catch (error) {
    console.error('Error generating README:', error);
    res.status(500).json({
      error: 'Failed to generate README',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'specification-api' });
});

app.listen(PORT, () => {
  console.log(`Specification API server running on http://localhost:${PORT}`);
});
