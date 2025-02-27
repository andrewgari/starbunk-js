# Starbunk Scripts

This directory contains utility scripts for the Starbunk project.

## Bot Validation Tool

The Bot Validation Tool allows you to test which bots would trigger on a given message. This is useful for debugging and testing bot responses.

### Usage

You can run the bot validation tool using npm:

```bash
npm run validate-bots
```

Or directly:

```bash
./scripts/validate-bots.sh
```

### How It Works

1. The script builds the project to ensure all TypeScript files are compiled
2. It loads all bots from the `src/starbunk/bots/reply-bots` directory
3. It creates a mock message with your input
4. It checks which bots would trigger on that message
5. It displays the results, including the bot name, response content, and avatar URL

### Example

```
Enter a message to test (or "exit" to quit): blue

=== Results ===
2 bot(s) would respond:

[1] BluBot
Response: Did somebody say Blu?
Avatar: https://imgur.com/WcBRCWn.png

[2] VennBot
Response: Oh no guys, it's in the other DPS now
Avatar: https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png
```

### Notes

- The tool uses mock Discord objects, so some bot behaviors that depend on specific Discord features might not work exactly as they would in a real Discord environment.
- Random responses will vary each time you run the tool.
- Some bots have special conditions (like time delays or user-specific triggers) that might not be fully simulated in this environment.
