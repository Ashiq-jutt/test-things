import React from 'react';
import { AbsoluteFill, interpolateColors, useCurrentFrame, useVideoConfig } from 'remotion';

const BLEND_SECONDS = 0.5;

export const Background = ({ scenes, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  let index = scenes.findIndex((scene) => t < scene.end);
  if (index === -1) index = scenes.length - 1;

  const pick = (i) => theme.backgrounds[Math.max(0, i) % theme.backgrounds.length];
  const from = pick(index - 1);
  const to = pick(index);
  const blend = index === 0 ? 1 : (t - scenes[index].start) / BLEND_SECONDS;

  const top = interpolateColors(blend, [0, 1], [from[0], to[0]]);
  const bottom = interpolateColors(blend, [0, 1], [from[1], to[1]]);

  // Two soft lights drifting slowly so the background never sits still.
  const x1 = 25 + Math.sin(t * 0.35) * 15;
  const y1 = 25 + Math.cos(t * 0.28) * 12;
  const x2 = 75 + Math.cos(t * 0.3) * 15;
  const y2 = 78 + Math.sin(t * 0.22) * 12;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${top}, ${bottom})` }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x1}% ${y1}%, ${theme.glow}, transparent 45%), radial-gradient(circle at ${x2}% ${y2}%, ${theme.glow}, transparent 40%)`,
        }}
      />
    </AbsoluteFill>
  );
};
