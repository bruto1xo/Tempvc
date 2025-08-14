const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");
const config = require("../config.js");

class ControlPanel {
    /**
     * Send the control panel to a voice channel
     */
    async sendControlPanel(channel, owner, voiceChannel = null) {
        try {
            const targetChannel = voiceChannel || channel;
            const embed = this.createControlEmbed(targetChannel, owner);
            const components = this.createControlButtons(targetChannel.id);

            // Send the control panel message
            const message = await channel.send({
                embeds: [embed],
                components: components,
            });

            return message;
        } catch (error) {
            console.error("Error sending control panel:", error);
            return null;
        }
    }

    /**
     * Send the control panel via DM
     */
    async sendControlPanelDM(voiceChannel, owner) {
        try {
            const embed = this.createControlEmbed(voiceChannel, owner);
            const components = this.createControlButtons(voiceChannel.id);

            // Send DM to the user
            const dmMessage = await owner.send({
                content: `🎮 **Control Panel for: ${voiceChannel.name}**\nUse \`.v panel\` in any text channel to get a new control panel.`,
                embeds: [embed],
                components: components,
            });

            return dmMessage;
        } catch (error) {
            console.error("Error sending control panel DM:", error);
            throw error;
        }
    }

    /**
     * Update an existing control panel
     */
    async updateControlPanel(channel, client) {
        try {
            // Find the control panel message
            const messages = await channel.messages.fetch({ limit: 10 });
            const controlMessage = messages.find(
                (msg) =>
                    msg.author.id === client.user.id &&
                    msg.embeds.length > 0 &&
                    msg.embeds[0].title?.includes("COMMANDS"),
            );

            if (controlMessage) {
                const owner = channel.guild.members.cache.get(
                    client.channelOwners.get(channel.id),
                );
                const embed = this.createControlEmbed(channel, owner);
                const components = this.createControlButtons(channel.id);

                await controlMessage.edit({
                    embeds: [embed],
                    components: components,
                });
            }
        } catch (error) {
            console.error("Error updating control panel:", error);
        }
    }

    /**
     * Create the control panel embed
     */
    createControlEmbed(channel, owner) {
        const settings = owner.client.channelSettings.get(channel.id) || {};

        const statusEmojis = {
            locked: settings.locked ? "🔒" : "🔓",
            hidden: settings.hidden ? "👁️‍🗨️" : "👁️",
            limit: settings.userLimit > 0 ? `👥 ${settings.userLimit}` : "👥 ∞",
        };

        return new EmbedBuilder()
            .setTitle("🎮 Uranus TAP COMMANDS")
            .setDescription(
                `**Channel Owner:** ${owner.displayName}\n**Current Users:** ${channel.members.size}`,
            )
            .addFields(
                {
                    name: "use the command : .v help.",
                    value: "to get more information about the commands.",
                    inline: true,
                },
                {
                    name: "🎯 Quick Actions",
                    value: "Use the buttons below to control your voice channel. Only the channel owner can use most controls.",
                    inline: false,
                },
            )
            .setImage(
                "https://images-ext-1.discordapp.net/external/zV68AdBNjO6cVeXim9gkXD0B2i50X1cMop4MJPqbWJc/https/cdn.discordapp.com/icons/1384077091519070229/eb373b05e4dd2b70c616d38f947219bd.webp?format=webp&width=120&height=120",
            )
            .setColor(config.controlPanel.embedColor)
            .setThumbnail(channel.guild.iconURL())
            .setFooter({
                text: "Uranus | Voice Channel Manager",
                iconURL: channel.guild.iconURL(),
            })
            .setTimestamp();
    }

    /**
     * Create control buttons - 4 buttons only: owner, vcinfo, help, permit/reject
     */
    createControlButtons(channelId) {
        // Single row with 4 essential buttons
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`owner_${channelId}`)
                .setLabel('OWNER')
                .setEmoji("👑")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`vcinfo_${channelId}`)
                .setLabel('VCINFO')
                .setEmoji("📊")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`help_${channelId}`)
                .setLabel('HELP')
                .setEmoji("❓")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`permit_${channelId}`)
                .setLabel('PERMIT/REJECT')
                .setEmoji("👥")
                .setStyle(ButtonStyle.Secondary)
        );

        return [row1];
    }

    /**
     * Create rename modal
     */
    createRenameModal(channelId) {
        return new ModalBuilder()
            .setCustomId(`rename_modal_${channelId}`)
            .setTitle("Rename Voice Channel")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("channel_name")
                        .setLabel("New Channel Name")
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(100)
                        .setPlaceholder("Enter new channel name...")
                        .setRequired(true),
                ),
            );
    }

    /**
     * Create user limit modal
     */
    createLimitModal(channelId) {
        return new ModalBuilder()
            .setCustomId(`limit_modal_${channelId}`)
            .setTitle("Set User Limit")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("user_limit")
                        .setLabel("User Limit (0 = No Limit)")
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(2)
                        .setPlaceholder("0-99")
                        .setRequired(true),
                ),
            );
    }

    /**
     * Create transfer modal
     */
    createTransferModal(channelId) {
        return new ModalBuilder()
            .setCustomId(`transfer_modal_${channelId}`)
            .setTitle("Transfer Channel Ownership")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("new_owner")
                        .setLabel("New Owner (Username or ID)")
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(100)
                        .setPlaceholder("Enter username or user ID...")
                        .setRequired(true),
                ),
            );
    }

    /**
     * Create permit/reject modal
     */
    createPermitModal(channelId) {
        return new ModalBuilder()
            .setCustomId(`permit_modal_${channelId}`)
            .setTitle("Permit/Reject User Access")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("target_user")
                        .setLabel("User (Username, ID, or @mention)")
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(100)
                        .setPlaceholder("Enter username, ID, or @mention...")
                        .setRequired(true),
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("action_type")
                        .setLabel("Action (permit/reject)")
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(10)
                        .setPlaceholder("permit or reject")
                        .setRequired(true),
                ),
            );
    }
}

module.exports = new ControlPanel();
