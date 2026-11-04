import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { loadScenarioFile } from './data/loader.ts';
import { useClock } from './clock/store.ts';
import { Scene } from './scene/Scene.tsx';
import { CAMERA_FOV, SHOTS } from './scene/shots.ts';
import { DrawCallProbe } from './scene/DrawCallProbe.tsx';
import { Overlays } from './ui/Overlays.tsx';
import { STAGE_HEIGHT, STAGE_WIDTH, stageFit } from './ui/stage.ts';

export const WIDTH = STAGE_WIDTH;
export const HEIGHT = STAGE_HEIGHT;
export const BACKGROUND = '#0E1A22';

const initialShot = SHOTS.overview;

// Escala do palco para caber na janela (WAG-752), recalculada no resize.
function useStageFit() {
  const [fit, setFit] = useState(() => stageFit(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const onResize = () => setFit(stageFit(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return fit;
}

export function App() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const fit = useStageFit();

  useEffect(() => {
    loadScenarioFile()
      .then((file) => useClock.getState().setFile(file))
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  // O palco é desenhado em 1920×1080 e reduzido por CSS para caber na janela, sem scroll.
  // resize.offsetSize: o R3F mede o contêiner sem o transform, então o canvas segue em 1920×1080.
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: BACKGROUND }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: WIDTH,
          height: HEIGHT,
          background: BACKGROUND,
          transformOrigin: '0 0',
          transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})`,
        }}
      >
        <Canvas
          resize={{ offsetSize: true }}
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
      </div>
      {import.meta.env.DEV && <Stats />}
    </div>
  );
}
