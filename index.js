const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ]
});

// Store temporary channels and their creators
const tempChannels = new Map();
const channelCreators = new Map();

// Configuration
const CONFIG = {
    CREATE_CHANNEL_NAME: '➕ Create Temp Channel',
    TEMP_CHANNEL_PREFIX: '🔊',
    MAX_TEMP_CHANNELS_PER_USER: 3,
    CHANNEL_TIMEOUT: 300000 // 5 minutes in milliseconds
};

client.once('ready', async () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    
    // Register slash commands
    await registerCommands();
    
    // Set bot status
    client.user.setActivity('Creating temp channels', { type: 'WATCHING' });
});

// Handle voice state updates (join/leave channels)
client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member;
    const guild = newState.guild;
    
    // User joined a channel
    if (!oldState.channel && newState.channel) {
        // Check if they joined the "Create Temp Channel" channel
        if (newState.channel.name === CONFIG.CREATE_CHANNEL_NAME) {
            await createTempChannel(member, guild, newState.channel);
        }
    }
    
    // User left a channel
    if (oldState.channel && !newState.channel) {
        await handleChannelLeave(oldState.channel);
    }
    
    // User switched channels
    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        // Check if they joined the create channel
        if (newState.channel.name === CONFIG.CREATE_CHANNEL_NAME) {
            await createTempChannel(member, guild, newState.channel);
        }
        
        // Check if they left a temp channel
        await handleChannelLeave(oldState.channel);
    }
});

// Create a temporary voice channel
async function createTempChannel(member, guild, createChannel) {
    try {
        // Check if user already has max temp channels
        const userChannels = Array.from(tempChannels.values()).filter(data => data.creator === member.id);
        if (userChannels.length >= CONFIG.MAX_TEMP_CHANNELS_PER_USER) {
            return;
        }
        
        // Create the temporary channel
        const tempChannel = await guild.channels.create({
            name: `${CONFIG.TEMP_CHANNEL_PREFIX} ${member.displayName}'s Channel`,
            type: ChannelType.GuildVoice,
            parent: createChannel.parent,
            permissionOverwrites: [
                {
                    id: member.id,
                    allow: [
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.MoveMembers,
                        PermissionFlagsBits.MuteMembers,
                        PermissionFlagsBits.DeafenMembers
                    ]
                }
            ]
        });
        
        // Move the user to the new channel
        await member.voice.setChannel(tempChannel);
        
        // Store channel info
        tempChannels.set(tempChannel.id, {
            creator: member.id,
            createdAt: Date.now(),
            timeout: null
        });
        
        channelCreators.set(member.id, tempChannel.id);
        
        console.log(`📢 Created temp channel: ${tempChannel.name} for ${member.displayName}`);
        
    } catch (error) {
        console.error('Error creating temp channel:', error);
    }
}

// Handle when someone leaves a channel
async function handleChannelLeave(channel) {
    if (!tempChannels.has(channel.id)) return;
    
    // Check if channel is empty
    if (channel.members.size === 0) {
        // Set a timeout to delete the channel if it remains empty
        const channelData = tempChannels.get(channel.id);
        
        if (channelData.timeout) {
            clearTimeout(channelData.timeout);
        }
        
        channelData.timeout = setTimeout(async () => {
            try {
                if (channel.members.size === 0) {
                    await deleteTempChannel(channel);
                }
            } catch (error) {
                console.error('Error in timeout deletion:', error);
            }
        }, CONFIG.CHANNEL_TIMEOUT);
        
        tempChannels.set(channel.id, channelData);
    }
}

// Delete a temporary channel
async function deleteTempChannel(channel) {
    try {
        const channelData = tempChannels.get(channel.id);
        if (!channelData) return;
        
        // Clear timeout if exists
        if (channelData.timeout) {
            clearTimeout(channelData.timeout);
        }
        
        // Remove from maps
        tempChannels.delete(channel.id);
        channelCreators.delete(channelData.creator);
        
        // Delete the channel
        await channel.delete('Temporary channel cleanup');
        console.log(`🗑️ Deleted temp channel: ${channel.name}`);
        
    } catch (error) {
        console.error('Error deleting temp channel:', error);
    }
}

