# Discord Voice Channel Bot

## Overview

This is a Discord bot built with Node.js and Discord.js v14 that creates and manages temporary voice channels. The bot allows users to join a trigger channel to automatically create their own temporary voice channel with a simplified control panel for channel management. The control panel is sent directly to the voice channel's built-in text chat area and includes 6 essential buttons: owner (transfer ownership), lock, unlock, limit (user limit), name (rename), and setstatus. The bot also supports comprehensive prefix commands with `.v` for all channel management functions.

## User Preferences

Preferred communication style: Simple, everyday language.
Language preference: Darija/Arabic mixed with English for technical terms.

## System Architecture

### Bot Architecture
The bot follows a modular event-driven architecture using Discord.js v14:

- **Entry Point**: `index.js` initializes the Discord client with necessary intents (Guilds, GuildVoiceStates, GuildMessages, MessageContent)
- **Command System**: Slash commands are dynamically loaded from the `/commands` directory using Discord.js Collections
- **Event System**: Discord events are handled through separate event files in the `/events` directory
- **Utility Modules**: Core functionality is separated into utility classes for channel management and control panels

### State Management
The bot maintains in-memory state using Discord.js Collections and Maps:

- `client.tempChannels`: Tracks active temporary channels
- `client.channelOwners`: Maps channels to their owners
- `client.channelSettings`: Stores channel-specific settings (locks, limits, etc.)

This approach was chosen for simplicity and real-time performance, though it means state is lost on bot restart.

### Voice Channel Management
The core functionality revolves around automatic temporary channel creation:

- **Trigger System**: Users join a specific named channel to trigger temp channel creation
- **Dynamic Categories**: Channels are organized under a configurable category
- **Permission Inheritance**: New channels inherit base permissions while granting owners management rights
- **Auto-cleanup**: Empty channels are automatically deleted after a configurable delay

### Control Panel System
Interactive channel management through Discord embeds and buttons:

- **Button-based Interface**: Uses Discord.js ActionRows and ButtonBuilder for user interactions
- **Modal Forms**: Complex inputs (like renaming) use Discord modals with text inputs
- **Real-time Updates**: Control panels update dynamically as channel settings change
- **Permission Validation**: All actions validate user permissions before execution

### Event Processing
The bot handles multiple Discord events:

- **voiceStateUpdate**: Manages user joins/leaves and temp channel lifecycle
- **interactionCreate**: Processes both slash commands and button interactions
- **Error Handling**: Comprehensive try-catch blocks with user-friendly error messages

### Configuration System
Centralized configuration through `config.js`:

- **Environment Variables**: Bot token sourced from environment for security
- **Customizable Settings**: Channel names, delays, limits, and UI elements are configurable
- **Emoji Configuration**: Control panel buttons use customizable emoji mappings
- **Permission Templates**: Default permission sets for different channel states

## External Dependencies

### Discord.js Framework
- **Version**: v14.21.0
- **Purpose**: Primary Discord API wrapper for bot functionality
- **Key Features Used**: Gateway intents, slash commands, voice state management, embeds, buttons, and modals

### Node.js Runtime
- **Built-in Modules**: Uses `fs` and `path` for dynamic file loading of commands and events
- **Module System**: CommonJS module pattern for compatibility

### Discord API
- **Gateway Events**: Real-time event processing for voice state changes and interactions
- **REST API**: Channel creation, permission management, and message operations
- **OAuth2**: Bot authentication using Discord bot tokens

The bot has minimal external dependencies by design, relying primarily on Discord.js and Node.js built-ins for a lightweight and maintainable codebase.