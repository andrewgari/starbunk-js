# Generate Personality

Distills a Discord user's message history into a complete CovaBot personality profile using Claude.

## What it does

1. Connects to a Discord server using `DISCORD_TOKEN` from env
2. Reads all text channels and collects messages from the target user (up to 2000 sampled across channels and time)
3. Sends the messages + any extra context to Claude Sonnet for analysis
4. Generates all 7 personality files: `profile.yml`, `core.md`, `speech.md`, `likes.md`, `dislikes.md`, `opinions.md`, `beliefs.md`
5. Writes them to `src/covabot/config/personalities/<output-dir>/`

## Required env vars

- `DISCORD_TOKEN` — bot token with READ_MESSAGE_HISTORY in the target server
- `ANTHROPIC_API_KEY` — for the personality generation call

## Privacy & Consent

> **Before running this script:**
> - Ensure you have permission from the target user and the server owner to collect and analyze their message history.
> - Avoid running this against private or DM channels where the user has a reasonable expectation of privacy.
> - Message content will be transmitted to a third-party LLM provider (Anthropic, Gemini, or OpenAI depending on which API key is set). Do not use this script on channels containing sensitive, confidential, or personally identifying information.

## Steps

Ask the user for the following if not already provided:

1. **Guild ID** — the Discord server ID (right-click server → Copy Server ID)
2. **User ID** — the Discord user ID to model (right-click user → Copy User ID)
3. **Display name** — what to call this personality (e.g. "Andrew")
4. **Output directory name** — folder name under `personalities/` (e.g. "andrew", kebab-case)
5. **Extra context** (optional) — anything to add beyond what the messages show (e.g. "He's a software engineer who plays JRPGs and has strong opinions about TypeScript")

Then run:

```bash
node scripts/generate-personality.mjs \
  --guild-id  <GUILD_ID> \
  --user-id   <USER_ID> \
  --name      "<DISPLAY_NAME>" \
  --output    <OUTPUT_DIR> \
  --extra     "<EXTRA_CONTEXT>"
```

After the script completes, show the user:
- What files were generated and their paths
- A brief summary of any notable choices Claude made (read `core.md` and call out anything that stands out)
- Remind them to review the files and copy to Unraid: `config/covabot/personalities/<output-dir>/`

## Post-generation review

Read the generated files and flag any issues:
- `profile.yml` — check that the YAML is valid and speech_patterns look reasonable for the person
- `core.md` — should feel specific and grounded, not generic
- `beliefs.md` — should have actual quirky/specific takes, not platitudes

Offer to refine any file if the user wants changes before copying to production.