// Slash command handling
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    switch (interaction.commandName) {
        case 'setup-temp-channels':
            await handleSetupCommand(interaction);
            break;
        case 'delete-my-channel':
            await handleDeleteMyChannelCommand(interaction);
            break;
        case 'temp-channel-info':
            await handleInfoCommand(interaction);
            break;
    }
});

// Setup command - creates the "Create Temp Channel" voice channel
async function handleSetupCommand(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: '❌ You need Manage Channels permission to use this command.', ephemeral: true });
    }
    
    try {
        // Check if create channel already exists
        const existingChannel = interaction.guild.channels.cache.find(ch => ch.name === CONFIG.CREATE_CHANNEL_NAME);
        if (existingChannel) {
            return interaction.reply({ content: '✅ Create Temp Channel already exists!', ephemeral: true });
        }
        
        // Create the voice channel
        const createChannel = await interaction.guild.channels.create({
            name: CONFIG.CREATE_CHANNEL_NAME,
            type: ChannelType.GuildVoice,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    deny: [PermissionFlagsBits.Speak]
                }
            ]
        });
        
        await interaction.reply({ content: `✅ Created ${CONFIG.CREATE_CHANNEL_NAME} voice channel! Users can join it to create their own temporary channels.`, ephemeral: true });
        
    } catch (error) {
        console.error('Error in setup command:', error);
        await interaction.reply({ content: '❌ Error setting up temp channels system.', ephemeral: true });
    }
}

// Delete my channel command
async function handleDeleteMyChannelCommand(interaction) {
    const userChannelId = channelCreators.get(interaction.user.id);
    
    if (!userChannelId) {
        return interaction.reply({ content: '❌ You don\'t have any temporary channels to delete.', ephemeral: true });
    }
    
    const channel = interaction.guild.channels.cache.get(userChannelId);
    if (!channel) {
        channelCreators.delete(interaction.user.id);
        return interaction.reply({ content: '❌ Your temporary channel no longer exists.', ephemeral: true });
    }
    
    await deleteTempChannel(channel);
    await interaction.reply({ content: '✅ Your temporary channel has been deleted.', ephemeral: true });
}

// Info command
async function handleInfoCommand(interaction) {
    const tempChannelCount = tempChannels.size;
    const userChannel = channelCreators.get(interaction.user.id);
    
    let response = `📊 **Temporary Channels Info**\n`;
    response += `🔢 Active temp channels: ${tempChannelCount}\n`;
    response += `⏱️ Auto-delete timeout: ${CONFIG.CHANNEL_TIMEOUT / 1000} seconds\n`;
    response += `👤 Max channels per user: ${CONFIG.MAX_TEMP_CHANNELS_PER_USER}\n\n`;
    
    if (userChannel) {
        const channel = interaction.guild.channels.cache.get(userChannel);
        if (channel) {
            response += `🎤 Your channel: ${channel.name}\n`;
            response += `👥 Members: ${channel.members.size}`;
        }
    } else {
        response += `❌ You don't have any active temporary channels.`;
    }
    
    await interaction.reply({ content: response, ephemeral: true });
}

// Register slash commands
async function registerCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName('setup-temp-channels')
            .setDescription('Set up the temporary voice channels system (Admin only)'),
        
        new SlashCommandBuilder()
            .setName('delete-my-channel')
            .setDescription('Delete your temporary voice channel'),
        
        new SlashCommandBuilder()
            .setName('temp-channel-info')
            .setDescription('Show information about temporary channels')
    ];
    
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        console.log('🔄 Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands.map(command => command.toJSON()) }
        );
        
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Error handling
client.on('error', console.error);
client.on('warn', console.warn);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down bot...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down bot...');
    client.destroy();
    process.exit(0);
});

// Login
client.login(process.env.DISCORD_TOKEN);