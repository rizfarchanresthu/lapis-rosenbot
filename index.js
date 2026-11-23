require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
} = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const welcomeChannelIds = (process.env.WELCOME_CHANNEL_IDS || process.env.WELCOME_CHANNEL_ID || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

if (welcomeChannelIds.length === 0) {
  console.error('Missing WELCOME_CHANNEL_IDS in .env (comma-separated channel IDs)');
  process.exit(1);
}

/** Deterministic name score from username (same name → same score). Range: 1–105. */
function nameScore(username) {
  let hash = 0;
  for (const ch of username) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return (hash % 105) + 1;
}

/** Edit these templates. Placeholders: {user} {username} {score} */
const WELCOME_BY_SCORE = {
  // 1–40
  low: "Hey {username}, welcome to Zemuria! Mmhh, I kind of don't 'vibe' with the name. I give it **{score}** points.",
  // 41–70
  mid: "{user} just joined! Welcome to Zemuria! I approve of the name! Your name gets **{score}** points from me.",
  // 71–105
  high: "Welcome to Zemuria, {user}! It's a cute name! I give your name **{score}** points.",
};

function templateForScore(score) {
  if (score <= 40) return WELCOME_BY_SCORE.low;
  if (score <= 70) return WELCOME_BY_SCORE.mid;
  return WELCOME_BY_SCORE.high;
}

function formatWelcome(template, member, score) {
  return template
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{score}', String(score));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
  const score = nameScore(member.user.username);
  const template = templateForScore(score);
  const content = formatWelcome(template, member, score);

  for (const channelId of welcomeChannelIds) {
    try {
      const channel = await member.guild.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`Welcome channel ${channelId} not found or not text-based`);
        continue;
      }
      await channel.send(content);
    } catch (err) {
      console.error(`Failed to send welcome message to ${channelId}:`, err);
    }
  }
});

client.login(token);
