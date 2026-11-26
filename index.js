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
const checkChannelId = (process.env.CHECK_CHANNEL_ID || '').trim();

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

/** Edit these pools. Placeholders: {user} {username} {score} */
const WELCOME_BY_SCORE = {
  // 1–40
  low: [
    "Hey {user}, welcome to Zemuria! Mmhh, I kind of don't 'vibe' with the name if I'm using Nadia's words. **{score}** points.",
    "Welcome to Zemuria, {user}. That name is certainly... a choice. I'm giving it **{score}** points.",
    "{user} entered Zemuria! Not my favorite name, if I'm honest. Score: **{score}** points.",
  ],
  // 41–70
  mid: [
    "{user} just joined! Welcome to Zemuria! I approve of the name! Your name gets **{score}** points from me.",
    "Hey {user}, welcome to Zemuria! I like the sound of your name! **{score}** points.",
    "Welcome to Zemuria, {user}! The name is alright... I give it **{score}** points.",
  ],
  // 71–100
  high: [
    "Welcome to Zemuria, {user}! It's a cute name! **{score}** points!",
    "Hey {user}! Welcome! ...Oh! That's a nice name! I give it **{score}** points!",
    "Nadia, look! A new Imperial Picnic Front member! Welcome, {user}! As for the name, hmm... **{score}** points!",
  ],
  // 101–105
  legendary: [
    "Rufus, Rufus! {user} has entered Zemuria! Your name is as perfect as Lapis! **{score}** points!",
  ],
};

/** Sent after the welcome when CHECK_CHANNEL_ID is set. Placeholder: {channel} */
const CHECK_CHANNEL_MESSAGE = 'Be sure to go to the {channel} to get more informations about Zemuria!';

/** Placeholders: {user} {username} */
const BOOST_MESSAGES = [
  "{user} just boosted Zemuria! Rufus, we have a patron of the Imperial Picnic Front!",
  "Oh! {user} boosted the server! Thank you! Hm~ hm~ hm~. I can taste more sweets now~",
  "A boost from {user}! Nadia, look, someone actually likes it here!",
  "{user} boosted Zemuria! Swin, let's thank them together!",
];

/** Uncached members: only treat a very recent premiumSince as a new boost. */
const RECENT_BOOST_MS = 60 * 1000;

function poolForScore(score) {
  if (score <= 40) return WELCOME_BY_SCORE.low;
  if (score <= 70) return WELCOME_BY_SCORE.mid;
  if (score <= 100) return WELCOME_BY_SCORE.high;
  return WELCOME_BY_SCORE.legendary;
}

function templateForScore(score) {
  const pool = poolForScore(score);
  return pool[Math.floor(Math.random() * pool.length)];
}

function formatWelcome(template, member, score) {
  return template
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{score}', String(score));
}

function formatCheckChannel() {
  return CHECK_CHANNEL_MESSAGE.replaceAll('{channel}', `<#${checkChannelId}>`);
}

function formatBoost(template, member) {
  return template
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username);
}

function boostLine(member) {
  const template = BOOST_MESSAGES[Math.floor(Math.random() * BOOST_MESSAGES.length)];
  return formatBoost(template, member);
}

function startedBoosting(oldMember, newMember) {
  const premiumSince = newMember.premiumSince;
  if (!premiumSince || oldMember.premiumSince) return false;
  if (oldMember.partial && Date.now() - premiumSince.getTime() > RECENT_BOOST_MS) return false;
  return true;
}

async function sendToWelcomeChannels(member, lines) {
  for (const channelId of welcomeChannelIds) {
    try {
      const channel = await member.guild.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`Welcome channel ${channelId} not found or not text-based`);
        continue;
      }
      for (const line of lines) {
        await channel.send(line);
      }
    } catch (err) {
      console.error(`Failed to send message to ${channelId}:`, err);
    }
  }
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
  const lines = [formatWelcome(template, member, score)];
  if (checkChannelId) lines.push(formatCheckChannel());
  await sendToWelcomeChannels(member, lines);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (!startedBoosting(oldMember, newMember)) return;
  await sendToWelcomeChannels(newMember, [boostLine(newMember)]);
});

client.login(token);
