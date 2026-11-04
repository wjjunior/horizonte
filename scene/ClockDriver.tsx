import { useFrame } from '@react-three/fiber';
import { useClock } from '../clock/store.ts';

// Avança o relógio simulado uma vez por frame (WAG-737).
export function ClockDriver() {
  useFrame((_, delta) => useClock.getState().tick(delta));
  return null;
}
