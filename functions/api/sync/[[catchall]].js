// ── ARAP Sync Catch-all Route ──
// Re-exports handlers from ../sync.js so that sub-routes like
// /api/sync/status, /api/sync/crm-deal, /api/sync/wms-po,
// and /api/sync/wms-delivery are handled by the sync.js logic.
//
// In Cloudflare Pages, sync.js only matches /api/sync exactly.
// This catch-all matches /api/sync/* and delegates to the same handlers.

export { onRequestGet, onRequestPost } from '../sync.js';
