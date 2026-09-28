import fs from 'node:fs';
import path from 'node:path';

const SETTING_KEYS = ['title', 'format', 'voice', 'rate', 'music', 'theme'];

// Settings block: `key: value` lines at the top of the file, closed by a `---` line.
function splitSettings(text) {
  const lines = text.split('\n');
  const end = lines.findIndex((l) => l.trim() === '---');
  if (end === -1) return { settings: {}, body: text };

  const settings = {};
  for (const line of lines.slice(0, end)) {
    if (!line.trim()) continue;
    const m = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.+?)\s*$/);
    if (!m || !SETTING_KEYS.includes(m[1].toLowerCase())) {
      return { settings: {}, body: text };
    }
    settings[m[1].toLowerCase()] = m[2];
  }
  return { settings, body: lines.slice(end + 1).join('\n') };
}

function parseScene(block, baseDir) {
  const scene = { heading: null, emoji: null, image: null, pause: 0, narration: '' };
  const spoken = [];

  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const heading = line.match(/^#+\s+(.+)$/);
    if (heading) {
      scene.heading = heading[1];
      continue;
    }

    const tag = line.match(/^\[(\w+)\s*:\s*(.+?)\]$/);
    if (tag) {
      const [, name, value] = tag;
      switch (name.toLowerCase()) {
        case 'image': {
          const file = path.resolve(baseDir, value);
          if (!fs.existsSync(file)) throw new Error(`Image not found: ${file}`);
          scene.image = file;
          break;
        }
        case 'emoji':
          scene.emoji = value;
          break;
        case 'pause':
          scene.pause = Math.max(0, Number(value) || 0);
          break;
        default:
          throw new Error(`Unknown tag [${name}: ...]. Supported tags: image, emoji, pause`);
      }
      continue;
    }

    spoken.push(line);
  }

  scene.narration = spoken.join(' ').replace(/\s+/g, ' ').trim();
  // A heading on its own becomes a title card, read aloud.
  scene.titleCard = !scene.narration && Boolean(scene.heading);
  if (scene.titleCard) scene.narration = scene.heading;
  return scene;
}

export function parseScript(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const { settings, body } = splitSettings(text);
  const baseDir = path.dirname(path.resolve(file));

  const scenes = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => parseScene(block, baseDir))
    .filter((scene) => scene.narration || scene.image);

  if (scenes.length === 0) throw new Error(`No scenes found in ${file}`);

  if (settings.music) settings.music = path.resolve(baseDir, settings.music);
  return { settings, scenes };
}
