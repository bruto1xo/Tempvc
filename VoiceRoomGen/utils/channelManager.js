const { PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config.js');

class ChannelManager {
    
    /**
     * Create a temporary voice channel for a user
     */
    async createTempChannel(member, guild) {
        try {
            // Find or create the category
            let category = guild.channels.cache.find(c => 
                c.type === ChannelType.GuildCategory && 
                c.name === config.voice.tempChannelCategory
            );
            
            if (!category) {
                category = await guild.channels.create({
                    name: config.voice.tempChannelCategory,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
                        }
                    ]
                });
            }
            
            // Generate channel name
            const channelName = config.voice.defaultChannelName.replace('{username}', member.displayName);
            
            // Create the voice channel
            const tempChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: category.id,
                userLimit: config.voice.defaultUserLimit,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.ManageRoles,
                            PermissionFlagsBits.MuteMembers,
                            PermissionFlagsBits.DeafenMembers,
                            PermissionFlagsBits.MoveMembers
                        ]
                    }
                ]
            });
            
            // Store channel data
            member.client.tempChannels.set(tempChannel.id, {
                ownerId: member.id,
                createdAt: Date.now(),
                guildId: guild.id
            });
            
            member.client.channelOwners.set(tempChannel.id, member.id);
            member.client.channelSettings.set(tempChannel.id, {
                locked: false,
                hidden: false,
                userLimit: config.voice.defaultUserLimit
            });
            
            return tempChannel;
            
        } catch (error) {
            console.error('Error creating temp channel:', error);
            return null;
        }
    }
    
    /**
     * Delete a temporary channel
     */
    async deleteTempChannel(channelId, client) {
        try {
            const channel = await client.channels.fetch(channelId);
            
            if (channel) {
                await channel.delete('Empty temporary voice channel');
            }
            
            // Clean up data
            client.tempChannels.delete(channelId);
            client.channelOwners.delete(channelId);
            client.channelSettings.delete(channelId);
            
        } catch (error) {
            // Channel might already be deleted
            if (error.code !== 10003) {
                console.error('Error deleting temp channel:', error);
            }
        }
    }
    
    /**
     * Check if user has permission to control a channel
     */
    hasChannelPermission(member, channelId, client) {
        const ownerId = client.channelOwners.get(channelId);
        return ownerId === member.id || member.permissions.has(PermissionFlagsBits.Administrator);
    }
    
    /**
     * Lock a voice channel
     */
    async lockChannel(channel, client) {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            Connect: false
        });
        
        const settings = client.channelSettings.get(channel.id) || {};
        settings.locked = true;
        client.channelSettings.set(channel.id, settings);
    }
    
    /**
     * Unlock a voice channel
     */
    async unlockChannel(channel, client) {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            Connect: true
        });
        
        const settings = client.channelSettings.get(channel.id) || {};
        settings.locked = false;
        client.channelSettings.set(channel.id, settings);
    }
    
    /**
     * Hide a voice channel
     */
    async hideChannel(channel, client) {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            ViewChannel: false
        });
        
        const settings = client.channelSettings.get(channel.id) || {};
        settings.hidden = true;
        client.channelSettings.set(channel.id, settings);
    }
    
    /**
     * Unhide a voice channel
     */
    async unhideChannel(channel, client) {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            ViewChannel: true
        });
        
        const settings = client.channelSettings.get(channel.id) || {};
        settings.hidden = false;
        client.channelSettings.set(channel.id, settings);
    }
    
    /**
     * Rename a voice channel
     */
    async renameChannel(channel, newName) {
        await channel.setName(newName);
    }
    
    /**
     * Set user limit for a voice channel
     */
    async setUserLimit(channel, limit, client) {
        await channel.setUserLimit(limit);
        
        const settings = client.channelSettings.get(channel.id) || {};
        settings.userLimit = limit;
        client.channelSettings.set(channel.id, settings);
    }
    
    /**
     * Claim an abandoned channel
     */
    async claimChannel(channel, member, client) {
        const currentOwnerId = client.channelOwners.get(channel.id);
        
        // Check if current owner is still in the channel
        const currentOwner = channel.members.get(currentOwnerId);
        
        if (!currentOwner && config.permissions.allowClaim) {
            // Transfer ownership
            client.channelOwners.set(channel.id, member.id);
            
            // Update permissions
            await channel.permissionOverwrites.edit(member.id, {
                ManageChannels: true,
                ManageRoles: true,
                MuteMembers: true,
                DeafenMembers: true,
                MoveMembers: true
            });
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Transfer channel ownership
     */
    async transferChannel(channel, newOwner, client) {
        if (!config.permissions.allowTransfer) {
            return false;
        }
        
        // Remove permissions from old owner
        const oldOwnerId = client.channelOwners.get(channel.id);
        if (oldOwnerId) {
            await channel.permissionOverwrites.delete(oldOwnerId);
        }
        
        // Set new owner
        client.channelOwners.set(channel.id, newOwner.id);
        
        // Grant permissions to new owner
        await channel.permissionOverwrites.edit(newOwner.id, {
            ManageChannels: true,
            ManageRoles: true,
            MuteMembers: true,
            DeafenMembers: true,
            MoveMembers: true
        });
        
        return true;
    }
    
    /**
     * Disconnect all users from channel
     */
    async disconnectAll(channel) {
        let disconnectedCount = 0;
        
        for (const [memberId, member] of channel.members) {
            try {
                await member.voice.disconnect();
                disconnectedCount++;
            } catch (error) {
                console.error(`Error disconnecting ${member.user.tag}:`, error);
            }
        }
        
        return disconnectedCount;
    }
    
    /**
     * Create an invite for the channel
     */
    async createInvite(channel) {
        try {
            return await channel.createInvite({
                maxAge: 3600, // 1 hour
                maxUses: 10,
                unique: true
            });
        } catch (error) {
            console.error('Error creating invite:', error);
            return null;
        }
    }
    
    /**
     * Move channel to top of category
     */
    async moveChannelToTop(channel) {
        try {
            await channel.setPosition(0);
        } catch (error) {
            console.error('Error moving channel to top:', error);
        }
    }
    
    /**
     * Mute all members in the channel
     */
    async muteAllMembers(channel) {
        let mutedCount = 0;
        
        for (const [memberId, member] of channel.members) {
            try {
                await member.voice.setMute(true);
                mutedCount++;
            } catch (error) {
                console.error(`Error muting ${member.user.tag}:`, error);
            }
        }
        
        return mutedCount;
    }
    
    /**
     * Unmute all members in the channel
     */
    async unmuteAllMembers(channel) {
        let unmutedCount = 0;
        
        for (const [memberId, member] of channel.members) {
            try {
                await member.voice.setMute(false);
                unmutedCount++;
            } catch (error) {
                console.error(`Error unmuting ${member.user.tag}:`, error);
            }
        }
        
        return unmutedCount;
    }
    
    /**
     * Mute specific member
     */
    async muteMember(channel, targetMember) {
        try {
            if (targetMember.voice.channel && targetMember.voice.channel.id === channel.id) {
                await targetMember.voice.setMute(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error muting member:', error);
            return false;
        }
    }
    
    /**
     * Unmute specific member
     */
    async unmuteMember(channel, targetMember) {
        try {
            if (targetMember.voice.channel && targetMember.voice.channel.id === channel.id) {
                await targetMember.voice.setMute(false);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error unmuting member:', error);
            return false;
        }
    }
    
    /**
     * Grant permissions to a specific member
     */
    async permitMember(channel, targetMember) {
        try {
            await channel.permissionOverwrites.edit(targetMember.id, {
                Connect: true,
                Speak: true,
                ViewChannel: true
            });
            return true;
        } catch (error) {
            console.error('Error permitting member:', error);
            return false;
        }
    }
    
    /**
     * Deny permissions to a specific member
     */
    async rejectMember(channel, targetMember) {
        try {
            await channel.permissionOverwrites.edit(targetMember.id, {
                Connect: false,
                Speak: false
            });
            
            // Disconnect if currently in channel
            if (targetMember.voice.channel && targetMember.voice.channel.id === channel.id) {
                await targetMember.voice.disconnect();
            }
            
            return true;
        } catch (error) {
            console.error('Error rejecting member:', error);
            return false;
        }
    }
    
    /**
     * Toggle channel activity detection
     */
    async toggleChannelActivity(channel, client) {
        try {
            const settings = client.channelSettings.get(channel.id) || {};
            settings.activityDetection = !settings.activityDetection;
            client.channelSettings.set(channel.id, settings);
            return settings.activityDetection;
        } catch (error) {
            console.error('Error toggling channel activity:', error);
            return false;
        }
    }
    
    /**
     * Toggle user activity permissions
     */
    async toggleUserActivity(channel, client) {
        try {
            const settings = client.channelSettings.get(channel.id) || {};
            settings.userActivity = !settings.userActivity;
            client.channelSettings.set(channel.id, settings);
            
            // Update channel permissions based on setting
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                UseVAD: settings.userActivity
            });
            
            return settings.userActivity;
        } catch (error) {
            console.error('Error toggling user activity:', error);
            return false;
        }
    }
    
    /**
     * Toggle camera permissions for the channel
     */
    async toggleCameraPermissions(channel, client) {
        try {
            const settings = client.channelSettings.get(channel.id) || {};
            settings.cameraAllowed = !settings.cameraAllowed;
            client.channelSettings.set(channel.id, settings);
            
            // Update channel permissions based on setting
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                Stream: settings.cameraAllowed
            });
            
            return settings.cameraAllowed;
        } catch (error) {
            console.error('Error toggling camera permissions:', error);
            return false;
        }
    }
    
    /**
     * Grant role-based permissions
     */
    async permitRole(channel, role) {
        try {
            await channel.permissionOverwrites.edit(role.id, {
                Connect: true,
                Speak: true,
                ViewChannel: true
            });
            return true;
        } catch (error) {
            console.error('Error permitting role:', error);
            return false;
        }
    }
    
    /**
     * Deny role-based permissions
     */
    async rejectRole(channel, role) {
        try {
            await channel.permissionOverwrites.edit(role.id, {
                Connect: false,
                Speak: false
            });
            return true;
        } catch (error) {
            console.error('Error rejecting role:', error);
            return false;
        }
    }
}

module.exports = new ChannelManager();
