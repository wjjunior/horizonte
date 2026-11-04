import { forwardRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import interUrl from '@fontsource/inter/files/inter-latin-500-normal.woff?url';

// Rótulo 3D (troika via drei <Text>) com a Inter local: nenhuma fonte de CDN.
// Sempre de frente para a câmera e por cima da cena (sem teste de profundidade). Cada rótulo é uma draw call.

export const LABEL_FONT = interUrl;

interface LabelProps {
  position: [number, number, number];
  text: string;
  size?: number;
  color?: string;
  opacity?: number;
  anchorX?: 'left' | 'center' | 'right';
  anchorY?: 'top' | 'middle' | 'bottom';
}

// O ref é o mesh do troika: para texto que muda com o tempo, troque `.text` e chame `.sync()` no useFrame.
export const Label = forwardRef<{ text: string; sync: () => void }, LabelProps>(function Label(
  { position, text, size = 1.4, color = '#E8EEF2', opacity = 1, anchorX = 'center', anchorY = 'bottom' },
  ref,
) {
  return (
    <Billboard position={position}>
      <Text
        ref={ref}
        font={LABEL_FONT}
        fontSize={size}
        color={color}
        fillOpacity={opacity}
        anchorX={anchorX}
        anchorY={anchorY}
        textAlign="center"
        lineHeight={1.15}
        renderOrder={10}
        material-depthTest={false}
      >
        {text}
      </Text>
    </Billboard>
  );
});
