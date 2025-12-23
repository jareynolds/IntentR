import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useWorkspace } from '../context/WorkspaceContext';
import { PageLayout } from '../components';
import { INTEGRATION_URL } from '../api/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatHistory {
  role: string;
  content: string;
}

export const AIChat: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for this workspace. I can help you with code generation, file operations, and answering questions about your project. I have access to read and write files within your workspace folder.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Check for workspace
    if (!currentWorkspace?.projectFolder) {
      setError('No workspace selected or no project folder configured. Please select a workspace with a project folder in Workspace Settings.');
      return;
    }

    // Check for API key
    const apiKey = localStorage.getItem('anthropic_api_key');
    if (!apiKey) {
      setError('No Anthropic API key found. Please set it in Settings.');
      return;
    }

    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build chat history for context
      const history: ChatHistory[] = messages.slice(1).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(`${INTEGRATION_URL}/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          workspacePath: currentWorkspace.projectFolder,
          apiKey: apiKey,
          history: history,
          aiPreset: currentWorkspace.activeAIPreset || 0,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      setError(`Failed to communicate with AI service: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Extract code blocks from message content
  const renderMessageContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(
          <p key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
            {content.slice(lastIndex, match.index)}
          </p>
        );
      }

      // Add code block
      const language = match[1] || 'text';
      const code = match[2];
      parts.push(
        <div key={`code-${match.index}`} className="code-block-container">
          <div className="code-block-header">
            <span className="code-language">{language}</span>
            <Button
              variant="ghost"
              onClick={() => handleCopyCode(code)}
              className="copy-button"
            >
              Copy
            </Button>
          </div>
          <pre className="code-block">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <p key={`text-${lastIndex}`} style={{ whiteSpace: 'pre-wrap' }}>
          {content.slice(lastIndex)}
        </p>
      );
    }

    return parts.length > 0 ? parts : <p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>;
  };

  return (
    <PageLayout
      title="AI Assistant"
      quickDescription={currentWorkspace?.projectFolder
        ? `Working in: ${currentWorkspace.projectFolder}`
        : 'Select a workspace with a project folder to enable AI assistance'}
      detailedDescription="Chat with Claude AI to get help with your project.
The AI assistant can read and write files in your workspace, answer questions about your code, and help with code generation.
Your chat history is maintained throughout the session for context-aware responses."
      className="ai-chat-page"
    >

      {error && (
        <div style={{
          backgroundColor: 'var(--color-systemRed)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      <Card className="chat-container">
        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message message-${message.role}`}>
              <div className="message-header">
                <span className="message-author">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </span>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              <div className="message-content">
                {renderMessageContent(message.content)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message message-assistant">
              <div className="message-header">
                <span className="message-author">AI Assistant</span>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-grey-200 bg-white flex flex-col gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentWorkspace?.projectFolder
              ? "Ask me anything about your project or request code generation..."
              : "Please select a workspace with a project folder first"}
            disabled={isLoading || !currentWorkspace?.projectFolder}
            className="input resize-y"
            rows={3}
            style={{ minHeight: '60px' }}
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim() || !currentWorkspace?.projectFolder}
            >
              {isLoading ? 'Thinking...' : 'Send'}
            </Button>
          </div>
        </div>
      </Card>

      <style>{`
        .ai-chat-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .chat-header {
          margin-bottom: 24px;
        }

        .chat-header h2 {
          margin: 0 0 8px 0;
          color: var(--color-label);
          font-size: 28px;
        }

        .chat-header p {
          margin: 0;
          color: var(--color-secondaryLabel);
          font-size: 14px;
        }

        .chat-container {
          height: calc(100vh - 360px);
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 80%;
        }

        .message-user {
          align-self: flex-end;
        }

        .message-assistant {
          align-self: flex-start;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 13px;
        }

        .message-author {
          font-weight: 600;
          color: var(--color-label);
        }

        .message-time {
          color: var(--color-secondaryLabel);
          font-size: 12px;
        }

        .message-content {
          background: var(--color-systemBackground);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .message-user .message-content {
          background: var(--color-primary);
          color: white;
        }

        .message-content p {
          margin: 0;
          line-height: 1.6;
        }

        .code-block-container {
          margin-top: 16px;
          border-radius: 8px;
          overflow: hidden;
          background: var(--color-label);
        }

        .code-block-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .code-language {
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .copy-button {
          font-size: 13px;
          padding: 4px 12px;
          color: white;
        }

        .copy-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .code-block {
          margin: 0;
          padding: 16px;
          overflow-x: auto;
          background: var(--color-label);
          color: var(--color-systemBackground);
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          line-height: 1.6;
        }

        .code-block code {
          color: inherit;
          background: none;
          padding: 0;
        }

        .typing-indicator {
          display: flex;
          gap: 6px;
          padding: 8px 0;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-primary);
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .message {
            max-width: 90%;
          }

          .chat-container {
            height: calc(100vh - 400px);
          }
        }
      `}</style>
    </PageLayout>
  );
};
