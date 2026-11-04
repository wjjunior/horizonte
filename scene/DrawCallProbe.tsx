import { useFrame } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';

// Só em desenvolvimento: publica as draw calls do último frame em window.__drawCalls, para medir
// o teto de 60, e o estado do R3F em window.__r3f, para scripts de inspeção (Playwright, console).
declare global {
  interface Window {
    __drawCalls?: number;
    __r3f?: RootState;
  }
}

export function DrawCallProbe() {
  useFrame((state) => {
    window.__drawCalls = state.gl.info.render.calls;
    window.__r3f = state;
  });
  return null;
}
