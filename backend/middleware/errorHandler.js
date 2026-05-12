export const errorHandler = (err, req, res, next) => {
  // Multer (file upload) specific enhancement
  if (err && err.name === "MulterError") {
    console.error("🔥 MulterError:", err);
    // Log request context to help identify which route caused it
    try {
      console.error("Request:", req.method, req.originalUrl);
      console.error("Content-Type:", req.headers && req.headers["content-type"]);
    } catch (e) {
      // ignore
    }
    // If multer reports an unexpected field, include the field name in the response
    const payload = {
      success: false,
      message: err.message || "File upload error",
      code: err.code || "MULTER_ERROR",
    };
    if (err.field) payload.field = err.field;
    // include request path for easier debugging on the client
    payload.request = `${req.method} ${req.originalUrl}`;
    return res.status(400).json(payload);
  }

  // Fallback for other errors
  console.error("🔥 Error:", err && err.stack ? err.stack : err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
  });
};