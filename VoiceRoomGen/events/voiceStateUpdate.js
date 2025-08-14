const { Events } = require('discord.js');
const channelManager = require('../utils/channelManager.js');
const controlPanel = require('../utils/controlPanel.js');
const config = require('../config.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        try {
            const client = newState.client;
            
            // Handle user joining a voice channel
            if (newState.channelId && (!oldState.channelId || oldState.channelId !== newState.channelId)) {
                await handleUserJoin(newState, client);
            }
            
            // Handle user leaving a voice channel
            if (oldState.channelId && (!newState.channelId || oldState.channelId !== newState.channelId)) {
                await handleUserLeave(oldState, client);
            }
            
        } catch (error) {
            console.error('Error in voiceStateUpdate:', error);
        }
    }
};

async function handleUserJoin(voiceState, client) {
    const channel = voiceState.channel;
    const member = voiceState.member;
    
    // Check if user joined the trigger channel
    if (channel.name === config.voice.triggerChannelName) {
        try {
            // Create temporary voice channel
            const tempChannel = await channelManager.createTempChannel(member, channel.guild);
            
            if (tempChannel) {
                // Move user to their new voice channel
                await member.voice.setChannel(tempChannel);
                
                // Send control panel directly to the voice channel's chat
                setTimeout(async () => {
                    try {
                        await controlPanel.sendControlPanel(tempChannel, member);
                        console.log(`✅ Created temp channel for ${member.user.tag}: ${tempChannel.name}`);
                    } catch (error) {
                        console.error('Error sending control panel to voice channel:', error);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error creating temp channel:', error);
        }
    }
}

async function handleUserLeave(voiceState, client) {
    const channel = voiceState.channel;
    
    // Check if it's a temporary channel
    if (channel && client.tempChannels.has(channel.id)) {
        // Set timeout to delete empty channel
        setTimeout(async () => {
            try {
                // Fetch fresh channel data
                const freshChannel = await channel.fetch();
                
                // Check if channel is still empty
                if (freshChannel.members.size === 0) {
                    await channelManager.deleteTempChannel(freshChannel.id, client);
                    console.log(`🗑️ Deleted empty temp channel: ${freshChannel.name}`);
                }
            } catch (error) {
                // Channel might already be deleted
                if (error.code !== 10003) { // Unknown Channel error
                    console.error('Error checking/deleting empty channel:', error);
                }
            }
        }, config.voice.deleteDelay);
    }
}
