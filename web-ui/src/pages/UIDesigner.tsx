import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageLayout } from '../components/PageLayout';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

type ComponentType = 'button' | 'card' | 'input' | 'alert' | 'navbar' | 'avatar' | 'progress' | 'toggle';
type ImageFormat = 'png' | 'jpeg' | 'svg';
type GenerationMode = 'mockup' | 'code-to-image' | 'icon' | 'symbol' | 'ai-image' | 'logo' | 'illustration';
type LogoStyle = 'minimal' | 'modern' | 'vintage' | 'playful' | 'corporate';
type IllustrationStyle = 'flat' | 'isometric' | 'hand-drawn' | 'geometric' | '3d';
type SymbolType = 'arrow' | 'divider' | 'pattern' | 'shape' | 'decoration';

interface GenerationResult {
  output: string;
  patterns_used: number;
  pattern_ids: string[];
  generation_time?: number;
}

interface MockupResult {
  image: string;
  data_url: string;
  width: number;
  height: number;
  component_type: string;
}

export const UIDesigner: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [prompt, setPrompt] = useState('');
  const [componentType, setComponentType] = useState<ComponentType>('button');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('mockup');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [mockupResult, setMockupResult] = useState<MockupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [imageFormat, setImageFormat] = useState<ImageFormat>('png');
  const [imageWidth, setImageWidth] = useState(400);
  const [imageHeight, setImageHeight] = useState(300);
  const [logoStyle, setLogoStyle] = useState<LogoStyle>('modern');
  const [illustrationStyle, setIllustrationStyle] = useState<IllustrationStyle>('flat');
  const [symbolType, setSymbolType] = useState<SymbolType>('shape');
  const [iconName, setIconName] = useState('');
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [showIconList, setShowIconList] = useState(false);
  const [iconValidationError, setIconValidationError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Fetch available icons when component mounts or icon mode selected
  const fetchAvailableIcons = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:3005/icons');
      if (response.ok) {
        const data = await response.json();
        setAvailableIcons(Array.isArray(data) ? data : data.icons || []);
      }
    } catch (err) {
      console.error('Failed to fetch icons:', err);
    }
  }, []);

  useEffect(() => {
    if (generationMode === 'icon' && availableIcons.length === 0) {
      fetchAvailableIcons();
    }
  }, [generationMode, availableIcons.length, fetchAvailableIcons]);

  // Validate icon name
  useEffect(() => {
    if (generationMode === 'icon' && prompt && availableIcons.length > 0) {
      const isValid = availableIcons.some(icon =>
        icon.toLowerCase() === prompt.toLowerCase()
      );
      setIconValidationError(isValid ? null : `"${prompt}" is not a valid icon name`);
    } else {
      setIconValidationError(null);
    }
  }, [prompt, generationMode, availableIcons]);

  // Generate preview HTML inline
  const getPreviewHtml = () => {
    if (!result?.output) return '';

    const escaped = result.output
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    pre {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
    }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
</body>
</html>`;
  };

  // Check DELM API status
  const checkApiStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3005/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        setApiStatus('online');
        return true;
      }
      setApiStatus('offline');
      return false;
    } catch {
      setApiStatus('offline');
      return false;
    }
  };

  // Generate design using DELM API
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description of what you want to design.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setMockupResult(null);

    // Check if API is available
    const isOnline = await checkApiStatus();
    if (!isOnline) {
      setError('DELM API is not available. Please ensure the DELM server is running on port 3005.\n\nRun: ./start.sh in the DELM directory');
      setIsGenerating(false);
      return;
    }

    const startTime = Date.now();

    try {
      let endpoint = '';
      let body: Record<string, any> = {};

      switch (generationMode) {
        case 'mockup': {
          // Build props based on component type
          let props: Record<string, any> = {};
          switch (componentType) {
            case 'button':
              props = { text: prompt || 'Button', variant: 'primary' };
              break;
            case 'card':
              props = { title: prompt.split('.')[0] || 'Card Title', content: prompt || 'Card content' };
              break;
            case 'input':
              props = { label: prompt || 'Input Label', placeholder: 'Enter value...', type: 'text' };
              break;
            case 'alert':
              props = { message: prompt || 'Alert message', type: 'info' };
              break;
            case 'navbar':
              props = { logo: 'App', items: ['Home', 'About', 'Contact'] };
              break;
            case 'avatar':
              props = { name: prompt || 'User Name', size: 'lg' };
              break;
            case 'progress':
              props = { value: 67, label: prompt || 'Progress' };
              break;
            case 'toggle':
              props = { label: prompt || 'Toggle', checked: true };
              break;
          }
          endpoint = '/generate/mockup';
          body = { component_type: componentType, props, width: imageWidth, height: imageHeight, format: 'base64' };
          break;
        }

        case 'code-to-image':
          endpoint = '/generate/code-to-image';
          body = { code: prompt, width: imageWidth, height: imageHeight, format: 'base64' };
          break;

        case 'icon':
          endpoint = '/generate/icon';
          body = { name: iconName || prompt, size: imageWidth, color: '#000000', format: 'svg' };
          break;

        case 'symbol':
          endpoint = '/generate/symbol';
          body = { symbol_type: symbolType, prompt: prompt, width: imageWidth, height: imageHeight, format: 'base64' };
          break;

        case 'ai-image':
          endpoint = '/generate/ai-image';
          body = { prompt: prompt, width: imageWidth, height: imageHeight, format: 'base64' };
          break;

        case 'logo':
          endpoint = '/generate/logo';
          body = { description: prompt, style: logoStyle, width: imageWidth, height: imageHeight, format: 'base64' };
          break;

        case 'illustration':
          endpoint = '/generate/illustration';
          body = { description: prompt, style: illustrationStyle, width: imageWidth, height: imageHeight, format: 'base64' };
          break;
      }

      // Create AbortController with extended timeout for AI generation (10 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout

      const response = await fetch(`http://127.0.0.1:3005${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `API error: ${response.status}`);
      }

      // Handle response based on content type
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('image/svg') || generationMode === 'icon') {
        // Raw SVG response
        const svgText = await response.text();
        console.log('SVG Response:', svgText.substring(0, 200));

        if (svgText.startsWith('<svg') || svgText.startsWith('<?xml')) {
          // Encode UTF-8 SVG to base64 (handles Unicode properly)
          const base64 = btoa(unescape(encodeURIComponent(svgText)));
          setMockupResult({
            image: svgText,
            data_url: `data:image/svg+xml;base64,${base64}`,
            width: imageWidth,
            height: imageWidth,
            component_type: 'icon',
          });
        } else {
          // Try parsing as JSON
          try {
            const data = JSON.parse(svgText);
            if (data.svg) {
              const encodedSvg = encodeURIComponent(data.svg);
              setMockupResult({
                image: data.svg,
                data_url: `data:image/svg+xml,${encodedSvg}`,
                width: data.width || imageWidth,
                height: data.height || imageWidth,
                component_type: 'icon',
              });
            } else if (data.image) {
              if (!data.data_url) {
                data.data_url = `data:image/png;base64,${data.image}`;
              }
              setMockupResult(data);
            }
          } catch {
            throw new Error('Invalid response format from icon endpoint');
          }
        }
      } else {
        const data = await response.json();
        // Ensure data_url exists - construct from image if missing
        if (!data.data_url && data.image) {
          data.data_url = `data:image/png;base64,${data.image}`;
        }
        setMockupResult(data);
      }
    } catch (err) {
      console.error('Generation failed:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. AI image generation can take 5-10 minutes. Please try again with a smaller image size or simpler prompt.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate design');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy output to clipboard
  const handleCopy = () => {
    if (result?.output) {
      navigator.clipboard.writeText(result.output);
      alert('Copied to clipboard!');
    }
  };

  // Save output to specifications folder
  const handleSave = async () => {
    if (!result?.output || !currentWorkspace?.projectFolder) {
      alert('No output to save or workspace not configured.');
      return;
    }

    // Generate filename
    const safeName = prompt
      .substring(0, 50)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const typePrefix = designType === 'component' ? 'COMP' : designType === 'styles' ? 'STYLE' : 'LAYOUT';
    const fileName = `${typePrefix}-${safeName}-1.md`;

    // Generate markdown content
    let markdown = `# ${designType.charAt(0).toUpperCase() + designType.slice(1)}: ${prompt.substring(0, 100)}\n\n`;
    markdown += `## Metadata\n`;
    markdown += `- **Type**: UI ${designType.charAt(0).toUpperCase() + designType.slice(1)}\n`;
    markdown += `- **Patterns Used**: ${result.patterns_used}\n`;
    markdown += `- **Generation Time**: ${result.generation_time?.toFixed(2)}s\n`;
    markdown += `- **Generated**: ${new Date().toLocaleString()}\n\n`;
    markdown += `## Prompt\n`;
    markdown += `${prompt}\n\n`;
    markdown += `## Generated Code\n\n`;
    markdown += '```tsx\n';
    markdown += result.output;
    markdown += '\n```\n';

    try {
      const response = await fetch(`${INTEGRATION_URL}/save-specifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          files: [{ fileName, content: markdown }],
          subfolder: 'design'
        }),
      });

      if (response.ok) {
        alert(`Saved to design/${fileName}`);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      alert('Failed to save to specifications folder.');
    }
  };

  // Capture preview as image and save
  const handleSaveAsImage = async () => {
    if (!result?.output || !currentWorkspace?.projectFolder) {
      alert('No output to save or workspace not configured.');
      return;
    }

    try {
      // Extract just the content part (without full HTML document wrapper)
      let htmlContent = result.output;

      // Remove imports and type definitions
      htmlContent = htmlContent.replace(/^import\s+.*?;?\s*$/gm, '');
      htmlContent = htmlContent.replace(/^(interface|type)\s+\w+[\s\S]*?;\s*$/gm, '');
      htmlContent = htmlContent.replace(/^export\s+(default\s+)?/gm, '');

      // Extract JSX from return
      const returnMatch = htmlContent.match(/return\s*\(\s*([\s\S]*)\s*\)\s*;?\s*\}?\s*$/);
      if (returnMatch) {
        htmlContent = returnMatch[1].trim().replace(/\}\s*$/, '');
      }

      // Convert JSX to HTML
      htmlContent = htmlContent.replace(/className=/g, 'class=');
      htmlContent = htmlContent.replace(/\{children\}/g, 'Content');
      htmlContent = htmlContent.replace(/\{['"`]([^'"`}]+)['"`]\}/g, '$1');
      htmlContent = htmlContent.replace(/\{[^}]+\}/g, '...');
      htmlContent = htmlContent.replace(/<(\w+)([^>]*?)\s*\/>/g, '<$1$2></$1>');
      htmlContent = htmlContent.replace(/\s+on[A-Z][a-zA-Z]*=\{[^}]*\}/g, '');
      htmlContent = htmlContent.replace(/=\{([^}]+)\}/g, '="$1"');

      // Create hidden container for rendering
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.padding = '20px';
      container.style.background = 'white';
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Clean up container
      document.body.removeChild(container);

      let blob: Blob;
      let extension: string;
      let mimeType: string;

      if (imageFormat === 'svg') {
        // Escape for XML
        const xmlEscaped = result.output
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

        // Create SVG with text content
        const svgData = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
  <rect width="100%" height="100%" fill="white"/>
  <text x="20" y="30" font-family="monospace" font-size="10" fill="#333">
    <tspan x="20" dy="0">Generated Code:</tspan>
  </text>
  <foreignObject x="20" y="50" width="760" height="540">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: monospace; font-size: 10px; white-space: pre-wrap; word-break: break-word;">
${xmlEscaped}
    </div>
  </foreignObject>
</svg>`;
        blob = new Blob([svgData], { type: 'image/svg+xml' });
        extension = 'svg';
        mimeType = 'image/svg+xml';
      } else {
        // For PNG/JPEG, create a simple canvas with the code as text
        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = 800 * scale;
        canvas.height = 600 * scale;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);

        // Draw title
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`UI ${designType.charAt(0).toUpperCase() + designType.slice(1)}: ${prompt.substring(0, 60)}...`, 20, 30);

        // Draw code preview
        ctx.font = '12px Monaco, Consolas, monospace';
        ctx.fillStyle = '#666666';
        const lines = result.output.split('\n').slice(0, 40);
        lines.forEach((line, i) => {
          ctx.fillText(line.substring(0, 90), 20, 60 + i * 14);
        });

        // Convert to blob
        const dataUrl = imageFormat === 'jpeg'
          ? canvas.toDataURL('image/jpeg', 0.95)
          : canvas.toDataURL('image/png');

        const base64Data = dataUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        if (imageFormat === 'jpeg') {
          blob = new Blob([byteArray], { type: 'image/jpeg' });
          extension = 'jpg';
          mimeType = 'image/jpeg';
        } else {
          blob = new Blob([byteArray], { type: 'image/png' });
          extension = 'png';
          mimeType = 'image/png';
        }
      }

      // Generate filename
      const safeName = prompt
        .substring(0, 50)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const typePrefix = designType === 'component' ? 'COMP' : designType === 'styles' ? 'STYLE' : 'LAYOUT';
      const fileName = `${typePrefix}-${safeName}-1.${extension}`;

      // Convert blob to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data URL prefix
        };
        reader.readAsDataURL(blob);
      });

      // Save via backend
      const response = await fetch(`${INTEGRATION_URL}/save-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          fileName,
          imageData: base64,
          mimeType,
        }),
      });

      if (response.ok) {
        alert(`Image saved to specifications/${fileName}`);
      } else {
        // Fallback: download directly
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        alert(`Downloaded ${fileName} (backend save not available)`);
      }
    } catch (err) {
      console.error('Failed to save image:', err);
      alert(`Failed to save image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <PageLayout
      title="UI Designer"
      quickDescription="Generate UI components, styles, and layouts using the DELM API"
      detailedDescription="The UI Designer allows you to generate UI components, mockups, icons, logos, and illustrations using AI. Select a generation mode, configure your options, and generate visual assets that can be used in your application design."
      actions={
        <span className={`api-status ${apiStatus}`}>
          DELM: {apiStatus === 'online' ? '● Online' : apiStatus === 'offline' ? '○ Offline' : '○ Unknown'}
        </span>
      }
    >

      <div className="designer-content">
        {/* Input Section */}
        <Card className="input-section">
          <h2 className="text-title2">Design Request</h2>

          <div className="form-group">
            <label className="text-headline">Generation Type</label>
            <div className="type-selector" style={{ flexWrap: 'wrap' }}>
              <button
                className={`type-btn ${generationMode === 'mockup' ? 'active' : ''}`}
                onClick={() => setGenerationMode('mockup')}
              >
                UI Component
              </button>
              <button
                className={`type-btn ${generationMode === 'icon' ? 'active' : ''}`}
                onClick={() => setGenerationMode('icon')}
              >
                Icon
              </button>
              <button
                className={`type-btn ${generationMode === 'symbol' ? 'active' : ''}`}
                onClick={() => setGenerationMode('symbol')}
              >
                Symbol
              </button>
              <button
                className={`type-btn ${generationMode === 'logo' ? 'active' : ''}`}
                onClick={() => setGenerationMode('logo')}
              >
                Logo
              </button>
              <button
                className={`type-btn ${generationMode === 'illustration' ? 'active' : ''}`}
                onClick={() => setGenerationMode('illustration')}
              >
                Illustration
              </button>
              <button
                className={`type-btn ${generationMode === 'ai-image' ? 'active' : ''}`}
                onClick={() => setGenerationMode('ai-image')}
              >
                AI Image
              </button>
              <button
                className={`type-btn ${generationMode === 'code-to-image' ? 'active' : ''}`}
                onClick={() => setGenerationMode('code-to-image')}
              >
                HTML to Image
              </button>
            </div>
          </div>

          {generationMode === 'mockup' && (
            <div className="form-group">
              <label className="text-headline">Component Type</label>
              <div className="type-selector" style={{ flexWrap: 'wrap' }}>
                {(['button', 'card', 'input', 'alert', 'navbar', 'avatar', 'progress', 'toggle'] as ComponentType[]).map((type) => (
                  <button
                    key={type}
                    className={`type-btn ${componentType === type ? 'active' : ''}`}
                    onClick={() => setComponentType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {generationMode === 'symbol' && (
            <div className="form-group">
              <label className="text-headline">Symbol Type</label>
              <div className="type-selector" style={{ flexWrap: 'wrap' }}>
                {(['arrow', 'divider', 'pattern', 'shape', 'decoration'] as SymbolType[]).map((type) => (
                  <button
                    key={type}
                    className={`type-btn ${symbolType === type ? 'active' : ''}`}
                    onClick={() => setSymbolType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {generationMode === 'logo' && (
            <div className="form-group">
              <label className="text-headline">Logo Style</label>
              <div className="type-selector" style={{ flexWrap: 'wrap' }}>
                {(['minimal', 'modern', 'vintage', 'playful', 'corporate'] as LogoStyle[]).map((style) => (
                  <button
                    key={style}
                    className={`type-btn ${logoStyle === style ? 'active' : ''}`}
                    onClick={() => setLogoStyle(style)}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {generationMode === 'illustration' && (
            <div className="form-group">
              <label className="text-headline">Illustration Style</label>
              <div className="type-selector" style={{ flexWrap: 'wrap' }}>
                {(['flat', 'isometric', 'hand-drawn', 'geometric', '3d'] as IllustrationStyle[]).map((style) => (
                  <button
                    key={style}
                    className={`type-btn ${illustrationStyle === style ? 'active' : ''}`}
                    onClick={() => setIllustrationStyle(style)}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="text-headline">Image Size</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="number"
                value={imageWidth}
                onChange={(e) => setImageWidth(Number(e.target.value))}
                style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-separator)' }}
              />
              <span>×</span>
              <input
                type="number"
                value={imageHeight}
                onChange={(e) => setImageHeight(Number(e.target.value))}
                style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-separator)' }}
              />
              <span className="text-secondary">px</span>
            </div>
          </div>

          {/* Warning for AI-powered generation modes */}
          {(generationMode === 'ai-image' || generationMode === 'logo' || generationMode === 'illustration') && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(255, 165, 0, 0.1)',
              border: '1px solid rgba(255, 165, 0, 0.3)',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>⏱️</span>
                <div style={{ fontSize: '13px', color: 'var(--color-label)' }}>
                  <strong>Note:</strong> AI image generation can take 4-6 minutes to complete. Please be patient while the model processes your request. Smaller image sizes (256x256 or 512x512) will generate faster.
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="text-headline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {generationMode === 'mockup' ? 'Component Text/Label'
                : generationMode === 'icon' ? 'Icon Name'
                : generationMode === 'code-to-image' ? 'HTML/Tailwind Code'
                : 'Description/Prompt'}
              {generationMode === 'icon' && (
                <button
                  type="button"
                  onClick={() => setShowIconList(!showIconList)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '1px solid var(--color-separator)',
                    background: 'var(--color-tertiarySystemBackground)',
                    color: 'var(--color-systemBlue)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Show available icons"
                >
                  ?
                </button>
              )}
            </label>
            <textarea
              className={`design-input ${iconValidationError ? 'input-error' : ''}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                generationMode === 'mockup'
                  ? componentType === 'button' ? 'e.g., Submit Form'
                  : componentType === 'card' ? 'e.g., Product Feature. Description of the feature.'
                  : componentType === 'input' ? 'e.g., Email Address'
                  : componentType === 'alert' ? 'e.g., Your changes have been saved!'
                  : componentType === 'avatar' ? 'e.g., John Doe'
                  : componentType === 'progress' ? 'e.g., Upload Progress'
                  : componentType === 'toggle' ? 'e.g., Dark Mode'
                  : 'e.g., Component label or text'
                : generationMode === 'icon' ? 'e.g., home, settings, user, search, menu'
                : generationMode === 'symbol' ? 'e.g., Decorative arrow, geometric pattern, divider'
                : generationMode === 'logo' ? 'e.g., Tech startup logo with abstract shapes'
                : generationMode === 'illustration' ? 'e.g., Person working at computer desk'
                : generationMode === 'ai-image' ? 'e.g., Modern office space with natural lighting'
                : `e.g., <div class="p-6 bg-white rounded-xl shadow-lg">
  <h3 class="text-lg font-semibold">Hello World</h3>
  <button class="px-4 py-2 bg-blue-500 text-white rounded">Click Me</button>
</div>`
              }
              rows={generationMode === 'code-to-image' ? 8 : 3}
            />
            {iconValidationError && (
              <div className="validation-error" style={{ color: 'var(--color-systemRed)', fontSize: '12px', marginTop: '4px' }}>
                {iconValidationError}
              </div>
            )}
            {showIconList && availableIcons.length > 0 && (
              <div className="icon-list-popup" style={{
                marginTop: '8px',
                padding: '12px',
                background: 'var(--color-tertiarySystemBackground)',
                border: '1px solid var(--color-separator)',
                borderRadius: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                <div style={{ fontSize: '12px', color: 'var(--color-secondaryLabel)', marginBottom: '8px' }}>
                  Available Icons ({availableIcons.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {availableIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        setPrompt(icon);
                        setShowIconList(false);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        border: '1px solid var(--color-separator)',
                        borderRadius: '4px',
                        background: prompt === icon ? 'var(--color-systemBlue)' : 'var(--color-secondarySystemBackground)',
                        color: prompt === icon ? 'white' : 'var(--color-label)',
                        cursor: 'pointer',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || (generationMode === 'icon' && !!iconValidationError)}
            >
              {isGenerating
                ? (generationMode === 'ai-image' || generationMode === 'logo' || generationMode === 'illustration'
                  ? '🔄 Generating (this may take 4-6 minutes)...'
                  : '🔄 Generating...')
                : '🎨 Design'}
            </Button>
            <Button
              variant="secondary"
              onClick={checkApiStatus}
            >
              Check API Status
            </Button>
          </div>

          {error && (
            <div className="error-message">
              <pre>{error}</pre>
            </div>
          )}
        </Card>

        {/* Mockup Output Section */}
        {mockupResult && (
          <Card className="output-section">
            <div className="output-header">
              <h2 className="text-title2">Generated Mockup</h2>
              <div className="output-meta">
                <span className="meta-item">
                  {mockupResult.width}x{mockupResult.height}px
                </span>
              </div>
            </div>

            <div className="mockup-preview">
              {mockupResult.component_type === 'icon' && mockupResult.image?.startsWith('<svg') ? (
                <div
                  dangerouslySetInnerHTML={{ __html: mockupResult.image }}
                  style={{
                    maxWidth: '100%',
                    border: '1px solid var(--color-separator)',
                    borderRadius: '8px',
                    padding: '20px',
                    background: 'white',
                  }}
                />
              ) : (
                <img
                  src={mockupResult.data_url}
                  alt="Generated mockup"
                  style={{
                    maxWidth: '100%',
                    border: '1px solid var(--color-separator)',
                    borderRadius: '8px',
                  }}
                />
              )}
            </div>

            <div className="output-actions">
              <Button
                variant="primary"
                onClick={() => {
                  // Generate filename based on generation mode and prompt
                  const safeName = prompt.substring(0, 50).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'DESIGN';

                  // Determine file extension based on image type
                  let extension = 'png';
                  if (mockupResult.component_type === 'icon' && mockupResult.image?.startsWith('<svg')) {
                    extension = 'svg';
                  } else if (generationMode === 'icon') {
                    extension = 'svg';
                  }

                  const prefix = generationMode === 'mockup' ? 'MOCKUP'
                    : generationMode === 'icon' ? 'ICON'
                    : generationMode === 'logo' ? 'LOGO'
                    : generationMode === 'illustration' ? 'ILLUSTRATION'
                    : generationMode === 'symbol' ? 'SYMBOL'
                    : generationMode === 'ai-image' ? 'AI-IMAGE'
                    : 'DESIGN';

                  const fileName = `${prefix}-${safeName}.${extension}`;

                  // Download directly to user's computer (browser will use last download location)
                  const a = document.createElement('a');
                  a.href = mockupResult.data_url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                💾 Save to Computer
              </Button>
            </div>
          </Card>
        )}


        {/* Help Section */}
        {!mockupResult && !isGenerating && (
          <Card className="help-section">
            <h2 className="text-title2">How to Use</h2>
            <div className="help-content">
              <div className="help-item">
                <h3 className="text-headline">1. Select Type</h3>
                <p className="text-body text-secondary">
                  Choose whether you want to generate a component, styles, or layout.
                </p>
              </div>
              <div className="help-item">
                <h3 className="text-headline">2. Describe Your Design</h3>
                <p className="text-body text-secondary">
                  Be specific about what you want. Include details like variants, states, colors, and responsive behavior.
                </p>
              </div>
              <div className="help-item">
                <h3 className="text-headline">3. Generate</h3>
                <p className="text-body text-secondary">
                  Click Design to generate. First generation may take 30-60 seconds while the model warms up.
                </p>
              </div>
              <div className="help-item">
                <h3 className="text-headline">4. Save or Copy</h3>
                <p className="text-body text-secondary">
                  Copy the output to your clipboard or save it to your workspace's specifications folder.
                </p>
              </div>
            </div>

            <div className="examples-section">
              <h3 className="text-headline">Example Prompts</h3>
              <div className="examples">
                <button
                  className="example-btn"
                  onClick={() => {
                    setDesignType('component');
                    setPrompt('Create a card component with image, title, description, and action buttons with hover effects');
                  }}
                >
                  Card Component
                </button>
                <button
                  className="example-btn"
                  onClick={() => {
                    setDesignType('component');
                    setPrompt('Create a modal dialog with close button, title, content area, and footer with cancel/confirm buttons');
                  }}
                >
                  Modal Dialog
                </button>
                <button
                  className="example-btn"
                  onClick={() => {
                    setDesignType('styles');
                    setPrompt('Create a complete color palette with primary, secondary, success, warning, error colors and their shades');
                  }}
                >
                  Color Palette
                </button>
                <button
                  className="example-btn"
                  onClick={() => {
                    setDesignType('layout');
                    setPrompt('Create a responsive grid layout with 12 columns that works on mobile, tablet, and desktop');
                  }}
                >
                  Grid Layout
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>

      <style>{`
        .ui-designer-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--color-systemBackground);
          overflow: hidden;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 1px solid var(--color-separator);
          background: var(--color-secondarySystemBackground);
        }

        .header-content h1 {
          margin-bottom: 4px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .api-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          background: var(--color-tertiarySystemBackground);
        }

        .api-status.online {
          color: var(--color-systemGreen);
        }

        .api-status.offline {
          color: var(--color-systemRed);
        }

        .designer-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-section,
        .output-section,
        .help-section {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
        }

        .type-selector {
          display: flex;
          gap: 8px;
        }

        .type-btn {
          padding: 8px 16px;
          border: 1px solid var(--color-separator);
          border-radius: 8px;
          background: var(--color-tertiarySystemBackground);
          color: var(--color-label);
          cursor: pointer;
          transition: all 0.2s;
        }

        .type-btn:hover {
          background: var(--color-quaternarySystemFill);
        }

        .type-btn.active {
          background: var(--color-systemBlue);
          color: white;
          border-color: var(--color-systemBlue);
        }

        .design-input {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--color-separator);
          border-radius: 8px;
          background: var(--color-tertiarySystemBackground);
          color: var(--color-label);
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
        }

        .design-input:focus {
          outline: none;
          border-color: var(--color-systemBlue);
        }

        .form-actions {
          display: flex;
          gap: 12px;
        }

        .error-message {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          background: rgba(255, 59, 48, 0.1);
          color: var(--color-systemRed);
        }

        .error-message pre {
          margin: 0;
          white-space: pre-wrap;
          font-family: inherit;
          font-size: 13px;
        }

        .output-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .output-meta {
          display: flex;
          gap: 16px;
        }

        .meta-item {
          font-size: 12px;
          color: var(--color-secondaryLabel);
        }

        .patterns-used {
          margin-bottom: 12px;
        }

        .output-code {
          background: var(--color-tertiarySystemBackground);
          border: 1px solid var(--color-separator);
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          max-height: 400px;
          overflow-y: auto;
        }

        .output-code pre {
          margin: 0;
        }

        .output-code code {
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          font-size: 13px;
          line-height: 1.5;
        }

        .output-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
          align-items: center;
        }

        .view-toggle {
          display: flex;
          gap: 0;
          margin-bottom: 12px;
          border: 1px solid var(--color-separator);
          border-radius: 8px;
          overflow: hidden;
          width: fit-content;
        }

        .view-btn {
          padding: 8px 16px;
          border: none;
          background: var(--color-tertiarySystemBackground);
          color: var(--color-label);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .view-btn:hover {
          background: var(--color-quaternarySystemFill);
        }

        .view-btn.active {
          background: var(--color-systemBlue);
          color: white;
        }

        .preview-panel {
          margin-bottom: 12px;
        }

        .image-save-group {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-left: auto;
        }

        .format-select {
          padding: 8px 12px;
          border: 1px solid var(--color-separator);
          border-radius: 6px;
          background: var(--color-tertiarySystemBackground);
          color: var(--color-label);
          font-size: 13px;
          cursor: pointer;
        }

        .format-select:focus {
          outline: none;
          border-color: var(--color-systemBlue);
        }

        .help-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .help-item {
          padding: 16px;
          background: var(--color-tertiarySystemBackground);
          border-radius: 8px;
        }

        .help-item h3 {
          margin-bottom: 8px;
        }

        .examples-section {
          border-top: 1px solid var(--color-separator);
          padding-top: 20px;
        }

        .examples-section h3 {
          margin-bottom: 12px;
        }

        .examples {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .example-btn {
          padding: 8px 12px;
          border: 1px solid var(--color-separator);
          border-radius: 6px;
          background: var(--color-tertiarySystemBackground);
          color: var(--color-systemBlue);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .example-btn:hover {
          background: var(--color-systemBlue);
          color: white;
          border-color: var(--color-systemBlue);
        }
      `}</style>
    </PageLayout>
  );
};
