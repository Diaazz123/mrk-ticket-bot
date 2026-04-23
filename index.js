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


// =====================
// 🤖 CLIENT (RICHTIG INITIALISIERT)
// =====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});


// =====================
// 🔐 TOKEN CHECK
// =====================
if (!process.env.TOKEN) {
    console.log("❌ TOKEN fehlt!");
    process.exit(1);
}


// =====================
// 🚀 READY
// =====================
client.once('ready', () => {
    console.log(`✅ Eingeloggt als ${client.user.tag}`);
});


// =====================
// 🎫 PANEL COMMAND
// =====================
client.on('messageCreate', async (message) => {

    if (message.author.bot) return;

    if (message.content === '!setup') {

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎫 MRK Ticket System')
            .setDescription(
                "Wähle eine Kategorie:\n\n" +
                "🛠️ Support\n🚨 Report\n📄 Bewerbung\n\n" +
                "⏱ Antwortzeit: wenige Minuten"
            )
            .setImage('https://cdn.discordapp.com/attachments/1475014971632124018/1496550680935141638/file_000000002a28724685e3c3850ebf6e16.png?ex=69eb9c6e&is=69ea4aee&hm=783e3137be45f238334e3602bec830681f9c6f96fdee1b47c5cfab56dd10e0b4&')
            .setFooter({ text: 'MRK Ticket System' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('🎫 Kategorie auswählen')
            .addOptions([
                { label: 'Support', value: 'support' },
                { label: 'Report', value: 'report' },
                { label: 'Bewerbung', value: 'bewerbung' }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
});


// =====================
// 🎫 INTERACTIONS (FIXED)
// =====================
client.on(Events.InteractionCreate, async interaction => {

    // =====================
    // DROPDOWN
    // =====================
    if (interaction.isStringSelectMenu()) {

        if (interaction.customId !== 'ticket_select') return;

        await interaction.deferReply({ ephemeral: true });

        const type = interaction.values[0];

        let categoryId = null;

        if (type === 'support') {
            categoryId = process.env.CATEGORY_SUPPORT_ID;
        }

        if (type === 'report') {
            categoryId = process.env.CATEGORY_REPORT_ID;
        }

        if (type === 'bewerbung') {
            categoryId = process.env.CATEGORY_BEWERBUNG_ID;
        }

        console.log("TYPE:", type);
        console.log("CATEGORY ID:", categoryId);

        if (!categoryId) {
            return interaction.editReply("❌ Kategorie ID fehlt (Railway prüfen)");
        }

        try {
            const channel = await interaction.guild.channels.create({
                name: `${type}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: categoryId,
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
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    },
                    {
                        id: process.env.SUPPORT_ROLE_ID,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    }
                ]
            });

            const closeBtn = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 Ticket schließen')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeBtn);

            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle('🎫 Ticket erstellt')
                        .setDescription(`👋 Hallo ${interaction.user}\nBeschreibe dein Anliegen.`)
                        .setImage('https://cdn.discordapp.com/attachments/1475014971632124018/1496550680935141638/file_000000002a28724685e3c3850ebf6e16.png?ex=69eb9c6e&is=69ea4aee&hm=783e3137be45f238334e3602bec830681f9c6f96fdee1b47c5cfab56dd10e0b4&')
                        .setFooter({ text: 'MRK Ticket System' })
                ],
                components: [row]
            });

            return interaction.editReply(`✅ Ticket erstellt: ${channel}`);

        } catch (err) {
            console.log("❌ ERROR:", err);
            return interaction.editReply("❌ Fehler beim Erstellen des Tickets");
        }
    }


    // =====================
    // CLOSE BUTTON
    // =====================
    if (interaction.isButton()) {

        if (interaction.customId === 'close_ticket') {

            const ownerId = interaction.channel.topic?.replace('owner:', '');
            const isOwner = interaction.user.id === ownerId;
            const isSupport = interaction.member.roles.cache.has(process.env.SUPPORT_ROLE_ID);

            if (!isOwner && !isSupport) {
                return interaction.reply({
                    content: '❌ Keine Rechte',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: '📝 Transcript wird erstellt...',
                ephemeral: true
            });

            const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);

            const file = await discordTranscripts.createTranscript(interaction.channel);

            if (logChannel) {
                await logChannel.send({
                    content: `📁 Ticket geschlossen: ${interaction.channel.name}`,
                    files: [file]
                });
            }

            setTimeout(() => {
                interaction.channel.delete();
            }, 3000);
        }
    }
});


// =====================
// 💥 ERROR HANDLING
// =====================
process.on("unhandledRejection", err => {
    console.log("❌ Error:", err);
});

process.on("uncaughtException", err => {
    console.log("❌ Crash:", err);
});


// =====================
// 🔑 LOGIN
// =====================
client.login(process.env.TOKEN);
