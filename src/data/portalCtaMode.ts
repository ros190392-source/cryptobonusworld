/**
 * Central resolver for the public CTA execution mode.
 *
 * This is the single source of truth that decides whether public commercial
 * CTAs render live affiliate `/go/{slug}` targets ('production') or safe
 * internal review targets ('preview').
 *
 * Fail-closed default: 'preview'. A live affiliate posture requires an explicit
 * owner action at build/deploy time — setting `PUBLIC_CBW_CTA_MODE=production`.
 * This keeps "no production affiliate behavior without owner action" intact
 * while leaving the full commercial capability built and one env flip away.
 *
 * The authoritative per-CTA gate still runs regardless of mode: even in
 * 'production', an unapproved / ineligible / unavailable / stale profile can
 * never yield a `/go/*` target (see resolveCommercialCta).
 */
import type { CtaMode } from './exchangePreview/cta-contract';

const VALID_MODES: readonly CtaMode[] = ['preview', 'production'];

/**
 * Resolve the public CTA mode from the environment, fail-closed to 'preview'.
 * Any unset, empty or unrecognized value resolves to 'preview'.
 */
export function resolvePublicCtaMode(rawEnv?: string | undefined): CtaMode {
  const raw = (rawEnv ?? readEnv()).trim().toLowerCase();
  return (VALID_MODES as readonly string[]).includes(raw) ? (raw as CtaMode) : 'preview';
}

function readEnv(): string {
  // import.meta.env is the Astro/Vite build-time env surface.
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.PUBLIC_CBW_CTA_MODE ?? '';
}
