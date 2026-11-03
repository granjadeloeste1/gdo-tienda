import React from 'react';
import {Composition} from 'remotion';
import {Club} from './Club';

export const Root: React.FC = () => (
  <Composition id="Club" component={Club} durationInFrames={720} fps={30} width={1080} height={1920} />
);
