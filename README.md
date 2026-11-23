# Lapis Bot

Discord.js welcome bot that greets new members with a custom message and a **username-seeded name score (1–105)**. The same username always gets the same score.

## Requirements

- Node.js 18+ (20 LTS recommended on the VPS)
- A Discord bot token
- One or more text channel IDs for welcomes

## Discord setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Open the **Bot** tab → **Add Bot** → copy the token (this is `DISCORD_TOKEN`).
3. Under **Privileged Gateway Intents**, enable **Server Members Intent** (required for join events).
4. Open **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot permissions: `View Channels`, `Send Messages`, `Read Message History`
5. Open the generated invite URL, pick your server, and authorize.
6. In Discord, enable Developer Mode (User Settings → Advanced), right-click each welcome channel → **Copy Channel ID**. Put them in `.env` as `WELCOME_CHANNEL_IDS` (comma-separated).
7. Ensure the bot’s role can see and send messages in **both** channels.

## Local / first run

```bash
cp .env.example .env
# Edit .env and set DISCORD_TOKEN and WELCOME_CHANNEL_IDS

npm install
npm start
```

You should see `Logged in as YourBot#1234`. Join with a test account (or kick/rejoin yourself) to verify the welcome message.

### Customize welcome messages

Edit `WELCOME_BY_SCORE` and the thresholds in `templateForScore()` in [`index.js`](index.js).

| Score range | Key  | Tone (default)   |
|-------------|------|------------------|
| 1–40        | low  | doesn't vibe     |
| 41–70       | mid  | approves         |
| 71–105      | high | cute name        |

Placeholders:

| Placeholder   | Meaning                          |
|---------------|----------------------------------|
| `{user}`      | Mention (`@username`)            |
| `{username}`  | Plain username                   |
| `{score}`     | Name score from 1 to 105         |

## Host 24/7 on your Ubuntu VPS (PM2)

### 1. Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should show v20.x
```

### 2. Install PM2

```bash
sudo npm install -g pm2
```

### 3. Deploy the bot

```bash
# Example: clone or upload the project, then:
cd /path/to/lapis-bot
npm install
cp .env.example .env
nano .env   # set DISCORD_TOKEN and WELCOME_CHANNEL_ID
```

### 4. Start with PM2

```bash
pm2 start index.js --name lapis-bot
# or: npm run pm2:start
```

### 5. Survive reboot

```bash
pm2 save
pm2 startup
# Run the command PM2 prints (sudo env PATH=... pm2 startup systemd -u <user> --hp <home>)
pm2 save
```

### 6. Day-to-day ops

```bash
pm2 status
pm2 logs lapis-bot
pm2 restart lapis-bot
pm2 stop lapis-bot
```

After code updates on the VPS:

```bash
cd /path/to/lapis-bot
git pull          # if you use git
npm install       # if dependencies changed
pm2 restart lapis-bot
```

## How the name score works

The score is **not** random per join. A simple hash of the Discord username is mapped into `1..105`, so the same username always produces the same score.
