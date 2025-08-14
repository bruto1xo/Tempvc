const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize collections
client.commands = new Collection();
client.tempChannels = new Map(); // Store temporary channel data
client.channelOwners = new Map(); // Store channel ownership
client.channelSettings = new Map(); // Store channel settings (locked, limit, etc.)

// Load command files
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

// Load event files
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// Message event for prefix commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('.v')) return;
    
    const args = message.content.slice(2).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    try {
        switch (command) {
            // Panel and Info Commands
            case 'panel':
                await handlePanelCommand(message);
                break;
            case 'help':
                await handlePrefixHelp(message);
                break;
            case 'vcinfo':
                await handleVcInfoCommand(message);
                break;
                
            // Setup Commands (Admin only)
            case 'set-role':
                await handleSetRoleCommand(message, args);
                break;
            case 'set-eventmanager':
                await handleSetEventManagerCommand(message, args);
                break;
            case 'set-antireject':
                await handleSetAntiRejectCommand(message, args);
                break;
            case 'set-unverified':
                await handleSetUnverifiedCommand(message, args);
                break;
            case 'set-jailed':
                await handleSetJailedCommand(message, args);
                break;
            case 'check':
                await handleCheckCommand(message);
                break;
            case 'prefix':
                await handlePrefixCommand(message, args);
                break;
            case 'setup':
                await handleSetupCommand(message);
                break;
            case 'setupname':
                await handleSetupNameCommand(message, args);
                break;
                
            // Manager Commands
            case 'man':
                await handleManagerCommand(message, args);
                break;
                
            // Voice Channel Control Commands
            case 'permit':
            case 'reject':
                await handlePermitRejectCommand(message, args);
                break;
            case 'permitchat':
                await handlePermitChatCommand(message);
                break;
            case 'rejectchat':
                await handleRejectChatCommand(message);
                break;
            case 'lock':
                await handleLockCommand(message);
                break;
            case 'unlock':
                await handleUnlockCommand(message);
                break;
            case 'lockchat':
                await handleLockChatCommand(message);
                break;
            case 'unlockchat':
                await handleUnlockChatCommand(message);
                break;
            case 'owner':
                await handleOwnerInfoCommand(message);
                break;
            case 'transfer':
                await handleTransferCommand(message, args);
                break;
            case 'sb-off':
            case 'sb-on':
                await handleSoundboardCommand(message, command);
                break;
            case 'activity-off':
            case 'activity-on':
                await handleActivityCommand(message, command);
                break;
            case 'clear':
                await handleClearCommand(message, args);
                break;
            case 'name':
                await handleNameCommand(message, args);
                break;
            case 'limit':
                await handleLimitCommand(message, args);
                break;
            case 'claim':
                await handleClaimCommand(message);
                break;
            default:
                await message.reply('❌ Unknown command. Use `.v help` for available commands.');
        }
    } catch (error) {
        console.error('Error handling prefix command:', error);
        await message.reply('❌ An error occurred while processing the command.');
    }
});

async function handlePanelCommand(message) {
    const member = message.member;
    
    // Check if user is in a voice channel
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    // Check if it's a temp channel and user owns it
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can request the control panel.');
    }
    
    // Send control panel to the voice channel
    const controlPanel = require('./utils/controlPanel.js');
    await controlPanel.sendControlPanel(voiceChannel, member);
    await message.reply('✅ Control panel sent to your voice channel!');
}

