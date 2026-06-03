/**
 * Screenshot routes index — re-exports all exchange route maps
 * Import in Astro components or TypeScript code for type-safe access
 */
export type { RouteConfig, RouteMap, SafetyLevel, Priority, Viewport, AllRouteMaps } from './types.js';
export { routes as binanceRoutes } from './binance.js';
export { routes as okxRoutes } from './okx.js';
export { routes as mexcRoutes } from './mexc.js';

import { routes as binanceRoutes } from './binance.js';
import { routes as okxRoutes } from './okx.js';
import { routes as mexcRoutes } from './mexc.js';

export const allRoutes: Record<string, typeof binanceRoutes> = {
  binance: binanceRoutes,
  okx: okxRoutes,
  mexc: mexcRoutes,
};
