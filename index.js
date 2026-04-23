require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    ChannelType,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    EmbedBuilder,
    Events
} = require('discord.js');

const discordTranscripts = require('discord-html-transcripts');

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const SUPPORT_ROLE_ID = process.env.SUPPORT_ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const CATEGORY_ID = process.env.CATEGORY_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.once('ready', () => {
    console.log(`✅ Eingeloggt als ${client.user.tag}`);
});


// =====================
// 🎛 MRK TICKET PANEL
// =====================
client.on('messageCreate', async (message) => {
    if (message.content === '!setup') {

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎫 MRK Ticket System')
            .setDescription(
                "```yaml\nWillkommen im MRK Support System\n```\n\n" +

                "📌 Wähle eine Kategorie:\n" +
                "🛠️ Support → Hilfe erhalten\n" +
                "🚨 Report → Spieler melden\n" +
                "📄 Bewerbung → Team Bewerbung\n\n" +

                "⏱ Antwortzeit: ~ 5–30 Min\n\n" +

                "⚠️ Bitte keine Spam Tickets erstellen!"
            )
            .setImage('https://cdn.discordapp.com/attachments/1475014971632124018/1496550680935141638/file_000000002a28724685e3c3850ebf6e16.png?ex=69eb9c6e&is=69ea4aee&hm=783e3137be45f238334e3602bec830681f9c6f96fdee1b47c5cfab56dd10e0b4&')
            .setThumbnail('https://cdn.discordapp.com/embed/avatars/0.png')
            .setFooter({ text: 'MRK Ticket System' })
            .setTimestamp();

        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('🎫 Kategorie auswählen')
            .addOptions([
                {
                    label: '🛠️ Support',
                    value: 'support'
                },
                {
                    label: '🚨 Report',
                    value: 'report'
                },
                {
                    label: '📄 Bewerbung',
                    value: 'bewerbung'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
});


// =====================
// 🎛 INTERACTIONS
// =====================
client.on(Events.InteractionCreate, async interaction => {

    // =====================
    // 🎫 DROPDOWN
    // =====================
    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === 'ticket_select') {

            const existing = interaction.guild.channels.cache.find(c =>
                c.topic === `owner:${interaction.user.id}`
            );

            if (existing) {
                return interaction.reply({
                    content: `❌ Du hast bereits ein Ticket: ${existing}`,
                    ephemeral: true
                });
            }

            const type = interaction.values[0];

            const channel = await interaction.guild.channels.create({
                name: `${type}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CATEGORY_ID,
                topic: `owner:${interaction.user.id}`,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages
                        ]
                    },
                    {
                        id: SUPPORT_ROLE_ID,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages
                        ]
                    }
                ]
            });

            const closeBtn = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 Schließen')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeBtn);

            // 💎 NICE WELCOME EMBED
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle('🎫 Ticket erstellt')
                        .setDescription(
                            `👋 Hallo ${interaction.user}, dein **Ticket wurde erfolgreich erstellt!**\n\n` +
                            `📌 **Kategorie:** \`${type}\`\n` +
                            `🕒 Bitte beschreibe dein Anliegen so genau wie möglich\n\n` +
                            `🔔 Unser Support-Team meldet sich in Kürze bei dir!`
                        )
                        .setThumbnail(interaction.user.displayAvatarURL())
                        .addFields(
                            {
                                name: '📁 Status',
                                value: '🟢 Offen',
                                inline: true
                            },
                            {
                                name: '👤 Erstellt von',
                                value: `${interaction.user.tag}`,
                                inline: true
                            }
                        )
                        .setFooter({ text: 'MRK Ticket System' })
                        .setTimestamp()
                ],
                components: [row]
            });

            await interaction.reply({
                content: `✅ Ticket erstellt: ${channel}`,
                ephemeral: true
            });
        }
    }


    // =====================
    // 🔘 BUTTON SYSTEM
    // =====================
    if (interaction.isButton()) {

        if (interaction.customId === 'close_ticket') {

            const ownerId = interaction.channel.topic?.replace('owner:', '');
            const isOwner = interaction.user.id === ownerId;
            const isSupport = interaction.member.roles.cache.has(SUPPORT_ROLE_ID);

            if (!isOwner && !isSupport) {
                return interaction.reply({
                    content: '❌ Keine Berechtigung.',
                    ephemeral: true
                });
            }

            const confirm = new ButtonBuilder()
                .setCustomId('confirm_close')
                .setLabel('✅ Schließen')
                .setStyle(ButtonStyle.Danger);

            const cancel = new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('❌ Abbrechen')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirm, cancel);

            await interaction.reply({
                content: 'Bist du sicher?',
                components: [row],
                ephemeral: true
            });
        }


        if (interaction.customId === 'confirm_close') {

            await interaction.reply({
                content: '📝 Erstelle Transcript...',
                ephemeral: true
            });

            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

            const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                limit: -1,
                fileName: `ticket-${interaction.channel.name}.html`
            });

            await logChannel.send({
                content: `📁 Transcript von ${interaction.channel.name}`,
                files: [attachment]
            });

            await interaction.channel.send('🔒 Ticket wird gelöscht...');

            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 3000);
        }


        if (interaction.customId === 'cancel_close') {
            await interaction.reply({
                content: 'Abgebrochen.',
                ephemeral: true
            });
        }
    }
});

client.login(TOKEN);