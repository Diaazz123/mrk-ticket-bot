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
// 🤖 CLIENT
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
// 🚀 READY
// =====================
client.once('ready', () => {
    console.log(`✅ Eingeloggt als ${client.user.tag}`);
});


// =====================
// 🎫 PANEL
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
            .setImage('https://i.imgur.com/9Y2g3Qb.png')
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
// 🎫 INTERACTIONS (DEBUG VERSION)
// =====================
client.on(Events.InteractionCreate, async interaction => {

    // =====================
    // DROPDOWN DEBUG
    // =====================
    if (interaction.isStringSelectMenu()) {

        if (interaction.customId !== 'ticket_select') return;

        await interaction.deferReply({ ephemeral: true });

        const type = interaction.values[0];

        console.log("👉 TICKET TYPE:", type);

        let categoryId = null;

        if (type === 'support') categoryId = process.env.CATEGORY_SUPPORT_ID;
        if (type === 'report') categoryId = process.env.CATEGORY_REPORT_ID;
        if (type === 'bewerbung') categoryId = process.env.CATEGORY_BEWERBUNG_ID;

        console.log("👉 CATEGORY ID:", categoryId);

        // 🔴 WICHTIG: HIER sehen wir sofort ob Problem existiert
        if (!categoryId) {
            return interaction.editReply("❌ CATEGORY ID fehlt (Railway Variables prüfen)");
        }

        try {

            console.log("👉 VERSUCHE CHANNEL ZU ERSTELLEN...");

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

            console.log("✅ CHANNEL ERSTELLT:", channel.id);

            return interaction.editReply(`✅ Ticket erstellt: ${channel}`);

        } catch (err) {

            // 🔥 DAS IST DER WICHTIGSTE TEIL
            console.log("❌ FULL ERROR START");
            console.log(err);
            console.log("👉 CATEGORY:", categoryId);
            console.log("👉 TYPE:", type);
            console.log("❌ FULL ERROR END");

            return interaction.editReply("❌ Fehler beim Erstellen (siehe Konsole)");
        }
    }
});


// =====================
// LOGIN
// =====================
client.login(process.env.TOKEN);
