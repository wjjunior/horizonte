import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { loadScenarioFile } from './data/loader.ts';
import { useClock } from './clock/store.ts';
import { Scene } from './scene/Scene.tsx';
import { CAMERA_FOV, SHOTS } from './scene/shots.ts';
import { DrawCallProbe } from './scene/DrawCallProbe.tsx';
import { Overlays } from './ui/Overlays.tsx';

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BACKGROUND = '#0E1A22';

const initialShot = SHOTS.overview;

export function App() {
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadScenarioFile()
      .then((file) => useClock.getState().setFile(file))
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  return (
    <div style={{ position: 'relative', width: WIDTH, height: HEIGHT, background: BACKGROUND }}>
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ position: initialShot.position, fov: CAMERA_FOV, near: 0.5, far: 600 }}
        onCreated={({ camera }) => camera.lookAt(...initialShot.target)}
      >
        <color attach="background" args={[BACKGROUND]} />
        <Scene />
        {import.meta.env.DEV && <DrawCallProbe />}
      </Canvas>
      {loadError && (
        <pre style={{ position: 'absolute', top: 24, left: 24, margin: 0, color: '#E25A4F', fontSize: 18 }}>
          {loadError}
        </pre>
      )}
      <Overlays />
      {import.meta.env.DEV && <Stats />}
    </div>
  );
}
