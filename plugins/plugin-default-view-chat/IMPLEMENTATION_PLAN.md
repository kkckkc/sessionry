# Chat Plugin Implementation Plan

## Overview

This document outlines the implementation plan for integrating the Vercel AI SDK into the Sessionry chat plugin to create a functional AI-powered chat interface with configurable provider settings.

## Architecture Design

### Component Structure

```
plugin-default-view-chat/
├── src/
│   ├── index.ts                    # Main process plugin definition
│   ├── renderer.tsx                # Renderer plugin with views
│   ├── definition.ts               # Plugin metadata and actions
│   ├── settings.ts                 # Settings type definitions
│   ├── SettingsView.tsx            # Settings UI component
│   ├── ChatView.tsx                # Main chat interface component
│   ├── chatService.ts              # Main process chat service (AI SDK integration)
│   ├── types.ts                    # Shared types for messages, state
│   └── components/
│       ├── MessageList.tsx         # Message display component
│       ├── MessageInput.tsx        # Input field with send button
│       ├── Message.tsx             # Individual message component
│       └── StreamingIndicator.tsx  # Loading/streaming indicator
```

### IPC Communication Pattern

Following the terminal plugin pattern, we'll define IPC channels for chat operations:

```typescript
export const CHAT_IPC_CHANNELS = {
  sendMessage: 'chat:send-message',
  streamChunk: 'chat:stream-chunk',
  streamComplete: 'chat:stream-complete',
  streamError: 'chat:stream-error',
  clearHistory: 'chat:clear-history',
  loadHistory: 'chat:load-history'
} as const;
```

### State Management

**Main Process State:**
- Active chat sessions (by pane ID)
- Message history per session
- Streaming state tracking
- AI SDK client instances

**Renderer State:**
- Current messages array
- Input text
- Streaming status
- Error states

## Settings Schema

### ChatPluginSettings Interface

```typescript
export interface ChatProviderConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string; // For custom providers
  temperature?: number;
  maxTokens?: number;
}

export interface ChatPluginSettings {
  provider: ChatProviderConfig;
  systemPrompt?: string;
  persistHistory: boolean;
  maxHistoryMessages: number;
}
```

### Default Settings

```typescript
const defaultSettings: ChatPluginSettings = {
  provider: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 2000
  },
  systemPrompt: 'You are a helpful AI assistant.',
  persistHistory: true,
  maxHistoryMessages: 50
};
```

## Settings View Design

### UI Components Layout

```
┌─────────────────────────────────────────┐
│ AI Provider Configuration               │
├─────────────────────────────────────────┤
│ Provider: [Dropdown: OpenAI ▼]         │
│ API Key:  [••••••••••••••••] [Show]    │
│ Model:    [gpt-4-turbo-preview ▼]      │
│ Base URL: [https://api.openai.com]     │
│           (for custom providers)        │
├─────────────────────────────────────────┤
│ Advanced Settings                       │
├─────────────────────────────────────────┤
│ Temperature: [0.7] (0.0 - 2.0)         │
│ Max Tokens:  [2000]                     │
│ System Prompt:                          │
│ [You are a helpful AI assistant...]     │
├─────────────────────────────────────────┤
│ History Settings                        │
├─────────────────────────────────────────┤
│ ☑ Persist chat history                 │
│ Max messages: [50]                      │
└─────────────────────────────────────────┘
```

### Provider Options

- **OpenAI**: GPT-4, GPT-3.5-turbo models
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku
- **Google**: Gemini Pro, Gemini Pro Vision
- **Custom**: User-defined endpoint (OpenAI-compatible API)

## Chat UI Design

### Layout Structure

```
┌─────────────────────────────────────────┐
│ Chat                              [⚙️] │ ← Pane title with settings
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐    │
│  │ User: Hello!                   │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ Assistant: Hi! How can I help? │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ User: What's the weather?      │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ Assistant: ▊ (streaming...)    │    │
│  └────────────────────────────────┘    │
│                                         │
│                                    ↓    │ ← Auto-scroll
├─────────────────────────────────────────┤
│ [Type a message...            ] [Send] │
└─────────────────────────────────────────┘
```

