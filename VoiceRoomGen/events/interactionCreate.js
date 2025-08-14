const { Events, InteractionType } = require('discord.js');
const channelManager = require('../utils/channelManager.js');
const controlPanel = require('../utils/controlPanel.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // Handle slash commands
            if (interaction.type === InteractionType.ApplicationCommand) {
                await handleSlashCommand(interaction);
            }
            
            // Handle button interactions
            if (interaction.type === InteractionType.MessageComponent) {
                await handleButtonInteraction(interaction);
            }
            
            // Handle modal submissions
            if (interaction.type === InteractionType.ModalSubmit) {
                await handleModalSubmit(interaction);
            }
            
        } catch (error) {
            console.error('Error in interactionCreate:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    }
};

async function handleSlashCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);
    
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        
        const errorMessage = '❌ There was an error while executing this command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}

async function handleButtonInteraction(interaction) {
    const [action, channelId] = interaction.customId.split('_');
    const member = interaction.member;
    
    if (!interaction.guild) {
        return await interaction.reply({
            content: '❌ This command can only be used in a server.',
            flags: 64 // InteractionResponseFlags.Ephemeral
        });
    }
    
    const channel = interaction.guild.channels.cache.get(channelId);
    
    if (!channel) {
        return await interaction.reply({
            content: '❌ Voice channel not found.',
            ephemeral: true
        });
    }
    
    // Check if user has permission to control this channel
    const hasPermission = channelManager.hasChannelPermission(member, channelId, interaction.client);
    
    if (!hasPermission && !['claim', 'invite'].includes(action)) {
        return await interaction.reply({
            content: '❌ You don\'t have permission to control this channel.',
            ephemeral: true
        });
    }
    
    try {
        switch (action) {
            case 'lock':
                await channelManager.lockChannel(channel, interaction.client);
                await interaction.reply({ content: '🔒 Channel locked.', ephemeral: true });
                break;
                
            case 'unlock':
                await channelManager.unlockChannel(channel, interaction.client);
                await interaction.reply({ content: '🔓 Channel unlocked.', ephemeral: true });
                break;
                
            case 'rename':
                await interaction.showModal(controlPanel.createRenameModal(channelId));
                break;
                
            case 'limit':
                await interaction.showModal(controlPanel.createLimitModal(channelId));
                break;
                
            case 'hide':
                await channelManager.hideChannel(channel, interaction.client);
                await interaction.reply({ content: '👁️‍🗨️ Channel hidden.', ephemeral: true });
                break;
                
            case 'unhide':
                await channelManager.unhideChannel(channel, interaction.client);
                await interaction.reply({ content: '👁️ Channel visible.', ephemeral: true });
                break;
                
            case 'claim':
                const claimed = await channelManager.claimChannel(channel, member, interaction.client);
                if (claimed) {
                    await interaction.reply({ content: '👑 Channel claimed!', ephemeral: true });
                    await controlPanel.updateControlPanel(channel, interaction.client);
                } else {
                    await interaction.reply({ content: '❌ Cannot claim this channel.', ephemeral: true });
                }
                break;
                
            case 'owner':
                // Show owner information
                const ownerId = interaction.client.channelOwners.get(channelId);
                const owner = interaction.guild.members.cache.get(ownerId);
                await interaction.reply({
                    content: owner ? `👑 **Channel Owner:** ${owner.displayName}` : '❌ Owner not found.',
                    flags: 64
                });
                break;
                
            case 'vcinfo':
                // Show voice channel info
                const settings = interaction.client.channelSettings.get(channelId) || {};
                const ownerMember = interaction.guild.members.cache.get(interaction.client.channelOwners.get(channelId));
                
                const infoEmbed = new (require('discord.js').EmbedBuilder)()
                    .setTitle('📊 Voice Channel Info')
                    .setDescription(`Information about **${channel.name}**`)
                    .addFields(
                        {
                            name: '👑 Owner',
                            value: ownerMember ? ownerMember.displayName : 'Unknown',
                            inline: true
                        },
                        {
                            name: '👥 Users',
                            value: `${channel.members.size}/${settings.userLimit || '∞'}`,
                            inline: true
                        },
                        {
                            name: '🔒 Status',
                            value: settings.locked ? 'Locked' : 'Unlocked',
                            inline: true
                        }
                    )
                    .setColor(0x2F3136);
                
                await interaction.reply({ embeds: [infoEmbed], flags: 64 });
                break;
                
            case 'help':
                // Show help information
                const helpEmbed = new (require('discord.js').EmbedBuilder)()
                    .setTitle('🎮 Voice Bot - All Commands')
                    .setDescription('All available prefix commands with `.v`')
                    .addFields(
                        {
                            name: '⚙️ Setup Commands (Admin Only)',
                            value: '`.v set-role <role>` - Setup VIP Role\n`.v check` - Check Server Setup\n`.v setup` - Create Temporary Voice Channel',
                            inline: false
                        },
                        {
                            name: '🎯 Voice Channel Commands',
                            value: '`.v panel` - Show Bot Panel\n`.v vcinfo` - Show Voice Channel Info\n`.v permit <user>` - Give user access\n`.v reject <user>` - Remove user access\n`.v lock/unlock` - Lock/Unlock channel',
                            inline: false
                        },
                        {
                            name: '🔧 Channel Management',
                            value: '`.v owner` - Show current channel owner\n`.v transfer <user>` - Transfer ownership\n`.v clear [number]` - Delete recent messages\n`.v name <new name>` - Change channel name\n`.v limit <number>` - Set user limit\n`.v claim` - Claim ownership',
                            inline: false
                        }
                    )
                    .setColor(0x2F3136)
                    .setFooter({ 
                        text: 'Uranus | Voice Channel Manager',
                        iconURL: interaction.guild.iconURL()
                    });
                
                await interaction.reply({ embeds: [helpEmbed], flags: 64 });
                break;
                
            case 'permit':
                await interaction.showModal(controlPanel.createPermitModal(channelId));
                break;
                
            case 'disconnect':
                const disconnected = await channelManager.disconnectAll(channel);
                await interaction.reply({ 
                    content: `❌ Disconnected ${disconnected} user(s).`, 
                    ephemeral: true 
                });
                break;
                
            case 'invite':
                const invite = await channelManager.createInvite(channel);
                if (invite) {
                    await interaction.reply({ 
                        content: `🔗 Invite link: ${invite.url}`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: '❌ Could not create invite.', 
                        ephemeral: true 
                    });
                }
                break;
                
            // New advanced controls
            case 'permit':
                await interaction.showModal(controlPanel.createPermitModal(channelId));
                break;
                
            case 'reject':
                await interaction.showModal(controlPanel.createRejectModal(channelId));
                break;
                
            case 'top':
                await channelManager.moveChannelToTop(channel);
                await interaction.reply({ content: '⬆️ Channel moved to top.', ephemeral: true });
                break;
                
            case 'fm':
                await channelManager.muteAllMembers(channel);
                await interaction.reply({ content: '🔇 All members muted.', ephemeral: true });
                break;
                
            case 'fum':
                await channelManager.unmuteAllMembers(channel);
                await interaction.reply({ content: '🔊 All members unmuted.', ephemeral: true });
                break;
                
            case 'mute':
                await interaction.showModal(controlPanel.createMuteModal(channelId));
                break;
                
            case 'unmute':
                await interaction.showModal(controlPanel.createUnmuteModal(channelId));
                break;
                
            case 'soonoff':
                await channelManager.toggleChannelActivity(channel, interaction.client);
                await interaction.reply({ content: '🎵 Sound activity toggled.', ephemeral: true });
                break;
                
            case 'activity':
                await channelManager.toggleUserActivity(channel, interaction.client);
                await interaction.reply({ content: '🎯 User activity toggled.', ephemeral: true });
                break;
                
            case 'camonoff':
                await channelManager.toggleCameraPermissions(channel, interaction.client);
                await interaction.reply({ content: '📹 Camera permissions toggled.', ephemeral: true });
                break;
                
            case 'permitrole':
                await interaction.showModal(controlPanel.createRolePermitModal(channelId));
                break;
                
            default:
                await interaction.reply({ 
                    content: '❌ Unknown action.', 
                    ephemeral: true 
                });
        }
    } catch (error) {
        console.error(`Error handling ${action} action:`, error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
}

async function handleModalSubmit(interaction) {
    const [action, modalType, channelId] = interaction.customId.split('_');
    const member = interaction.member;
    const channel = interaction.guild.channels.cache.get(channelId);
    
    if (!channel) {
        return await interaction.reply({
            content: '❌ Voice channel not found.',
            ephemeral: true
        });
    }
    
    // Check if user has permission to control this channel
    const hasPermission = channelManager.hasChannelPermission(member, channelId, interaction.client);
    
    if (!hasPermission) {
        return await interaction.reply({
            content: '❌ You don\'t have permission to control this channel.',
            ephemeral: true
        });
    }
    
    try {
        switch (action) {
            case 'rename':
                const newName = interaction.fields.getTextInputValue('channel_name');
                await channelManager.renameChannel(channel, newName);
                await interaction.reply({ content: `✏️ Channel renamed to "${newName}".`, ephemeral: true });
                await controlPanel.updateControlPanel(channel, interaction.client);
                break;
                
            case 'limit':
                const limitStr = interaction.fields.getTextInputValue('user_limit');
                const limit = parseInt(limitStr);
                
                if (isNaN(limit) || limit < 0 || limit > 99) {
                    return await interaction.reply({
                        content: '❌ Invalid user limit. Please enter a number between 0-99.',
                        ephemeral: true
                    });
                }
                
                await channelManager.setUserLimit(channel, limit, interaction.client);
                await interaction.reply({ 
                    content: `👥 User limit set to ${limit === 0 ? 'unlimited' : limit}.`, 
                    ephemeral: true 
                });
                await controlPanel.updateControlPanel(channel, interaction.client);
                break;
                
            case 'transfer':
                const newOwnerInput = interaction.fields.getTextInputValue('new_owner');
                let newOwner;
                
                // Try to find member by ID or username
                if (/^\d+$/.test(newOwnerInput)) {
                    newOwner = interaction.guild.members.cache.get(newOwnerInput);
                } else {
                    newOwner = interaction.guild.members.cache.find(m => 
                        m.user.username.toLowerCase() === newOwnerInput.toLowerCase() ||
                        m.displayName.toLowerCase() === newOwnerInput.toLowerCase()
                    );
                }
                
                if (!newOwner) {
                    return await interaction.reply({
                        content: '❌ User not found. Please check the username or ID.',
                        ephemeral: true
                    });
                }
                
                if (newOwner.id === member.id) {
                    return await interaction.reply({
                        content: '❌ You already own this channel.',
                        ephemeral: true
                    });
                }
                
                const transferred = await channelManager.transferChannel(channel, newOwner, interaction.client);
                if (transferred) {
                    await interaction.reply({ 
                        content: `🔄 Channel ownership transferred to ${newOwner.displayName}.`, 
                        ephemeral: true 
                    });
                    await controlPanel.updateControlPanel(channel, interaction.client);
                } else {
                    await interaction.reply({ 
                        content: '❌ Transfer not allowed.', 
                        ephemeral: true 
                    });
                }
                break;
                
            case 'permit':
                const targetUserInput = interaction.fields.getTextInputValue('target_user');
                const actionType = interaction.fields.getTextInputValue('action_type').toLowerCase();
                
                let targetUser;
                
                // Try to find member by ID or username
                if (/^\d+$/.test(targetUserInput.replace(/[<@!>]/g, ''))) {
                    targetUser = interaction.guild.members.cache.get(targetUserInput.replace(/[<@!>]/g, ''));
                } else {
                    targetUser = interaction.guild.members.cache.find(m => 
                        m.user.username.toLowerCase() === targetUserInput.toLowerCase() ||
                        m.displayName.toLowerCase() === targetUserInput.toLowerCase()
                    );
                }
                
                if (!targetUser) {
                    return await interaction.reply({
                        content: '❌ User not found. Please check the username or ID.',
                        flags: 64
                    });
                }
                
                if (actionType === 'permit') {
                    await channel.permissionOverwrites.edit(targetUser.id, {
                        Connect: true,
                        ViewChannel: true
                    });
                    await interaction.reply({ 
                        content: `✅ **${targetUser.displayName}** has been given access to the channel.`, 
                        flags: 64 
                    });
                } else if (actionType === 'reject') {
                    await channel.permissionOverwrites.edit(targetUser.id, {
                        Connect: false
                    });
                    // Move user out if they're in the channel
                    if (targetUser.voice.channel && targetUser.voice.channel.id === channelId) {
                        await targetUser.voice.disconnect();
                    }
                    await interaction.reply({ 
                        content: `❌ **${targetUser.displayName}** has been removed from the channel.`, 
                        flags: 64 
                    });
                } else {
                    await interaction.reply({
                        content: '❌ Invalid action. Please use "permit" or "reject".',
                        flags: 64
                    });
                }
                break;
                
            case 'permit':
                const permitUserInput = interaction.fields.getTextInputValue('target_user');
                let permitUser;
                
                // Try to find member by ID or username
                if (/^\d+$/.test(permitUserInput)) {
                    permitUser = interaction.guild.members.cache.get(permitUserInput);
                } else {
                    permitUser = interaction.guild.members.cache.find(m => 
                        m.user.username.toLowerCase() === permitUserInput.toLowerCase() ||
                        m.displayName.toLowerCase() === permitUserInput.toLowerCase()
                    );
                }
                
                if (!permitUser) {
                    return await interaction.reply({
                        content: '❌ User not found. Please check the username or ID.',
                        ephemeral: true
                    });
                }
                
                const permitted = await channelManager.permitMember(channel, permitUser);
                if (permitted) {
                    await interaction.reply({ 
                        content: `👥 ${permitUser.displayName} has been granted access to the channel.`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: '❌ Failed to permit user.', 
                        ephemeral: true 
                    });
                }
                break;
                
            case 'reject':
                const rejectUserInput = interaction.fields.getTextInputValue('target_user');
                let rejectUser;
                
                // Try to find member by ID or username
                if (/^\d+$/.test(rejectUserInput)) {
                    rejectUser = interaction.guild.members.cache.get(rejectUserInput);
                } else {
                    rejectUser = interaction.guild.members.cache.find(m => 
                        m.user.username.toLowerCase() === rejectUserInput.toLowerCase() ||
                        m.displayName.toLowerCase() === rejectUserInput.toLowerCase()
                    );
                }
                
                if (!rejectUser) {
                    return await interaction.reply({
                        content: '❌ User not found. Please check the username or ID.',
                        ephemeral: true
                    });
                }
                
                const rejected = await channelManager.rejectMember(channel, rejectUser);
                if (rejected) {
                    await interaction.reply({ 
                        content: `👥 ${rejectUser.displayName} has been denied access to the channel.`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: '❌ Failed to reject user.', 
                        ephemeral: true 
                    });
                }
                break;
                
            case 'mute':
                const muteUserInput = interaction.fields.getTextInputValue('target_user');
                let muteUser;
                
                // Try to find member by ID or username
                if (/^\d+$/.test(muteUserInput)) {
                    muteUser = interaction.guild.members.cache.get(muteUserInput);
                } else {
                    muteUser = interaction.guild.members.cache.find(m => 
                        m.user.username.toLowerCase() === muteUserInput.toLowerCase() ||
                        m.displayName.toLowerCase() === muteUserInput.toLowerCase()
                    );
                }
                
                if (!muteUser) {
                    return await interaction.reply({
                        content: '❌ User not found. Please check the username or ID.',
                        ephemeral: true
                    });
                }
                
                const muted = await channelManager.muteMember(channel, muteUser);
                if (muted) {
                    await interaction.reply({ 
                        content: `🔇 ${muteUser.displayName} has been muted.`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: '❌ Failed to mute user or user not in channel.', 
                        ephemeral: true 
                    });
                }
                break;
                
            case 'unmute':
                const unmuteUserInput = interaction.fields.getTextInputValue('target_user');
                let unmuteUser;
                
                // Try to find member by ID or username
                if (/^\d+$/.test(unmuteUserInput)) {
                    unmuteUser = interaction.guild.members.cache.get(unmuteUserInput);
                } else {
                    unmuteUser = interaction.guild.members.cache.find(m => 
                        m.user.username.toLowerCase() === unmuteUserInput.toLowerCase() ||
                        m.displayName.toLowerCase() === unmuteUserInput.toLowerCase()
                    );
                }
                
                if (!unmuteUser) {
                    return await interaction.reply({
                        content: '❌ User not found. Please check the username or ID.',
                        ephemeral: true
                    });
                }
                
                const unmuted = await channelManager.unmuteMember(channel, unmuteUser);
                if (unmuted) {
                    await interaction.reply({ 
                        content: `🎤 ${unmuteUser.displayName} has been unmuted.`, 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: '❌ Failed to unmute user or user not in channel.', 
                        ephemeral: true 
                    });
                }
                break;
                
            case 'permitrole':
                const roleName = interaction.fields.getTextInputValue('role_name');
                const permissionAction = interaction.fields.getTextInputValue('permission_action').toLowerCase();
                let targetRole;
                
                // Try to find role by ID or name
                if (/^\d+$/.test(roleName)) {
                    targetRole = interaction.guild.roles.cache.get(roleName);
                } else {
                    targetRole = interaction.guild.roles.cache.find(r => 
                        r.name.toLowerCase() === roleName.toLowerCase()
                    );
                }
                
                if (!targetRole) {
                    return await interaction.reply({
                        content: '❌ Role not found. Please check the role name or ID.',
                        ephemeral: true
                    });
                }
                
                if (!['permit', 'reject'].includes(permissionAction)) {
                    return await interaction.reply({
                        content: '❌ Invalid action. Please use "permit" or "reject".',
                        ephemeral: true
                    });
                }
                
                let roleResult;
                if (permissionAction === 'permit') {
                    roleResult = await channelManager.permitRole(channel, targetRole);
                    if (roleResult) {
                        await interaction.reply({ 
                            content: `👥 Role "${targetRole.name}" has been granted access to the channel.`, 
                            ephemeral: true 
                        });
                    }
                } else {
                    roleResult = await channelManager.rejectRole(channel, targetRole);
                    if (roleResult) {
                        await interaction.reply({ 
                            content: `👥 Role "${targetRole.name}" has been denied access to the channel.`, 
                            ephemeral: true 
                        });
                    }
                }
                
                if (!roleResult) {
                    await interaction.reply({ 
                        content: '❌ Failed to update role permissions.', 
                        ephemeral: true 
                    });
                }
                break;
                
            default:
                await interaction.reply({ 
                    content: '❌ Unknown modal action.', 
                    ephemeral: true 
                });
        }
    } catch (error) {
        console.error(`Error handling ${action} modal:`, error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
}
