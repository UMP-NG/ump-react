// fetch() does not support data: URLs on iOS Safari — load via <img> instead.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export default async function getCroppedImg(imageSrc, croppedAreaPixels) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width  = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    image,
    croppedAreaPixels.x, croppedAreaPixels.y,
    croppedAreaPixels.width, croppedAreaPixels.height,
    0, 0,
    croppedAreaPixels.width, croppedAreaPixels.height,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")), "image/jpeg", 0.9)
  );
}