### Message Component Features

- **User messages**: Right-aligned, distinct styling
- **Assistant messages**: Left-aligned, markdown rendering
- **Streaming indicator**: Animated cursor during response generation
- **Error messages**: Red border/background for errors
- **Timestamps**: Optional display of message time
- **Copy button**: Copy message content to clipboard

## Implementation Steps

### Phase 1: Foundation (Setup & Configuration)

#### 1.1 Update Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@ai-sdk/openai": "^0.0.x",
    "@ai-sdk/anthropic": "^0.0.x",
    "@ai-sdk/google": "^0.0.x",
    "ai": "^3.x.x",
    "@sessionry/plugin-api": "workspace:*"
  }
}
```

#### 1.2 Define Types and Constants

Create `src/types.ts`:
- Message interface (role, content, timestamp, id)
- ChatSession interface
- Streaming state types

Create `src/constants.ts`:
- IPC channel definitions
- Default settings
- Provider configurations

#### 1.3 Create Settings Schema

Create `src/settings.ts`:
- ChatPluginSettings interface
- Provider configuration types
- Validation helpers

### Phase 2: Settings View

#### 2.1 Build Settings UI

Create `src/SettingsView.tsx`:
- Provider selection dropdown
- API key input (password field with show/hide)
- Model selection (dynamic based on provider)
- Advanced settings (temperature, max tokens)
- System prompt textarea
- History settings toggles

Use existing components:
- `SettingsSection` for grouping
- `SettingSelect` for dropdowns
- `Input` for text fields
- `SettingToggle` for boolean options

#### 2.2 Wire Settings to Plugin

Update `src/definition.ts`:
- Add `settingsView` definition with id, title, description

Update `src/renderer.tsx`:
- Import and register SettingsView component

### Phase 3: Main Process Chat Service

#### 3.1 Create Chat Service

Create `src/chatService.ts`:
- Initialize AI SDK clients based on provider settings
- Manage active chat sessions (Map<paneId, session>)
- Handle message sending with streaming
- Store message history
- Implement error handling

Key methods:
```typescript
class ChatService {
  async sendMessage(paneId: string, message: string): Promise<void>
  async clearHistory(paneId: string): Promise<void>
  async loadHistory(paneId: string): Promise<Message[]>
  private createAIClient(config: ChatProviderConfig): AIClient
  private handleStream(paneId: string, stream: ReadableStream): Promise<void>
}
```

#### 3.2 Integrate with Plugin Main Process

Update `src/index.ts`:
- Import ChatService
- Initialize service in `activateMain`
- Register IPC handlers for all chat operations
- Subscribe to workspace events (pane removal cleanup)
- Handle settings changes (recreate AI client)

### Phase 4: Chat UI Components

#### 4.1 Message Components

Create `src/components/Message.tsx`:
- Display user/assistant messages
- Markdown rendering for assistant messages
- Copy button
- Timestamp display
- Error state styling

Create `src/components/MessageList.tsx`:
- Scrollable container
- Auto-scroll to bottom on new messages
- Virtualization for large histories (optional)

Create `src/components/MessageInput.tsx`:
- Textarea with auto-resize
- Send button (disabled when empty or streaming)
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)

Create `src/components/StreamingIndicator.tsx`:
- Animated typing indicator
- Show during message streaming

#### 4.2 Main Chat View

Create `src/ChatView.tsx`:
- Integrate all components
- Manage local state (messages, input, streaming)
- Handle IPC communication
- Implement message sending
- Handle streaming updates
- Error handling and display

### Phase 5: Streaming Implementation

#### 5.1 Main Process Streaming

In `chatService.ts`:
- Use AI SDK's `streamText` function
- Emit chunks via IPC as they arrive
- Handle completion and errors
- Update message history

```typescript
const result = await streamText({
  model: this.aiClient,
  messages: conversationHistory,
  onChunk: (chunk) => {
    this.ipcEmit(CHAT_IPC_CHANNELS.streamChunk, {
      paneId,
      messageId,
      chunk: chunk.text
    });
  }
});
```

#### 5.2 Renderer Streaming Handling

In `ChatView.tsx`:
- Listen for stream chunks
- Append to current message
- Update UI in real-time
- Handle completion/error events

### Phase 6: History Persistence

#### 6.1 Storage Implementation

Options:
1. **File-based**: Store in workspace directory (`.sessionry/chat-history/`)
2. **Settings-based**: Store in plugin settings (limited size)
3. **Database**: SQLite for larger histories (future enhancement)

Recommended: File-based with JSON format

#### 6.2 Load/Save Operations

- Save after each completed message
- Load on pane creation
- Implement max message limit
- Add clear history action

### Phase 7: Error Handling & Polish

#### 7.1 Error Scenarios

- Invalid API key
- Network errors
- Rate limiting
- Model not available
- Streaming interruption

#### 7.2 User Feedback

- Toast notifications for errors
- Inline error messages in chat
- Retry mechanisms
- Loading states

#### 7.3 Accessibility

- Keyboard navigation
- Screen reader support
- Focus management
- ARIA labels

### Phase 8: Testing & Documentation

#### 8.1 Testing

- Unit tests for chat service
- Integration tests for IPC communication
- UI component tests
- Manual testing with different providers

#### 8.2 Documentation

- Update README.md with features
- Add configuration guide
- Document supported providers
- Add troubleshooting section

## Technical Considerations

### Security

- **API Key Storage**: Store encrypted in settings (Electron's safeStorage)
- **Validation**: Validate API keys before saving
- **Sanitization**: Sanitize user input before sending to AI

### Performance

- **Streaming**: Use efficient chunk handling
- **History**: Implement pagination for large histories
- **Memory**: Clean up old sessions
- **Debouncing**: Debounce input for auto-save

### Error Recovery

- **Retry Logic**: Implement exponential backoff
- **Fallback**: Graceful degradation on errors
- **State Recovery**: Restore state after crashes

### Provider Compatibility

- **OpenAI**: Full support via `@ai-sdk/openai`
- **Anthropic**: Full support via `@ai-sdk/anthropic`
- **Google**: Full support via `@ai-sdk/google`
- **Custom**: Support OpenAI-compatible APIs

## Future Enhancements

1. **Multi-modal Support**: Image input/generation
2. **Tool Calling**: Allow AI to execute actions
3. **Context Integration**: Include workspace files in context
4. **Chat Templates**: Pre-defined prompts
5. **Export**: Export conversations
6. **Search**: Search through chat history
7. **Multiple Conversations**: Support multiple chat sessions per pane
8. **Voice Input**: Speech-to-text integration

## Success Criteria

- ✅ Settings view allows provider configuration
- ✅ Chat UI displays messages correctly
- ✅ Streaming works smoothly
- ✅ Messages persist across sessions
- ✅ Error handling is robust
- ✅ Works with at least OpenAI and Anthropic
- ✅ Documentation is complete

## Timeline Estimate

- Phase 1-2: 2-3 hours (setup, settings)
- Phase 3: 3-4 hours (main process service)
- Phase 4: 4-5 hours (UI components)
- Phase 5: 2-3 hours (streaming)
- Phase 6: 2-3 hours (persistence)
- Phase 7: 2-3 hours (polish)
- Phase 8: 2-3 hours (testing, docs)

**Total: 17-24 hours**

## Next Steps

1. Review and approve this plan
2. Switch to `code` mode to begin implementation
3. Start with Phase 1 (dependencies and types)
4. Iterate through phases sequentially
5. Test after each phase completion
