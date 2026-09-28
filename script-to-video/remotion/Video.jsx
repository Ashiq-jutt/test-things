import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './Background.jsx';
import { Scene } from './Scene.jsx';
import { DEFAULT_THEME, THEMES } from './themes.js';

const FONT_STACK =
  '"SF Pro Display", "Helvetica Neue", "Kohinoor Devanagari", Arial, "Apple Color Emoji", sans-serif';

const ProgressBar = ({ color }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, height } = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: Math.max(6, height * 0.006),
        width: `${(frame / durationInFrames) * 100}%`,
        background: color,
      }}
    />
  );
};

export const Video = ({ scenes, theme: themeName }) => {
  const { fps } = useVideoConfig();
  const theme = THEMES[themeName] ?? THEMES[DEFAULT_THEME];

  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK }}>
      <Background scenes={scenes} theme={theme} />
      {scenes.map((scene, i) => {
        const from = Math.round(scene.start * fps);
        const duration = Math.max(1, Math.round(scene.end * fps) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={duration}>
            <Scene scene={scene} theme={theme} />
          </Sequence>
        );
      })}
      <ProgressBar color={theme.accent} />
    </AbsoluteFill>
  );
};
