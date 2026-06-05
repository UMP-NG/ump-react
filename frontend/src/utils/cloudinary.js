/**
 * Append Cloudinary auto-quality + auto-format transforms to any Cloudinary image URL.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function cloudImg(url, opts = {}) {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  // Idempotency guard — don't stack transforms on an already-transformed URL
  if (/\/upload\/[a-z_,]+\//.test(url)) return url;
  const transforms = ["q_auto", "f_auto", opts.w ? `w_${opts.w},c_limit` : null]
    .filter(Boolean)
    .join(",");
  return url.replace("/upload/", `/upload/${transforms}/`);
}

/**
 * Ensure a Cloudinary video URL is served in an iOS-compatible format.
 *
 * `vc_auto` tells Cloudinary to transcode to H.264/AAC for Safari/iOS
 * and to VP9/AV1 for Chrome — one URL works on every browser.
 * Without this, WebM uploads simply refuse to play on iPhone.
 *
 * Local blob: URLs (preview before upload) are returned unchanged.
 */
export function cloudVideo(url) {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  // Idempotency guard
  if (/\/upload\/vc_/.test(url)) return url;
  // vc_auto: Cloudinary picks H.264/MP4 for Safari/iOS, VP9/WebM for Chrome.
  // ac_aac: ensures AAC audio track — required for iOS playback.
  // Replace .webm extension with .mp4 so the URL the browser sees signals H.264;
  // Cloudinary serves the correct codec regardless of the stored file extension.
  return url
    .replace("/upload/", "/upload/vc_auto,ac_aac/")
    .replace(/\.webm(\?|$)/, ".mp4$1");
}
