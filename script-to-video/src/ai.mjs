import { spawn } from 'node:child_process';
import os from 'node:os';

const TIMEOUT_MS = 120_000;

// Uses the Claude Code login on this machine (`claude -p`), so no API key is needed.
function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', '--output-format', 'json', '--model', 'haiku'], {
      cwd: os.tmpdir(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Claude took too long to respond'));
    }, TIMEOUT_MS);

    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim() || `claude exited with code ${code}`));
      try {
        resolve(JSON.parse(stdout).result);
      } catch {
        reject(new Error('Could not read the response from Claude'));
      }
    });

    child.stdin.end(prompt);
  });
}

// Fills in a short headline and an emoji for scenes that don't have them.
export async function enrichScenes(scenes) {
  const list = scenes.map((scene, i) => `${i + 1}. ${scene.narration}`).join('\n');
  const prompt = `You are styling a short narrated video. For each numbered scene below, write an on-screen headline (2 to 4 words, no ending punctuation, same language as the scene) and pick one emoji that fits it.

Reply with only a JSON array, one object per scene, in order: [{"headline": "...", "emoji": "..."}]

Scenes:
${list}`;

  const reply = await askClaude(prompt);
  const json = reply.match(/\[[\s\S]*\]/);
  if (!json) throw new Error('Claude did not return a scene list');

  const suggestions = JSON.parse(json[0]);
  return scenes.map((scene, i) => ({
    ...scene,
    heading: scene.heading ?? suggestions[i]?.headline ?? null,
    emoji: scene.emoji ?? suggestions[i]?.emoji ?? null,
  }));
}