async function handlePrefixHelp(message) {
    const embed = new (require('discord.js').EmbedBuilder)()
        .setTitle('🎮 Voice Bot - All Commands')
        .setDescription('All available prefix commands with `.v`')
        .addFields(
            {
                name: '⚙️ Setup Commands (Admin Only)',
                value: '`.v set-role <role>` - Setup VIP Role for hide/show\n`.v set-eventmanager <role>` - Setup Event Manager Role\n`.v set-antireject <role>` - Setup Anti Reject Role\n`.v set-unverified <role>` - Setup Unverified Role\n`.v set-jailed <role>` - Setup Jailed Role\n`.v check` - Check Server Setup\n`.v prefix [new prefix]` - Change Bot Prefix\n`.v setup` - Create Temporary Voice Channel\n`.v setupname <template>` - Set voice channel name template',
                inline: false
            },
            {
                name: '👥 Manager Commands',
                value: '`.v man add <user/id>` - Add user to Managers List\n`.v man remove <user/id>` - Remove user from Managers\n`.v man clear` - Clear all Managers\n`.v man show` - Show all Managers',
                inline: false
            },
            {
                name: '🎯 Voice Channel Commands',
                value: '`.v panel` - Show Bot Panel\n`.v vcinfo` - Show Voice Channel Info\n`.v permit <user>` - Give user access\n`.v reject <user>` - Remove user access\n`.v permitchat` - Unlock Chat for User\n`.v rejectchat` - Lock Chat for User\n`.v lock/unlock` - Lock/Unlock channel\n`.v lockchat/unlockchat` - Lock/Unlock channel chat',
                inline: false
            },
            {
                name: '🔧 Channel Management',
                value: '`.v owner` - Show current channel owner\n`.v transfer <user>` - Transfer ownership\n`.v sb-off/on` - Disable/Enable SoundBoard\n`.v activity-on/off` - Disable/Enable Activity\n`.v clear [number]` - Delete recent messages (max 99)\n`.v name <new name>` - Change channel name\n`.v limit <number>` - Set user limit\n`.v claim` - Claim ownership of channel\n`.v help` - Show this help',
                inline: false
            }
        )
        .setColor(0x2F3136)
        .setFooter({ 
            text: 'Uranus | Voice Channel Manager',
            iconURL: message.guild.iconURL()
        });
    
    await message.reply({ embeds: [embed] });
}

// Store guild configurations
if (!client.guildConfigs) client.guildConfigs = new Map();
if (!client.managers) client.managers = new Map();

async function handleVcInfoCommand(message) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const settings = client.channelSettings.get(voiceChannel.id) || {};
    const owner = message.guild.members.cache.get(client.channelOwners.get(voiceChannel.id));
    
    const embed = new (require('discord.js').EmbedBuilder)()
        .setTitle('📊 Voice Channel Info')
        .setDescription(`Information about **${voiceChannel.name}**`)
        .addFields(
            {
                name: '👑 Owner',
                value: owner ? owner.displayName : 'Unknown',
                inline: true
            },
            {
                name: '👥 Users',
                value: `${voiceChannel.members.size}/${settings.userLimit || '∞'}`,
                inline: true
            },
            {
                name: '🔒 Status',
                value: settings.locked ? 'Locked' : 'Unlocked',
                inline: true
            },
            {
                name: '📝 Custom Status',
                value: settings.status || 'None',
                inline: false
            }
        )
        .setColor(0x2F3136)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

async function handleOwnerInfoCommand(message) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    const owner = message.guild.members.cache.get(ownerId);
    
    if (!owner) {
        return await message.reply('❌ Channel owner not found.');
    }
    
    await message.reply(`👑 **Channel Owner:** ${owner.displayName} (${owner.user.tag})`);
}

async function handleClaimCommand(message) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    const owner = message.guild.members.cache.get(ownerId);
    
    // Check if owner is still in the channel
    if (owner && voiceChannel.members.has(owner.id)) {
        return await message.reply('❌ The current owner is still in the channel.');
    }
    
    // Transfer ownership to the claimer
    client.channelOwners.set(voiceChannel.id, member.id);
    
    // Update permissions
    if (owner) {
        await voiceChannel.permissionOverwrites.edit(owner.id, {
            ManageChannels: null,
            ManageRoles: null
        });
    }
    
    await voiceChannel.permissionOverwrites.edit(member.id, {
        ManageChannels: true,
        ManageRoles: true
    });
    
    await message.reply(`👑 You have claimed ownership of **${voiceChannel.name}**`);
}

async function handleClearCommand(message, args) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can clear messages.');
    }
    
    let amount = 10; // default
    if (args.length > 0) {
        amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 99) {
            return await message.reply('❌ Please provide a number between 1-99.');
        }
    }
    
    try {
        const messages = await message.channel.messages.fetch({ limit: amount + 1 });
        await message.channel.bulkDelete(messages);
        
        const confirmMsg = await message.channel.send(`🗑️ Cleared ${amount} messages.`);
        setTimeout(() => confirmMsg.delete().catch(() => {}), 3000);
    } catch (error) {
        await message.reply('❌ Failed to clear messages. Messages might be too old.');
    }
}

