require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// --- Serveur Express pour gérer le callback Spotify ---
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("❌ Pas de code dans la requête.");

  // Ici tu peux appeler ta fonction pour échanger le code contre un token
  // Exemple simple pour afficher le code et inviter à l'utiliser ailleurs
  res.send(`
    <h2>✅ Code Spotify reçu :</h2>
    <p>${code}</p>
    <p>Utilise ce code dans ton bot pour obtenir un access token.</p>
  `);

  console.log("Code Spotify reçu:", code);

  // Exemple d’échange token (à compléter et appeler ici si tu veux)
  // await exchangeCodeForToken(code);
});

// Démarrer Express
app.listen(port, () => {
  console.log(`Serveur Express lancé sur le port ${port}`);
});

// --- Bot Discord ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Bot Discord connecté en tant que ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.channelId !== process.env.CHANNEL_ID) {
    return interaction.reply({ content: "Ce bot ne fonctionne que dans le salon autorisé.", ephemeral: true });
  }

  if (interaction.customId === 'spotify_auth') {
    const authUrl = 
      `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}` +
      `&response_type=code&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}` +
      `&scope=user-read-playback-state user-modify-playback-state`;

    await interaction.reply({ content: `Clique ici pour autoriser Spotify :\n${authUrl}`, ephemeral: true });
  }
});

// Commande simple pour envoyer un bouton d’auth Spotify dans le salon
client.on('messageCreate', async message => {
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

    await message.channel.send({ content: 'Clique sur le bouton pour connecter Spotify :', components: [row] });
  }
});

// Login Discord
client.login(process.env.DISCORD_BOT_TOKEN);

// --- Exemple fonction pour échanger le code contre un token (à compléter) ---
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

    console.log('Access token:', response.data.access_token);
    // Ici tu peux stocker tokens pour réutiliser
  } catch (error) {
    console.error('Erreur échange token Spotify:', error.response?.data || error.message);
  }
}
