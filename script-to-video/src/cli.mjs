#!/usr/bin/env node
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseScript } from './parse.mjs';
import { listVoices, resolveVoice, writeWav } from './tts.mjs';
import { buildTimeline } from './timeline.mjs';
import { enrichScenes } from './ai.mjs';
import { FORMATS, addAudio, renderVisuals } from './render.mjs';

const THEME_NAMES = ['midnight', 'sunset', 'forest', 'paper'];
const FPS = 30;

const HELP = `
Usage: make-video <script.txt> [options]

Options:
  --out <file>       Where to save the video (default: output/<script name>.mp4)
  --format <name>    vertical (9:16), horizontal (16:9) or square (default: vertical)
  --theme <name>     ${THEME_NAMES.join(', ')} (default: midnight)
  --voice <name>     macOS voice to narrate with (see --list-voices)
  --rate <number>    Speaking speed in words per minute (default: 175)
  --music <file>     Background music, played quietly under the voice
  --no-voice         Captions only, no narration
  --ai               Let Claude add a headline and emoji to each scene
                     (uses your Claude Code login, no API key)
  --list-voices      Show the voices installed on this Mac
  --help             Show this message
`;

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

function status(message) {
  process.stdout.write(`\r\x1b[K${message}`);
}

async function printVoices() {
  const voices = await listVoices();
  const novelty = /^(Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Albert|Fred|Junior|Kathy|Ralph)$/;
  console.log('\nVoices installed on this Mac:\n');
  for (const voice of voices.filter((v) => !novelty.test(v.name))) {
    console.log(`  ${voice.name.padEnd(28)} ${voice.locale}`);
  }
  console.log('\nMore natural voices can be downloaded in');
  console.log('System Settings > Accessibility > Spoken Content > System Voice > Manage Voices.\n');
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      format: { type: 'string' },
      theme: { type: 'string' },
      voice: { type: 'string' },
      rate: { type: 'string' },
      music: { type: 'string' },
      'no-voice': { type: 'boolean', default: false },
      ai: { type: 'boolean', default: false },
      'list-voices': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });

  if (values['list-voices']) return printVoices();
  if (values.help || positionals.length === 0) return console.log(HELP);

  const scriptFile = path.resolve(positionals[0]);
  if (!fs.existsSync(scriptFile)) fail(`Script not found: ${scriptFile}`);

  const script = parseScript(scriptFile);
  const settings = script.settings;

  const format = (values.format ?? settings.format ?? 'vertical').toLowerCase();
  if (!FORMATS[format]) fail(`Unknown format "${format}". Use vertical, horizontal or square.`);

  const theme = (values.theme ?? settings.theme ?? 'midnight').toLowerCase();
  if (!THEME_NAMES.includes(theme)) fail(`Unknown theme "${theme}". Use ${THEME_NAMES.join(', ')}.`);

  const rate = Number(values.rate ?? settings.rate ?? 175);
  if (!Number.isFinite(rate) || rate < 80 || rate > 400) fail('Rate must be between 80 and 400.');

  const music = values.music ? path.resolve(values.music) : settings.music;
  if (music && !fs.existsSync(music)) fail(`Music file not found: ${music}`);

  const withVoice = !values['no-voice'];
  const voice = withVoice ? await resolveVoice(values.voice ?? settings.voice) : null;

  const name = path.basename(scriptFile, path.extname(scriptFile));
  const output = path.resolve(values.out ?? path.join('output', `${name}.mp4`));
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'script-to-video-'));
  const started = Date.now();

  try {
    console.log(`\nScript:  ${path.basename(scriptFile)} (${script.scenes.length} scenes)`);
    console.log(`Format:  ${format} ${FORMATS[format].width}x${FORMATS[format].height}, theme ${theme}`);
    console.log(`Voice:   ${withVoice ? (voice ?? 'system default') : 'none'}\n`);

    let scenes = script.scenes;
    if (values.ai) {
      status('Asking Claude for headlines...');
      try {
        scenes = await enrichScenes(scenes);
        status('Headlines added by Claude\n');
      } catch (error) {
        status(`Skipped AI headlines (${error.message})\n`);
      }
    }

    const timeline = await buildTimeline(scenes, {
      voice,
      rate,
      withVoice,
      workDir,
      onProgress: (done, total) =>
        status(`${withVoice ? 'Recording narration' : 'Timing scenes'}: ${done}/${total}`),
    });
    status(`Narration ready (${timeline.totalDuration.toFixed(1)}s)\n`);

    let voiceFile = null;
    if (timeline.track) {
      voiceFile = path.join(workDir, 'voice.wav');
      writeWav(voiceFile, timeline.track);
    }

    status('Preparing renderer...');
    const visuals = await renderVisuals({
      scenes: timeline.scenes,
      totalDuration: timeline.totalDuration,
      format,
      theme,
      fps: FPS,
      workDir,
      onProgress: (progress) => status(`Rendering video: ${Math.round(progress * 100)}%`),
    });
    status('Video rendered\n');

    await addAudio({ visuals, voice: voiceFile, music, totalDuration: timeline.totalDuration, output });

    const seconds = ((Date.now() - started) / 1000).toFixed(0);
    const sizeMb = (fs.statSync(output).size / 1024 / 1024).toFixed(1);
    console.log(`\nDone in ${seconds}s: ${output} (${sizeMb} MB)\n`);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => fail(error.message));
