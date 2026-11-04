// Formatação dos overlays (WAG-738). Funções puras, texto em pt-BR.

import type { Alert } from '../docs/schema.ts';

const decimal = (n: number) => String(n).replace('.', ',');

// 43050 -> "US$ 43 mil", 24600 -> "US$ 24,6 mil".
// Trunca na centena (não arredonda) para bater com a fala: "uns 43 mil dólares".
export function formatUsd(usd: number): string {
  return `US$ ${decimal(Math.trunc(usd / 100) / 10)} mil`;
}

// 0.64 -> "64%"
export function formatPct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

// 2.1 -> "2,1"
export function formatDays(days: number): string {
  return days.toFixed(1).replace('.', ',');
}

// Rótulo do dia na linha do tempo: 0 -> "D0", 3 -> "D+3".
export function formatDay(day: number): string {
  return day === 0 ? 'D0' : `D+${day}`;
}

// Horas desde T0 (06h00 de D0) -> "D+3, 06h00". O dia vira à meia-noite.
export function formatClock(t: number): string {
  const minutes = Math.floor((t + 6) * 60);
  const day = Math.floor(minutes / 1440);
  const hh = Math.floor((minutes % 1440) / 60);
  const mm = minutes % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${formatDay(day)}, ${pad(hh)}h${pad(mm)}`;
}

// "Navio C: 80% de chance de chegar 36 h atrasado"
export function alertHeadline(alert: Pick<Alert, 'shipId' | 'probability' | 'delayH'>): string {
  return `Navio ${alert.shipId}: ${formatPct(alert.probability)} de chance de chegar ${Math.round(alert.delayH)} h atrasado`;
}

// ?still=1 esconde todos os overlays (export do still).
export function isStillMode(search: string): boolean {
  return new URLSearchParams(search).get('still') === '1';
}
