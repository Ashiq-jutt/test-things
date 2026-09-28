import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video.jsx';
import { DEFAULT_THEME } from './themes.js';

const PREVIEW_PROPS = {
  width: 1080,
  height: 1920,
  fps: 30,
  totalDuration: 3,
  theme: DEFAULT_THEME,
  scenes: [
    {
      start: 0,
      end: 3,
      heading: 'Script to Video',
      emoji: '🎬',
      image: null,
      titleCard: true,
      captions: [],
    },
  ],
};

export const Root = () => (
  <Composition
    id="ScriptVideo"
    component={Video}
    width={PREVIEW_PROPS.width}
    height={PREVIEW_PROPS.height}
    fps={PREVIEW_PROPS.fps}
    durationInFrames={90}
    defaultProps={PREVIEW_PROPS}
    calculateMetadata={({ props }) => ({
      width: props.width,
      height: props.height,
      fps: props.fps,
      durationInFrames: Math.max(1, Math.ceil(props.totalDuration * props.fps)),
    })}
  />
);
