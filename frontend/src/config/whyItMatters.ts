/**
 * Hero media on `/why-it-matters` (top of the page).
 *
 * You do NOT need YouTube. Two options:
 *
 * 1) Self-hosted file (good for repo + deploy together)
 *    - Add your file under: frontend/public/videos/<name>.mp4
 *    - Vite serves `public/` at the site root, so use a path like:
 *        '/videos/why-it-matters.mp4'
 *    - Commit the file to git. Large files bloat the repo; for big videos consider
 *      Git LFS or hosting the file elsewhere and using a full URL in WHY_IT_MATTERS_VIDEO_SRC.
 *
 * 2) Embed (YouTube, Vimeo, etc.)
 *    - Set WHY_IT_MATTERS_VIDEO_EMBED_URL to the iframe src, e.g.
 *        'https://www.youtube.com/embed/VIDEO_ID'
 *
 * If WHY_IT_MATTERS_VIDEO_SRC is set, it wins and the embed URL is ignored.
 */
export const WHY_IT_MATTERS_VIDEO_SRC: string | null =
  '/videos/copy_6E9C5F6D-14D9-4DD6-97B0-8C00E2BDA1D7.MOV';

/** Optional iframe embed; used only when WHY_IT_MATTERS_VIDEO_SRC is null. */
export const WHY_IT_MATTERS_VIDEO_EMBED_URL: string | null = null;
