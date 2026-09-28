import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);

export const SAMPLE_RATE = 48000;
const SILENCE_THRESHOLD = 300;
const EDGE_PADDING = Math.round(SAMPLE_RATE * 0.04);
const NORMAL_RATE = 175;

// Kokoro is an open-source voice model (Apache 2.0) that runs on this computer.
const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
export const DEFAULT_VOICE = 'af_heart';
export const NATURAL_VOICES = [
  { name: 'af_heart', about: 'American woman, warm and friendly' },
  { name: 'af_bella', about: 'American woman, bright and lively' },
  { name: 'af_nicole', about: 'American woman, soft and calm' },
  { name: 'af_sarah', about: 'American woman, clear' },
  { name: 'af_nova', about: 'American woman, young' },
  { name: 'am_puck', about: 'American man, playful' },
  { name: 'am_michael', about: 'American man, warm' },
  { name: 'am_fenrir', about: 'American man, deep' },
  { name: 'bf_emma', about: 'British woman, gentle' },
  { name: 'bf_isabella', about: 'British woman, clear' },
  { name: 'bm_george', about: 'British man, storyteller' },
  { name: 'bm_fable', about: 'British man, expressive' },
];
const KOKORO_NAME = /^[ab][fm]_[a-z]+$/;

export async function listVoices() {
  const { stdout } = await run('say', ['-v', '?']);
  return stdout
    .split('\n')
    .map((line) => line.match(/^(.+?)\s{2,}([a-z]{2}_[A-Z0-9]+)\s+#\s*(.*)$/))
    .filter(Boolean)
    .map(([, name, locale, sample]) => ({ name: name.trim(), locale, sample }));
}

// Returns { engine: 'kokoro' | 'mac', name }.
export async function resolveVoice(requested) {
  const name = requested ?? DEFAULT_VOICE;
  if (KOKORO_NAME.test(name.toLowerCase())) return { engine: 'kokoro', name: name.toLowerCase() };

  const voices = await listVoices();
  const match = voices.find((v) => v.name.toLowerCase() === name.toLowerCase());
  if (!match) {
    throw new Error(`Voice "${name}" is not available. Run with --list-voices to see options.`);
  }
  return { engine: 'mac', name: match.name };
}

let kokoro = null;
function loadKokoro() {
  // The model (about 90 MB) is downloaded once, then loaded from disk.
  kokoro ??= import('kokoro-js').then(({ KokoroTTS }) =>
    KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype: 'q8', device: 'cpu' }),
  );
  return kokoro;
}

async function speakWithKokoro(text, voice, rate, file) {
  const tts = await loadKokoro();
  if (!tts.voices[voice]) throw new Error(`Voice "${voice}" is not available. Run with --list-voices.`);
  const speed = Math.min(1.5, Math.max(0.6, rate / NORMAL_RATE));
  const audio = await tts.generate(text, { voice, speed });
  await audio.save(file);
}

async function speakWithMac(text, voice, rate, file, textFile) {
  fs.writeFileSync(textFile, text);
  await run('say', ['-v', voice, '-f', textFile, '-o', file, '-r', String(rate)]);
}

// Cuts the silence left at both ends so captions line up with speech.
function trimSilence(samples) {
  let start = 0;
  let end = samples.length - 1;
  while (start < samples.length && Math.abs(samples[start]) < SILENCE_THRESHOLD) start++;
  while (end > start && Math.abs(samples[end]) < SILENCE_THRESHOLD) end--;
  if (start >= end) return samples;
  return samples.subarray(
    Math.max(0, start - EDGE_PADDING),
    Math.min(samples.length, end + EDGE_PADDING),
  );
}

// Speaks `text` and returns mono 16-bit PCM samples at SAMPLE_RATE.
export async function synthesize(text, { voice, rate, workDir, id }) {
  const spoken = path.join(workDir, voice.engine === 'kokoro' ? `${id}.wav` : `${id}.aiff`);
  if (voice.engine === 'kokoro') {
    await speakWithKokoro(text, voice.name, rate, spoken);
  } else {
    await speakWithMac(text, voice.name, rate, spoken, path.join(workDir, `${id}.txt`));
  }

  const { stdout } = await run(
    'ffmpeg',
    ['-v', 'error', '-i', spoken, '-f', 's16le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-'],
    { encoding: 'buffer', maxBuffer: 1024 * 1024 * 512 },
  );

  // Copy first: a Node Buffer can sit at an odd offset, which Int16Array rejects.
  const bytes = new Uint8Array(stdout);
  const samples = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
  return trimSilence(samples);
}

export function writeWav(file, samples) {
  const dataBytes = samples.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  fs.writeFileSync(file, Buffer.concat([header, Buffer.from(samples.buffer, samples.byteOffset, dataBytes)]));
}
