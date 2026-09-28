import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);

export const SAMPLE_RATE = 48000;
const SILENCE_THRESHOLD = 300;
const EDGE_PADDING = Math.round(SAMPLE_RATE * 0.04);

export async function listVoices() {
  const { stdout } = await run('say', ['-v', '?']);
  return stdout
    .split('\n')
    .map((line) => line.match(/^(.+?)\s{2,}([a-z]{2}_[A-Z0-9]+)\s+#\s*(.*)$/))
    .filter(Boolean)
    .map(([, name, locale, sample]) => ({ name: name.trim(), locale, sample }));
}

export async function resolveVoice(requested) {
  const voices = await listVoices();
  if (requested) {
    const match = voices.find((v) => v.name.toLowerCase() === requested.toLowerCase());
    if (!match) {
      throw new Error(`Voice "${requested}" is not installed. Run with --list-voices to see options.`);
    }
    return match.name;
  }
  const preferred = ['Samantha', 'Daniel', 'Alex'];
  const found = preferred.find((name) => voices.some((v) => v.name === name));
  return found ?? null;
}

// Cuts the silence `say` leaves at both ends so captions line up with speech.
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
  const textFile = path.join(workDir, `${id}.txt`);
  const aiffFile = path.join(workDir, `${id}.aiff`);
  fs.writeFileSync(textFile, text);

  const args = ['-f', textFile, '-o', aiffFile, '-r', String(rate)];
  if (voice) args.unshift('-v', voice);
  await run('say', args);

  const { stdout } = await run(
    'ffmpeg',
    ['-v', 'error', '-i', aiffFile, '-f', 's16le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-'],
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
