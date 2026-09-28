import { SAMPLE_RATE, synthesize } from './tts.mjs';

const SCENE_LEAD = 0.35;
const SCENE_TAIL = 0.45;
const SENTENCE_GAP = 0.18;
const SILENT_SCENE_SECONDS = 3;
const SILENT_WORDS_PER_SECOND = 2.6;
const CAPTION_MAX_WORDS = 4;
const CAPTION_MAX_CHARS = 24;

function splitSentences(text) {
  return text
    .split(/(?<=[.!?।…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// `say` gives no word timings, so spread the sentence's duration across its
// words by length, with extra time where punctuation makes the voice pause.
function timeWords(sentence, start, duration) {
  const words = sentence.split(/\s+/).filter(Boolean);
  const weights = words.map((word) => {
    const letters = word.replace(/[^\p{L}\p{N}]/gu, '').length;
    const pause = /[,;:]$/.test(word) ? 3 : /[.!?।…]$/.test(word) ? 1 : 0;
    return letters + 2 + pause;
  });
  const total = weights.reduce((a, b) => a + b, 0);

  let cursor = start;
  return words.map((text, i) => {
    const length = (weights[i] / total) * duration;
    const word = { text, start: cursor, end: cursor + length };
    cursor += length;
    return word;
  });
}

function groupCaptions(words) {
  const captions = [];
  let current = [];
  let chars = 0;

  const flush = () => {
    if (current.length === 0) return;
    captions.push({ start: current[0].start, end: current.at(-1).end, words: current });
    current = [];
    chars = 0;
  };

  for (const word of words) {
    const tooLong = chars + word.text.length > CAPTION_MAX_CHARS;
    if (current.length > 0 && (current.length >= CAPTION_MAX_WORDS || tooLong)) flush();
    current.push(word);
    chars += word.text.length + 1;
    if (/[,;:.!?।…]$/.test(word.text)) flush();
  }
  flush();
  return captions;
}

// Returns scene timings (in seconds) and the full narration track.
export async function buildTimeline(scenes, { voice, rate, withVoice, workDir, onProgress }) {
  const placements = [];
  const timed = [];
  let t = 0;

  for (const [index, scene] of scenes.entries()) {
    const start = t;
    const captions = [];
    const sentences = splitSentences(scene.narration);

    if (sentences.length === 0) {
      t += SILENT_SCENE_SECONDS;
    } else {
      t += SCENE_LEAD;
      for (const [n, sentence] of sentences.entries()) {
        let duration;
        if (withVoice) {
          const samples = await synthesize(sentence, { voice, rate, workDir, id: `s${index}-${n}` });
          placements.push({ offset: Math.round(t * SAMPLE_RATE), samples });
          duration = samples.length / SAMPLE_RATE;
        } else {
          const wordCount = sentence.split(/\s+/).length;
          duration = Math.max(1.2, wordCount / SILENT_WORDS_PER_SECOND);
        }
        captions.push(...groupCaptions(timeWords(sentence, t, duration)));
        t += duration + SENTENCE_GAP;
      }
      t += SCENE_TAIL - SENTENCE_GAP;
    }

    t += scene.pause;
    timed.push({ ...scene, start, end: t, captions });
    onProgress?.(index + 1, scenes.length);
  }

  let track = null;
  if (withVoice) {
    track = new Int16Array(Math.ceil(t * SAMPLE_RATE));
    for (const { offset, samples } of placements) track.set(samples, offset);
  }

  return { scenes: timed, totalDuration: t, track };
}
