module.exports = {
    // Bot token (use environment variable DISCORD_TOKEN instead)
    token: process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE',
    
    // Voice channel configuration
    voice: {
        // Channel name that triggers temp channel creation
        triggerChannelName: '➕ Create Channel',
        
        // Category where temp channels will be created
        tempChannelCategory: 'TEMPORARY CHANNELS',
        
        // Default temp channel name template
        defaultChannelName: "{username}'s Channel",
        
        // Time in milliseconds before deleting empty channels
        deleteDelay: 1000, // 1 second
        
        // Maximum user limit for temp channels
        maxUserLimit: 99,
        
        // Default user limit (0 = no limit)
        defaultUserLimit: 0
    },
    
    // Control panel configuration
    controlPanel: {
        // Color for embeds (hex color)
        embedColor: 0x2F3136,
        
        // Emoji configuration
        emojis: {
            lock: '🔒',
            unlock: '🔓',
            rename: '✏️',
            limit: '👥',
            hide: '👁️‍🗨️',
            unhide: '👁️',
            claim: '👑',
            transfer: '🔄',
            top: '⬆️',
            mute: '🔇',
            unmute: '🔊',
            disconnect: '❌',
            invite: '⚙️'
        }
    },
    
    // Permission settings
    permissions: {
        // Allow users to claim abandoned channels
        allowClaim: true,
        
        // Allow channel transfer
        allowTransfer: true,
        
        // Require specific role to use bot
        requiredRole: null // Set to role ID if needed
    }
};
