import { describe, expect, it } from 'vitest';
import { alertHeadline, formatClock, formatDay, formatDays, formatPct, formatUsd, isStillMode } from './format.ts';

describe('formatUsd', () => {
  it('mostra milhares com até uma casa, truncando na centena', () => {
    expect(formatUsd(43050)).toBe('US$ 43 mil');
    expect(formatUsd(24600)).toBe('US$ 24,6 mil');
    expect(formatUsd(41000)).toBe('US$ 41 mil');
    expect(formatUsd(0)).toBe('US$ 0 mil');
  });
});

describe('formatPct e formatDays', () => {
  it('arredonda a porcentagem e usa vírgula nos dias', () => {
    expect(formatPct(0.64)).toBe('64%');
    expect(formatPct(0.09)).toBe('9%');
    expect(formatDays(2.1)).toBe('2,1');
    expect(formatDays(1.2)).toBe('1,2');
  });
});

describe('formatDay e formatClock', () => {
  it('rotula os dias como D0 e D+n', () => {
    expect(formatDay(0)).toBe('D0');
    expect(formatDay(10)).toBe('D+10');
  });

  it('converte horas desde T0 (06h00 de D0) em dia e hora', () => {
    expect(formatClock(0)).toBe('D0, 06h00');
    expect(formatClock(17.5)).toBe('D0, 23h30');
    expect(formatClock(18)).toBe('D+1, 00h00');
    expect(formatClock(72)).toBe('D+3, 06h00');
    expect(formatClock(240)).toBe('D+10, 06h00');
  });
});

describe('alertHeadline', () => {
  it('monta o texto do card a partir do alerta', () => {
    expect(alertHeadline({ shipId: 'C', probability: 0.8, delayH: 36 })).toBe(
      'Navio C: 80% de chance de chegar 36 h atrasado',
    );
  });
});

describe('isStillMode', () => {
  it('liga só com still=1', () => {
    expect(isStillMode('?still=1')).toBe(true);
    expect(isStillMode('?beat=2&still=1')).toBe(true);
    expect(isStillMode('?still=0')).toBe(false);
    expect(isStillMode('')).toBe(false);
  });
});
