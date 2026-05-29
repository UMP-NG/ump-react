/**
 * Append Cloudinary auto-quality + auto-format transforms to any Cloudinary URL.
 * Non-Cloudinary URLs are returned unchanged.
 *
 * @param {string} url  - Raw image URL (Cloudinary or otherwise)
 * @param {object} opts - Optional overrides: { w: number } for width cap
 * @returns {string}
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
