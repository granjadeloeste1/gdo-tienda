import React from 'react';
import {Composition} from 'remotion';
import {Club} from './Club';
import {Reel} from './Reel';

export const Root: React.FC = () => (
  <>
    <Composition id="Club" component={Club} durationInFrames={1263} fps={30} width={1280} height={720} />
    <Composition id="Reel" component={Reel} durationInFrames={606} fps={30} width={1080} height={1920} />
  </>
);
