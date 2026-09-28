import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const run = promisify(execFile);

const ENTRY_POINT = fileURLToPath(new URL('../remotion/index.jsx', import.meta.url));
const MUSIC_VOLUME = 0.12;

export const FORMATS = {
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

// Remotion can only load files from its public folder, so images are copied there.
function stageImages(scenes, publicDir) {
  fs.mkdirSync(publicDir, { recursive: true });
  return scenes.map((scene, i) => {
    if (!scene.image) return scene;
    const name = `image-${i}${path.extname(scene.image)}`;
    fs.copyFileSync(scene.image, path.join(publicDir, name));
    return { ...scene, image: name };
  });
}

export async function renderVisuals({ scenes, totalDuration, format, theme, fps, workDir, onProgress }) {
  const publicDir = path.join(workDir, 'public');
  const inputProps = {
    ...FORMATS[format],
    fps,
    totalDuration,
    theme,
    scenes: stageImages(scenes, publicDir),
  };

  const serveUrl = await bundle({ entryPoint: ENTRY_POINT, publicDir });
  const composition = await selectComposition({ serveUrl, id: 'ScriptVideo', inputProps });

  const outputLocation = path.join(workDir, 'visuals.mp4');
  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    codec: 'h264',
    crf: 21,
    muted: true,
    outputLocation,
    onProgress: ({ progress }) => onProgress?.(progress),
  });
  return outputLocation;
}

export async function addAudio({ visuals, voice, music, totalDuration, output }) {
  if (!voice && !music) {
    fs.copyFileSync(visuals, output);
    return;
  }

  const args = ['-v', 'error', '-y', '-i', visuals];
  if (voice) args.push('-i', voice);
  if (music) args.push('-stream_loop', '-1', '-i', music);

  if (voice && music) {
    args.push(
      '-filter_complex',
      `[2:a]volume=${MUSIC_VOLUME}[music];[1:a][music]amix=inputs=2:duration=first:normalize=0[audio]`,
      '-map', '0:v',
      '-map', '[audio]',
    );
  } else if (music) {
    args.push('-filter_complex', `[1:a]volume=${MUSIC_VOLUME * 2.5}[audio]`, '-map', '0:v', '-map', '[audio]');
  } else {
    args.push('-map', '0:v', '-map', '1:a');
  }

  args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', totalDuration.toFixed(3), '-movflags', '+faststart', output);
  await run('ffmpeg', args);
}
