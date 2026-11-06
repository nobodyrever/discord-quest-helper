# Discord Quest Helper

A lightweight script designed to automate and complete Discord Quests (such as video-watching, game tracking, and activity tasks) directly from the browser developer console or Discord desktop app.

## ⚠️ Disclaimer
> Using scripts to automate actions on Discord may violate Discord's Terms of Service. Use this at your own risk.

## Features
- **Video Quests (`WATCH_VIDEO` / `WATCH_VIDEO_ON_MOBILE`):** Automatically spoofs video progress to complete tasks quickly.
- **Desktop Games (`PLAY_ON_DESKTOP`):** Spoofs running processes/games to fulfill desktop playtime requirements.
- **Streaming (`STREAM_ON_DESKTOP`):** Automatically injects mock stream metadata.
- **Activities (`PLAY_ACTIVITY`):** Sends heartbeats to complete party/activity quests.

## How to Use

1. Install **Discord PTB** (https://ptb.discord.com/).
2. Go to your **Quests** tab and click **Accept** on the quest you want to complete.
3. Open the Developer Console:
   - **Windows:** `Ctrl + Shift + I`
   - **Mac:** `Cmd + Option + I`
4. Go to the **Console** tab. *(Note: If Discord blocks pasting, type `allow pasting` and press Enter first).*
5. Copy the code from `script.js`, paste it into the console, and press **Enter**.

## Installation / Contribution
Feel free to fork this repository, submit issues, or create pull requests if Discord updates its internal architecture and the script requires patching.
