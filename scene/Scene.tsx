import { Board } from './Board.tsx';
import { ClockDriver } from './ClockDriver.tsx';
import { Corridor } from './Corridor.tsx';
import { Gauge } from './Gauge.tsx';
import { Port } from './Port.tsx';
import { River } from './River.tsx';
import { Ships } from './Ships.tsx';

// Cena estática do corredor, porto e rio (WAG-737). Os navios (WAG-739) entram como irmãos.
export function Scene() {
  return (
    <>
      <ClockDriver />
      <hemisphereLight args={['#DDE7EE', '#0E1A22', 1.4]} />
      <directionalLight position={[30, 60, 40]} intensity={1.6} />
      <Board />
      <River />
      <Gauge />
      <Corridor />
      <Port />
      <Ships />
    </>
  );
}
