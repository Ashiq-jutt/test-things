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

export const Scene = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const t = scene.start + frame / fps;

  const fade = interpolate(
    frame,
    [0, FADE_FRAMES, durationInFrames - FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const enter = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const emojiEnter = spring({ frame: frame - 3, fps, config: { damping: 9, stiffness: 140 } });

  const hasHeader = Boolean(scene.heading || scene.emoji);
  const showCaptions = !scene.titleCard && scene.captions.length > 0;
  const text = scene.image ? '#ffffff' : theme.text;

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {scene.image && (
        <AbsoluteFill>
          <Img
            src={staticFile(scene.image)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${interpolate(frame, [0, durationInFrames], [1.02, 1.14])})`,
            }}
          />
          <AbsoluteFill
            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.7))' }}
          />
        </AbsoluteFill>
      )}

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
              <div
                style={{
                  fontSize: (scene.titleCard ? 120 : 84) * unit,
                  fontWeight: 900,
                  lineHeight: 1.08,
                  letterSpacing: -1.5 * unit,
                  color: text,
                  textShadow: '0 6px 30px rgba(0, 0, 0, 0.3)',
                }}
              >
                {scene.heading}
                <div
                  style={{
                    height: 10 * unit,
                    width: `${enter * 40}%`,
                    margin: `${28 * unit}px auto 0`,
                    borderRadius: 10 * unit,
                    background: theme.accent,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {showCaptions && (
          <div style={{ minHeight: 260 * unit, display: 'flex', alignItems: 'center' }}>
            <Captions
              captions={scene.captions}
              t={t}
              theme={{ ...theme, text }}
              fontSize={(hasHeader ? 76 : 96) * unit}
            />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
