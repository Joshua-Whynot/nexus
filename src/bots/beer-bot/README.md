# Beer Bot 🍺

A simple Discord bot that tracks beer counts in a JSON file.

## Features

- Responds to `!beer` command in a specific Discord channel
- Increments a counter stored in `beer-count.json`
- Replies with current count and a cheers message

## Setup

1. **Create a Discord Bot**
   - Go to https://discord.com/developers/applications
   - Create a new application
   - Go to the "Bot" section and create a bot
   - Copy the bot token
   - Enable "Message Content Intent" in the bot settings

2. **Get Your Channel ID**
   - Enable Developer Mode in Discord (Settings > Advanced > Developer Mode)
   - Right-click the channel where you want the bot to work
   - Click "Copy Channel ID"

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Set `DISCORD_BOT_TOKEN` to your bot token
   - Set `BEER_CHANNEL_ID` to your channel ID

4. **Invite the Bot to Your Server**
   - Go to OAuth2 > URL Generator in the Discord Developer Portal
   - Select scopes: `bot`
   - Select permissions: `Send Messages`, `Read Messages/View Channels`, `Read Message History`
   - Copy the generated URL and open it in your browser to invite the bot

5. **Run the Application**
   ```bash
   npm run start:dev
   ```

## Usage

In the configured Discord channel, type:
```
!beer
```

The bot will reply with the current count and increment it by 1.

## Data Storage

Beer counts are stored in `beer-count.json` in the project root with the following structure:

```json
{
  "count": 5,
  "lastUpdated": "2026-07-13T12:34:56.789Z"
}
```
