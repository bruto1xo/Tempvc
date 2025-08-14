const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Voice channel management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup the trigger channel for temporary voice channels')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the trigger channel')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Show help information about voice commands')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Show statistics about temporary channels')
        ),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case 'setup':
                    await handleSetup(interaction);
                    break;
                case 'help':
                    await handleHelp(interaction);
                    break;
                case 'stats':
                    await handleStats(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error executing voice command:', error);
            
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ An error occurred while executing the command.',
                    ephemeral: true
                });
            }
        }
    }
};

async function handleSetup(interaction) {
    // Check if user has admin permissions
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return await interaction.reply({
            content: '❌ You need Administrator permissions to use this command.',
            ephemeral: true
        });
    }
    
    try {
        const channelName = interaction.options.getString('name') || config.voice.triggerChannelName;
        
        // Check if trigger channel already exists
        const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName);
        
        if (existingChannel) {
            return await interaction.reply({
                content: `✅ Trigger channel already exists: ${existingChannel}`,
                ephemeral: true
            });
        }
        
        // Find or create category
        let category = interaction.guild.channels.cache.find(c => 
            c.type === 4 && c.name === config.voice.tempChannelCategory
        );
        
        if (!category) {
            category = await interaction.guild.channels.create({
                name: config.voice.tempChannelCategory,
                type: 4 // Category
            });
        }
        
        // Create trigger channel
        const triggerChannel = await interaction.guild.channels.create({
            name: channelName,
            type: 2, // Voice channel
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    allow: ['VIEW_CHANNEL', 'CONNECT'],
                    deny: ['SPEAK']
                }
            ]
        });
        
        await interaction.reply({
            content: `✅ Setup complete! Created trigger channel: ${triggerChannel}\n\nUsers who join this channel will automatically get their own temporary voice channel.`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error in setup command:', error);
        await interaction.reply({
            content: '❌ Failed to setup trigger channel. Please check bot permissions.',
            ephemeral: true
        });
    }
}

async function handleHelp(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🎮 Dark Side Voice Bot - Help')
        .setDescription('A comprehensive voice channel management system that creates temporary voice channels with full control panels.')
        .setColor(config.controlPanel.embedColor)
        .addFields(
            {
                name: '🚀 How it Works',
                value: `1. Join the **${config.voice.triggerChannelName}** channel\n2. You'll be moved to your own temporary voice channel\n3. Use the control panel to manage your channel\n4. Channel auto-deletes when empty`,
                inline: false
            },
            {
                name: '🎯 Control Panel Features',
                value: '🔒 **Lock/Unlock** - Control who can join\n✏️ **Rename** - Change channel name\n👥 **Limit** - Set user limit\n👁️ **Hide/Unhide** - Toggle visibility\n👑 **Claim** - Take ownership of abandoned channels\n🔄 **Transfer** - Give ownership to another user\n❌ **Disconnect** - Remove all users\n⚙️ **Invite** - Create invite links',
                inline: false
            },
            {
                name: '⚡ Commands',
                value: '`/voice setup` - Setup trigger channel (Admin only)\n`/voice help` - Show this help\n`/voice stats` - Show channel statistics',
                inline: false
            }
        )
        .setFooter({ 
            text: 'Dark Side Family | Voice Channel Manager',
            iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleStats(interaction) {
    const client = interaction.client;
    const tempChannels = client.tempChannels;
    const activeChannels = Array.from(tempChannels.values()).filter(data => 
        data.guildId === interaction.guild.id
    );
    
    const embed = new EmbedBuilder()
        .setTitle('📊 Voice Channel Statistics')
        .setColor(config.controlPanel.embedColor)
        .addFields(
            {
                name: '📈 Current Stats',
                value: `**Active Temp Channels:** ${activeChannels.length}\n**Total Channels Created:** ${tempChannels.size}\n**Bot Guilds:** ${client.guilds.cache.size}`,
                inline: true
            },
            {
                name: '⚙️ Configuration',
                value: `**Trigger Channel:** ${config.voice.triggerChannelName}\n**Delete Delay:** ${config.voice.deleteDelay}ms\n**Default Limit:** ${config.voice.defaultUserLimit || 'No limit'}`,
                inline: true
            }
        )
        .setFooter({ 
            text: 'Dark Side Family | Voice Channel Manager',
            iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}