async function handleOwnerCommand(message, args) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can transfer ownership.');
    }
    
    if (!args.length) {
        return await message.reply('❌ Please provide a username or user ID. Usage: `.v owner @user` or `.v owner username`');
    }
    
    const targetUserQuery = args.join(' ');
    const targetMember = message.guild.members.cache.find(m => 
        m.displayName.toLowerCase().includes(targetUserQuery.toLowerCase()) ||
        m.user.username.toLowerCase().includes(targetUserQuery.toLowerCase()) ||
        m.id === targetUserQuery.replace(/[<@!>]/g, '')
    );
    
    if (!targetMember) {
        return await message.reply('❌ User not found. Please provide a valid username or mention.');
    }
    
    // Update ownership
    client.channelOwners.set(voiceChannel.id, targetMember.id);
    
    // Update permissions
    await voiceChannel.permissionOverwrites.edit(member.id, {
        ManageChannels: null,
        ManageRoles: null
    });
    
    await voiceChannel.permissionOverwrites.edit(targetMember.id, {
        ManageChannels: true,
        ManageRoles: true
    });
    
    await message.reply(`✅ Channel ownership transferred to **${targetMember.displayName}**`);
}

async function handleLockCommand(message) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can lock the channel.');
    }
    
    // Lock the channel
    await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
        Connect: false
    });
    
    client.channelSettings.set(voiceChannel.id, {
        ...client.channelSettings.get(voiceChannel.id),
        locked: true
    });
    
    await message.reply('🔒 Channel has been locked.');
}

async function handleUnlockCommand(message) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can unlock the channel.');
    }
    
    // Unlock the channel
    await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
        Connect: true
    });
    
    client.channelSettings.set(voiceChannel.id, {
        ...client.channelSettings.get(voiceChannel.id),
        locked: false
    });
    
    await message.reply('🔓 Channel has been unlocked.');
}

async function handleLimitCommand(message, args) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can set the user limit.');
    }
    
    if (!args.length) {
        return await message.reply('❌ Please provide a number. Usage: `.v limit 5` (0 for no limit)');
    }
    
    const limit = parseInt(args[0]);
    if (isNaN(limit) || limit < 0 || limit > 99) {
        return await message.reply('❌ Please provide a valid number between 0-99.');
    }
    
    await voiceChannel.setUserLimit(limit);
    
    client.channelSettings.set(voiceChannel.id, {
        ...client.channelSettings.get(voiceChannel.id),
        userLimit: limit
    });
    
    const limitText = limit === 0 ? 'No limit' : `${limit} users`;
    await message.reply(`👥 User limit set to: **${limitText}**`);
}

async function handleNameCommand(message, args) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can rename the channel.');
    }
    
    if (!args.length) {
        return await message.reply('❌ Please provide a new name. Usage: `.v name My Cool Channel`');
    }
    
    const newName = args.join(' ');
    if (newName.length > 100) {
        return await message.reply('❌ Channel name must be 100 characters or less.');
    }
    
    const oldName = voiceChannel.name;
    await voiceChannel.setName(newName);
    
    await message.reply(`✏️ Channel renamed from **${oldName}** to **${newName}**`);
}

async function handleSetStatusCommand(message, args) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can set the channel status.');
    }
    
    if (!args.length) {
        return await message.reply('❌ Please provide a status message. Usage: `.v setstatus Gaming with friends`');
    }
    
    const status = args.join(' ');
    if (status.length > 100) {
        return await message.reply('❌ Status message must be 100 characters or less.');
    }
    
    // Store the status in channel settings
    client.channelSettings.set(voiceChannel.id, {
        ...client.channelSettings.get(voiceChannel.id),
        status: status
    });
    
    await message.reply(`📝 Channel status set to: **${status}**`);
}

// Add placeholder functions for all the remaining commands
async function handleSetRoleCommand(message, args) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ You need Administrator permissions to use this command.');
    }
    await message.reply('⚙️ Set-role command functionality will be implemented soon.');
}

async function handleSetEventManagerCommand(message, args) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ You need Administrator permissions to use this command.');
    }
    await message.reply('⚙️ Set-eventmanager command functionality will be implemented soon.');
}

async function handleSetAntiRejectCommand(message, args) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ You need Administrator permissions to use this command.');
    }
    await message.reply('⚙️ Set-antireject command functionality will be implemented soon.');
}

async function handleSetUnverifiedCommand(message, args) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ You need Administrator permissions to use this command.');
    }
    await message.reply('⚙️ Set-unverified command functionality will be implemented soon.');
}

