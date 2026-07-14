# Beer Bot Setup Instructions

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Create your `.env` file**:
   - Copy `.env.example` to `.env`
   - Fill in your Discord bot token and channel ID

3. **Get your Discord Bot Token**:
   - Visit https://discord.com/developers/applications
   - Create a new application (or use existing)
   - Go to "Bot" section → Create/Reset token
   - **Important**: Enable "Message Content Intent" in Bot settings
   - Copy the token to `.env` as `DISCORD_BOT_TOKEN`

4. **Get your Channel ID**:
   - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
   - Right-click the channel where you want beer tracking
   - Click "Copy Channel ID"
   - Paste into `.env` as `BEER_CHANNEL_ID`

5. **Invite the bot to your server**:
   - In Discord Developer Portal → OAuth2 → URL Generator
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Read Message History`
   - Copy the URL and open in browser to invite

6. **Run the bot**:
   ```bash
   npm run start:dev
   ```

7. **Test it**:
   - Go to your configured channel in Discord
   - Type: `!beer`
   - Bot should reply with the count!

## File Structure

- `/src/bots/beer-bot/beer-bot.service.ts` - Main bot logic
- `/src/bots/beer-bot/beer-bot.module.ts` - NestJS module
- `/beer-count.json` - Persistent storage for beer count

## Troubleshooting

- **Bot doesn't respond**: Check that Message Content Intent is enabled
- **Bot not online**: Verify your bot token is correct in `.env`
- **Wrong channel**: Make sure `BEER_CHANNEL_ID` matches your channel
