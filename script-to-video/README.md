# Script to Video

Turn a plain-text script into a narrated, captioned video. Everything runs on your Mac: no API keys, no credits, no uploads.

## Make a video

```bash
node src/cli.mjs examples/ocean-facts.txt
```

The video is saved to `output/ocean-facts.mp4`.

## Writing a script

A script is a text file. Each paragraph, separated by a blank line, becomes one scene.

```
title: Ocean Facts
format: vertical
theme: midnight
---

# 3 Ocean Facts That Sound Fake
[emoji: 🌊]

# Mostly unexplored
[image: photos/deep-sea.jpg]
More than eighty percent of the ocean has never been seen by human eyes.
```

| Line | What it does |
|---|---|
| `# Heading` | Large on-screen headline. A heading with no other text becomes a title card. |
| `[emoji: 🌊]` | Large emoji above the headline |
| `[image: file.jpg]` | Full-screen background image with a slow zoom (path is relative to the script) |
| `[pause: 1.5]` | Extra seconds of silence at the end of the scene |
| Anything else | Narration, spoken aloud and shown as captions |

The settings block at the top is optional. It ends with a `---` line and accepts `title`, `format`, `theme`, `voice`, `rate` and `music`.

## Options

| Option | What it does |
|---|---|
| `--format` | `vertical` (9:16), `horizontal` (16:9) or `square` |
| `--theme` | `midnight`, `sunset`, `forest` or `paper` |
| `--voice` | macOS voice to narrate with |
| `--rate` | Speaking speed in words per minute (default 175) |
| `--music` | Background music file, played quietly under the voice |
| `--no-voice` | Captions only, no narration |
| `--ai` | Claude writes a headline and picks an emoji for each scene |
| `--out` | Where to save the video |
| `--list-voices` | Show the voices installed on this Mac |

Options on the command line override the settings in the script.

## Voices

Run `node src/cli.mjs --list-voices` to see what is installed. Better-sounding voices (Premium and Enhanced) are a free download in **System Settings > Accessibility > Spoken Content > System Voice > Manage Voices**. Voices exist for many languages, so write the script in the language of the voice you choose.

## The `--ai` option

This runs `claude -p` using the Claude Code login on this machine, so it counts against your Claude plan and needs no API key. If Claude is unavailable, the video is made without the extra headlines.

## Requirements

- macOS (narration uses the built-in `say` command)
- Node.js 20 or newer
- ffmpeg (`brew install ffmpeg`)

The first render downloads a small headless browser used for drawing frames.

## Licence note

Rendering uses [Remotion](https://www.remotion.dev/license), which is free for individuals and for companies of up to three people. Larger companies need a Remotion licence.
