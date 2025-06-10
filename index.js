const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const CHANNEL_ID = '1381864670511501323';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

spotifyApi.setAccessToken(process.env.SPOTIFY_ACCESS_TOKEN);

const commands = [
  new SlashCommandBuilder()
    .setName('musique')
    .setDescription('Affiche la musique Spotify en cours')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log('Déploiement des commandes...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Commandes déployées.');
  } catch (error) {
    console.error('Erreur déploiement commandes:', error);
  }
}

client.once('ready', async () => {
  console.log(`Bot prêt: ${client.user.tag}`);
  await deployCommands();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
  if (interaction.channelId !== CHANNEL_ID) {
    if (interaction.isChatInputCommand()) {
      return interaction.reply({ content: "Commande interdite ici.", ephemeral: true });
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'musique') {
      try {
        const playback = await spotifyApi.getMyCurrentPlaybackState();
        if (!playback.body || !playback.body.is_playing) {
          return interaction.reply("Aucune musique en cours.");
        }

        const track = playback.body.item;
        const artists = track.artists.map(a => a.name).join(', ');

        const embed = {
          title: track.name,
          description: `Artiste(s) : ${artists}\nAlbum : ${track.album.name}`,
          thumbnail: { url: track.album.images[0].url },
          url: track.external_urls.spotify,
          color: 0x1DB954,
        };

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('refresh_spotify')
            .setLabel('Rafraîchir')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
      } catch {
        await interaction.reply({ content: "Erreur Spotify.", ephemeral: true });
      }
    }
  } else if (interaction.isButton()) {
    if (interaction.customId === 'refresh_spotify') {
      try {
        const playback = await spotifyApi.getMyCurrentPlaybackState();
        if (!playback.body || !playback.body.is_playing) {
          return interaction.update({ content: "Aucune musique en cours.", embeds: [], components: [] });
        }

        const track = playback.body.item;
        const artists = track.artists.map(a => a.name).join(', ');

        const embed = {
          title: track.name,
          description: `Artiste(s) : ${artists}\nAlbum : ${track.album.name}`,
          thumbnail: { url: track.album.images[0].url },
          url: track.external_urls.spotify,
          color: 0x1DB954,
        };

        await interaction.update({ embeds: [embed], components: [interaction.message.components[0]] });
      } catch {
        await interaction.update({ content: "Erreur Spotify.", embeds: [], components: [] });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
