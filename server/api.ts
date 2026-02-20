/**
 * Re-export API handlers from api/_shared.ts.
 * This file is used by the Vite dev server plugin (server/vitePlugin.ts).
 * The actual implementation lives in api/_shared.ts.
 */
export { handleSearchSongs, handleAnalyze, handleRefine } from '../api/_shared';
