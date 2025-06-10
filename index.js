require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// --- Serveur Express pour gérer le callback Spotify ---
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("❌ Pas de code dans la requête.");

  res.send(`
    <h2>✅ Code Spotify reçu :</h2>
    <p>${code}</p>
    <p>Le bot va tenter d'échanger ce code contre un access token.</p>
  `);

  console.log("Code Spotify reçu:", code);

  await exchangeCodeForToken(code);
});

app.listen(port, () => {
  console.log(`Serveur Express lancé sur le port ${port}`);
});

// --- Bot Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot Discord connecté en tant que ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.channelId !== process.env.CHANNEL_ID) {
    return interaction.reply({ content: "❌ Ce bot ne fonctionne que dans le salon autorisé.", ephemeral: true });
  }

  if (interaction.customId === 'spotify_auth') {
    const authUrl =
      `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
      `&response_type=code&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}` +
      `&scope=user-read-playback-state user-modify-playback-state`;

    await interaction.reply({ content: `👉 [Connecte ton Spotify ici](${authUrl})`, ephemeral: true });
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.author.bot) return;

  if (message.content.toLowerCase() === '!spotify') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('spotify_auth')
          .setLabel('Connecter Spotify')
          .setStyle(ButtonStyle.Primary),
      );

    await message.channel.send({
      content: '🎵 Clique sur le bouton pour connecter Spotify :',
      components: [row]
    });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

// --- Fonction échange code vers access token ---
async function exchangeCodeForToken(code) {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.REDIRECT_URI);

    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('✅ Access token Spotify :', response.data.access_token);
    console.log('🔄 Refresh token Spotify :', response.data.refresh_token);

    // Ici tu peux enregistrer le token quelque part si tu veux
  } catch (error) {
    console.error('❌ Erreur échange token Spotify:', error.response?.data || error.message);
  }
}
