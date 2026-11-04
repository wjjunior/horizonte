import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BACKGROUND = '#0E1A22';

export function App() {
  return (
    <div style={{ position: 'relative', width: WIDTH, height: HEIGHT, background: BACKGROUND }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 40, 60], fov: 35 }}>
        <color attach="background" args={[BACKGROUND]} />
      </Canvas>
      {import.meta.env.DEV && <Stats />}
    </div>
  );
}