async function handleSetJailedCommand(message, args) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ You need Administrator permissions to use this command.');
    }
    await message.reply('⚙️ Set-jailed command functionality will be implemented soon.');
}

async function handleCheckCommand(message) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ You need Administrator permissions to use this command.');
    }
    await message.reply('⚙️ Check command functionality will be implemented soon.');
}

async function handlePrefixCommand(message, args) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ You need Administrator permissions to use this command.');
    }
    await message.reply('⚙️ Prefix change functionality will be implemented soon.');
}

async function handleSetupCommand(message) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ You need Administrator permissions to use this command.');
    }
    await message.reply('⚙️ Setup command functionality will be implemented soon.');
}

async function handleSetupNameCommand(message, args) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ You need Administrator permissions to use this command.');
    }
    await message.reply('⚙️ Setupname command functionality will be implemented soon.');
}

async function handleManagerCommand(message, args) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can manage the managers list.');
    }
    
    await message.reply('⚙️ Manager commands functionality will be implemented soon.');
}

async function handlePermitRejectCommand(message, args) {
    const member = message.member;
    
    if (!member.voice.channel) {
        return await message.reply('❌ You need to be in a voice channel to use this command.');
    }
    
    const voiceChannel = member.voice.channel;
    
    if (!client.tempChannels.has(voiceChannel.id)) {
        return await message.reply('❌ This command only works in temporary voice channels.');
    }
    
    const ownerId = client.channelOwners.get(voiceChannel.id);
    if (ownerId !== member.id && !member.permissions.has('ADMINISTRATOR')) {
        return await message.reply('❌ Only the channel owner can permit/reject users.');
    }
    
    if (!args.length) {
        return await message.reply('❌ Please provide a username or user ID. Usage: `.v permit @user` or `.v reject @user`');
    }
    
    const targetUserQuery = args.join(' ');
    const targetMember = message.guild.members.cache.find(m => 
        m.displayName.toLowerCase().includes(targetUserQuery.toLowerCase()) ||
        m.user.username.toLowerCase().includes(targetUserQuery.toLowerCase()) ||
        m.id === targetUserQuery.replace(/[<@!>]/g, '')
    );
    
    if (!targetMember) {
        return await message.reply('❌ User not found. Please provide a valid username or mention.');
    }
    
    const command = message.content.split(' ')[0].slice(2).toLowerCase();
    
    if (command === 'permit') {
        await voiceChannel.permissionOverwrites.edit(targetMember.id, {
            Connect: true,
            ViewChannel: true
        });
        await message.reply(`✅ **${targetMember.displayName}** has been given access to the channel.`);
    } else {
        await voiceChannel.permissionOverwrites.edit(targetMember.id, {
            Connect: false
        });
        // Move user out if they're in the channel
        if (targetMember.voice.channel && targetMember.voice.channel.id === voiceChannel.id) {
            await targetMember.voice.disconnect();
        }
        await message.reply(`❌ **${targetMember.displayName}** has been removed from the channel.`);
    }
}

async function handlePermitChatCommand(message) {
    await message.reply('⚙️ Permitchat command functionality will be implemented soon.');
}

async function handleRejectChatCommand(message) {
    await message.reply('⚙️ Rejectchat command functionality will be implemented soon.');
}

async function handleLockChatCommand(message) {
    await message.reply('⚙️ Lockchat command functionality will be implemented soon.');
}

async function handleUnlockChatCommand(message) {
    await message.reply('⚙️ Unlockchat command functionality will be implemented soon.');
}

async function handleTransferCommand(message, args) {
    return await handleOwnerCommand(message, args);
}

async function handleSoundboardCommand(message, command) {
    await message.reply('⚙️ Soundboard commands functionality will be implemented soon.');
}

async function handleActivityCommand(message, command) {
    await message.reply('⚙️ Activity commands functionality will be implemented soon.');
}

// Ready event
client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    console.log(`🔧 Serving ${client.guilds.cache.size} servers`);
    
    // Set bot activity
    client.user.setActivity('Voice Channels | .v help', { type: 'WATCHING' });
});

// Error handling
client.on('error', console.error);
client.on('warn', console.warn);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
const token = process.env.DISCORD_TOKEN || config.token;
if (!token) {
    console.error('❌ No bot token provided! Please set DISCORD_TOKEN environment variable or update config.js');
    process.exit(1);
}

client.login(token).catch(console.error);

module.exports = client;
