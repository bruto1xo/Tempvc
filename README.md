# 🎤 Temporary Voice Channel Bot

A Discord bot that automatically creates and manages temporary voice channels for users. When a user joins the designated "Create Temp Channel" voice channel, the bot creates a personal temporary voice channel for them and moves them to it.

## ✨ Features

- **Automatic Channel Creation**: Users join a trigger channel to get their own temporary voice channel
- **Auto-Cleanup**: Channels are automatically deleted when empty (after 5-minute timeout)
- **User Control**: Channel creators get management permissions for their channels
- **Slash Commands**: Easy setup and management through Discord slash commands
- **Configurable**: Customizable channel names, timeouts, and user limits
- **Rate Limiting**: Prevents spam by limiting channels per user

## 🚀 Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- A Discord application/bot token
- Discord server with appropriate permissions

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd temp-voice-channel-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the bot**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Discord bot token:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   ```

4. **Run the bot**
   ```bash
   npm start
   ```

### Bot Setup

1. **Create a Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section and create a bot
   - Copy the bot token and add it to your `.env` file

2. **Invite the Bot to Your Server**
   - In the Discord Developer Portal, go to "OAuth2" > "URL Generator"
   - Select scopes: `bot` and `applications.commands`
   - Select permissions:
     - `Manage Channels`
     - `Move Members`
     - `Mute Members`
     - `Deafen Members`
     - `Use Slash Commands`
   - Use the generated URL to invite the bot

3. **Setup the System**
   - Use the `/setup-temp-channels` command in your Discord server
   - This creates the "➕ Create Temp Channel" voice channel

## 🎯 How to Use

### For Users

1. **Create a Temporary Channel**
   - Join the "➕ Create Temp Channel" voice channel
   - The bot will automatically create a personal channel and move you to it
   - You'll have management permissions for your channel

2. **Manage Your Channel**
   - Move, mute, or deafen other users in your channel
   - Use `/delete-my-channel` to manually delete your channel
   - Use `/temp-channel-info` to see channel statistics

### For Administrators

- **Setup**: Use `/setup-temp-channels` to create the trigger channel
- **Monitor**: Use `/temp-channel-info` to see active channels
- **Configure**: Edit the bot's configuration in `index.js`

## ⚙️ Configuration

You can customize the bot behavior by editing the `CONFIG` object in `index.js`:

```javascript
const CONFIG = {
    CREATE_CHANNEL_NAME: '➕ Create Temp Channel',  // Name of the trigger channel
    TEMP_CHANNEL_PREFIX: '🔊',                     // Prefix for temporary channels
    MAX_TEMP_CHANNELS_PER_USER: 3,                 // Max channels per user
    CHANNEL_TIMEOUT: 300000                        // Auto-delete timeout (5 minutes)
};
```

## 📋 Commands

| Command | Description | Required Permission |
|---------|-------------|-------------------|
| `/setup-temp-channels` | Creates the trigger channel | Manage Channels |
| `/delete-my-channel` | Deletes your temporary channel | None |
| `/temp-channel-info` | Shows channel statistics | None |

## 🔧 Development

### Running in Development Mode
```bash
npm run dev
```

### Project Structure
```
temp-voice-channel-bot/
├── index.js          # Main bot file
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variables template
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

### Key Components

- **Voice State Monitoring**: Tracks when users join/leave voice channels
- **Channel Management**: Creates and deletes temporary channels
- **Permission System**: Grants appropriate permissions to channel creators
- **Timeout System**: Automatically cleans up empty channels
- **Slash Commands**: Provides user-friendly interaction

## 🛡️ Permissions Required

The bot needs the following permissions in your Discord server:

- **Manage Channels**: To create and delete voice channels
- **Move Members**: To move users to their temporary channels
- **Mute Members**: To allow channel creators to mute users
- **Deafen Members**: To allow channel creators to deafen users
- **Use Slash Commands**: To register and respond to slash commands

## 🐛 Troubleshooting

### Common Issues

1. **Bot doesn't respond to commands**
   - Check if the bot is online
   - Verify the bot token is correct
   - Ensure the bot has proper permissions

2. **Channels aren't being created**
   - Check if the bot has "Manage Channels" permission
   - Verify the trigger channel exists and has the correct name
   - Check console logs for error messages

3. **Channels aren't being deleted**
   - This is normal - channels are deleted after 5 minutes of being empty
   - Check if users are still in the channel (including bots)

### Debug Mode

To enable more detailed logging, you can modify the console.log statements in the code or check the console output when running the bot.

## 📄 License

This project is licensed under the MIT License - see the package.json file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the console output for error messages
3. Ensure all permissions are correctly set
4. Verify your Discord bot token is valid

---

**Happy chatting!** 🎉