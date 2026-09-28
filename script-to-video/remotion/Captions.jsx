import React from 'react';
import { spring, useVideoConfig } from 'remotion';

const HOLD_SECONDS = 0.6;

// `t` is the absolute time in the video, in seconds.
export const Captions = ({ captions, t, theme, fontSize, outlined = false }) => {
  const { fps } = useVideoConfig();

  const active = captions.findLast((caption) => t >= caption.start);
  if (!active || t > active.end + HOLD_SECONDS) return null;

  const pop = spring({
    frame: (t - active.start) * fps,
    fps,
    config: { damping: 14, stiffness: 220, mass: 0.6 },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: `0 ${fontSize * 0.28}px`,
        transform: `scale(${0.88 + pop * 0.12})`,
        opacity: Math.min(1, pop * 1.5),
      }}
    >
      {active.words.map((word, i) => {
        const speaking = t >= word.start && t < word.end;
        const spoken = t >= word.end;
        return (
          <span
            key={i}
            style={{
              fontSize,
              fontWeight: 800,
              lineHeight: 1.2,
              color: speaking ? theme.accent : theme.text,
              opacity: speaking || spoken || outlined ? 1 : 0.55,
              transform: `scale(${speaking ? 1.08 : 1})`,
              // Over a photo the text needs a hard edge to stay readable.
              textShadow: outlined
                ? '0 0 8px rgba(0, 0, 0, 0.9), 0 4px 18px rgba(0, 0, 0, 0.8)'
                : '0 4px 24px rgba(0, 0, 0, 0.35)',
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
