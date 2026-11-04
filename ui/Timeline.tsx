import type { CSSProperties } from 'react';
import { T_MAX, T_MIN, useClock } from '../clock/store.ts';
import { formatClock, formatDay } from './format.ts';

const DAYS = Array.from({ length: (T_MAX - T_MIN) / 24 + 1 }, (_, i) => i);

// Linha do tempo D0 a D10: play/pausa, horário atual e scrub (seek).
export function Timeline() {
  const t = useClock((s) => s.t);
  const playing = useClock((s) => s.playing);
  const togglePlay = useClock((s) => s.togglePlay);
  const pause = useClock((s) => s.pause);
  const seek = useClock((s) => s.seek);

  const progress = ((t - T_MIN) / (T_MAX - T_MIN)) * 100;

  return (
    <section className="ov-panel ov-timeline" aria-label="Linha do tempo">
      <button
        type="button"
        className="ov-play"
        onClick={togglePlay}
        aria-label={playing ? 'Pausar' : 'Tocar'}
        title={playing ? 'Pausar' : 'Tocar'}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          {playing ? (
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
          ) : (
            <path d="M7 4l13 8-13 8z" fill="currentColor" />
          )}
        </svg>
      </button>

      <output className="ov-clock" aria-live="off">
        {formatClock(t)}
      </output>

      <div className="ov-track-wrap">
        <input
          type="range"
          className="ov-track"
          min={T_MIN}
          max={T_MAX}
          step={1}
          value={t}
          aria-label="Tempo simulado"
          aria-valuetext={formatClock(t)}
          style={{ '--progress': `${progress}%` } as CSSProperties}
          onPointerDown={pause}
          onChange={(e) => seek(Number(e.currentTarget.value))}
        />
        <ol className="ov-ticks" aria-hidden="true">
          {DAYS.map((d) => (
            <li key={d} style={{ left: `${(d / (DAYS.length - 1)) * 100}%` }}>
              {formatDay(d)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
