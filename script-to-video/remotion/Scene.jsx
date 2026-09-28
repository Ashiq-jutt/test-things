import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Captions } from './Captions.jsx';

const FADE_FRAMES = 8;

const Heading = ({ children, size, color, accent, enter, unit }) => (
  <div
    style={{
      fontSize: size,
      fontWeight: 900,
      lineHeight: 1.08,
      letterSpacing: -1.5 * unit,
      color,
      textShadow: '0 6px 30px rgba(0, 0, 0, 0.45)',
    }}
  >
    {children}
    <div
      style={{
        height: 10 * unit,
        width: `${enter * 40}%`,
        margin: `${24 * unit}px auto 0`,
        borderRadius: 10 * unit,
        background: accent,
      }}
    />
  </div>
);

// The photo fills the frame; the heading sits at the top and captions at the bottom
// so the subject in the middle stays clear.
const PhotoScene = ({ scene, theme, frame, enter, unit }) => {
  const { durationInFrames } = useVideoConfig();
  const { fps } = useVideoConfig();
  const t = scene.start + frame / fps;
  const zoom = interpolate(frame, [0, durationInFrames], [1.02, 1.12]);

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Img
        src={staticFile(scene.image)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.8) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          padding: `${70 * unit}px ${80 * unit}px ${90 * unit}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
        }}
      >
        <div style={{ transform: `translateY(${(enter - 1) * 60 * unit}px)`, opacity: enter }}>
          {scene.heading && (
            <Heading
              size={(scene.titleCard ? 110 : 80) * unit}
              color="#ffffff"
              accent={theme.accent}
              enter={enter}
              unit={unit}
            >
              {scene.heading}
            </Heading>
          )}
        </div>
        {!scene.titleCard && scene.captions.length > 0 && (
          <div style={{ minHeight: 200 * unit, display: 'flex', alignItems: 'flex-end' }}>
            <Captions
              captions={scene.captions}
              t={t}
              theme={{ ...theme, text: '#ffffff' }}
              fontSize={78 * unit}
              outlined
            />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const TextScene = ({ scene, theme, frame, enter, unit }) => {
  const { fps } = useVideoConfig();
  const t = scene.start + frame / fps;
  const emojiEnter = spring({ frame: frame - 3, fps, config: { damping: 9, stiffness: 140 } });
  const hasHeader = Boolean(scene.heading || scene.emoji);

  return (
    <AbsoluteFill
      style={{
        padding: `${120 * unit}px ${80 * unit}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 70 * unit,
        textAlign: 'center',
      }}
    >
      {hasHeader && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 30 * unit,
            transform: `translateY(${(1 - enter) * 60 * unit}px)`,
            opacity: enter,
          }}
        >
          {scene.emoji && (
            <div style={{ fontSize: 190 * unit, lineHeight: 1, transform: `scale(${emojiEnter})` }}>
              {scene.emoji}
            </div>
          )}
          {scene.heading && (
            <Heading
              size={(scene.titleCard ? 120 : 84) * unit}
              color={theme.text}
              accent={theme.accent}
              enter={enter}
              unit={unit}
            >
              {scene.heading}
            </Heading>
          )}
        </div>
      )}

      {!scene.titleCard && scene.captions.length > 0 && (
        <div style={{ minHeight: 260 * unit, display: 'flex', alignItems: 'center' }}>
          <Captions
            captions={scene.captions}
            t={t}
            theme={theme}
            fontSize={(hasHeader ? 76 : 96) * unit}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Scene = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;

  const fade = interpolate(
    frame,
    [0, FADE_FRAMES, durationInFrames - FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const Layout = scene.image ? PhotoScene : TextScene;

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Layout scene={scene} theme={theme} frame={frame} enter={enter} unit={unit} />
    </AbsoluteFill>
  );
};
