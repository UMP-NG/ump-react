import multer from "multer";
import { v2 as cloudinaryAPI } from "cloudinary";
import { Readable } from "stream";

// Lazy config: called at first use so dotenv has already run
function ensureCloudinaryConfig() {
  cloudinaryAPI.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// Utility function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, filename, folder, isVideo = false) => {
  ensureCloudinaryConfig();
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer);
    const uploadStream = cloudinaryAPI.uploader.upload_stream(
      {
        folder: folder,
        resource_type: isVideo ? "video" : "image",
        public_id: filename,
        timeout: 60000,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            filename: result.public_id,
            path: result.secure_url,
            originalname: filename,
          });
        }
      }
    );

    stream.pipe(uploadStream);
  });
};

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Accepts both images and videos — used for listings/services that allow both
const ALLOWED_MEDIA_MIMES = new Set([
  ...ALLOWED_IMAGE_MIMES,
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
]);

const ALLOWED_PROOF_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) return cb(null, true);
  cb(new Error(`"${file.originalname}" is not a supported image format. Please upload a JPEG, PNG, WebP, or GIF.`), false);
};

const mediaFilter = (req, file, cb) => {
  if (ALLOWED_MEDIA_MIMES.has(file.mimetype)) return cb(null, true);
  const isVideo = file.mimetype.startsWith("video/");
  cb(new Error(`"${file.originalname}" is not supported. ${isVideo ? "Upload MP4, MOV, or WebM videos." : "Upload JPEG, PNG, WebP, or GIF images."}`), false);
};

const proofFilter = (req, file, cb) => {
  if (ALLOWED_PROOF_MIMES.has(file.mimetype)) return cb(null, true);
  cb(new Error(`"${file.originalname}" is not supported. Please upload a JPEG, PNG, WebP image or a PDF.`), false);
};

// Use memory storage to collect files first
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: imageFilter,
});

// Accepts both images and videos — 50 MB ceiling (images enforced to 5 MB post-parse)
const uploadMediaMulter = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: mediaFilter,
});

const uploadProof = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: proofFilter,
});

// Custom middleware for seller uploads
export const uploadSellerMedia = (req, res, cb) => {
  const multerUpload = upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]);

  multerUpload(req, res, async (err) => {
    if (err) {
      return cb(err);
    }

    try {
      // Upload logo to Cloudinary if present
      if (req.files?.logo?.[0]) {
        const logoFile = req.files.logo[0];
        const uploadedLogo = await uploadToCloudinary(
          logoFile.buffer,
          `logo-${Date.now()}`,
          "sellers"
        );
        req.files.logo[0] = {
          ...logoFile,
          filename: uploadedLogo.filename,
          path: uploadedLogo.path,
        };
      }

      // Upload banner to Cloudinary if present
      if (req.files?.banner?.[0]) {
        const bannerFile = req.files.banner[0];
        const uploadedBanner = await uploadToCloudinary(
          bannerFile.buffer,
          `banner-${Date.now()}`,
          "sellers"
        );
        req.files.banner[0] = {
          ...bannerFile,
          filename: uploadedBanner.filename,
          path: uploadedBanner.path,
        };
      }

      cb(null);
    } catch (error) {
      cb(error);
    }
  });
};

export const uploadServiceImages = (req, res, cb) => {
  const multerUpload = upload.fields([
    { name: "images", maxCount: 4 },
    { name: "image", maxCount: 1 },
  ]);

  multerUpload(req, res, async (err) => {
    if (err) {
      return cb(err);
    }

    try {
      // Upload single image (for becomeServiceProvider) to Cloudinary if present
      if (req.files?.image?.length) {
        const imageFile = req.files.image[0];
        const uploaded = await uploadToCloudinary(
          imageFile.buffer,
          `service-image-${Date.now()}`,
          "services"
        );
        req.file = {
          ...imageFile,
          filename: uploaded.filename,
          path: uploaded.path,
        };
      }

      // Upload multiple images (for createService) to Cloudinary if present
      if (req.files?.images?.length) {
        const uploadPromises = req.files.images.map((file, index) =>
          uploadToCloudinary(
            file.buffer,
            `service-image-${Date.now()}-${index}`,
            "services"
          ).then((uploaded) => ({
            ...file,
            filename: uploaded.filename,
            path: uploaded.path,
          }))
        );

        req.files.images = await Promise.all(uploadPromises);
      }

      cb(null);
    } catch (error) {
      cb(error);
    }
  });
};

export const uploadAvatar = (req, res, cb) => {
  const multerUpload = upload.single("image");

  multerUpload(req, res, async (err) => {
    if (err) {
      return cb(err);
    }

    try {
      if (req.file) {
        const uploaded = await uploadToCloudinary(
          req.file.buffer,
          `avatar-${Date.now()}`,
          "avatars"
        );
        req.file = {
          ...req.file,
          filename: uploaded.filename,
          path: uploaded.path,
        };
      }

      cb(null);
    } catch (error) {
      cb(error);
    }
  });
};

export const uploadPaymentProof = (req, res, cb) => {
  const multerUpload = uploadProof.single("paymentProof");

  multerUpload(req, res, async (err) => {
    if (err) {
      return cb(err);
    }

    try {
      if (req.file) {
        const uploaded = await uploadToCloudinary(
          req.file.buffer,
          `payment-proof-${Date.now()}`,
          "payment_proofs"
        );
        req.file = {
          ...req.file,
          filename: uploaded.filename,
          path: uploaded.path,
        };
      }

      cb(null);
    } catch (error) {
      cb(error);
    }
  });
};

export const uploadListingMedia = (req, res, cb) => {
  const multerUpload = uploadMediaMulter.fields([
    { name: "images", maxCount: 4 },
    { name: "videos", maxCount: 2 },
  ]);

  multerUpload(req, res, async (err) => {
    if (err) {
      return cb(err);
    }

    // Enforce 5 MB limit on images (multer ceiling is 50 MB to accommodate videos)
    if (req.files?.images?.length) {
      for (const file of req.files.images) {
        if (file.size > 5 * 1024 * 1024) {
          return cb(new Error(`Image "${file.originalname}" exceeds 5 MB. Please compress it before uploading.`));
        }
      }
    }

    try {
      // Upload images to Cloudinary if present
      if (req.files?.images?.length) {
        const uploadPromises = req.files.images.map((file, index) =>
          uploadToCloudinary(
            file.buffer,
            `listing-image-${Date.now()}-${index}`,
            "listings"
          ).then((uploaded) => ({
            ...file,
            filename: uploaded.filename,
            path: uploaded.path,
          }))
        );

        req.files.images = await Promise.all(uploadPromises);
      }

      // Upload videos to Cloudinary if present
      if (req.files?.videos?.length) {
        const uploadPromises = req.files.videos.map((file, index) =>
          uploadToCloudinary(
            file.buffer,
            `listing-video-${Date.now()}-${index}`,
            "listings",
            true
          ).then((uploaded) => ({
            ...file,
            filename: uploaded.filename,
            path: uploaded.path,
          }))
        );

        req.files.videos = await Promise.all(uploadPromises);
      }

      cb(null);
    } catch (error) {
      cb(error);
    }
  });
};

export const uploadSingle = (req, res, cb) => {
  const multerUpload = upload.single("file");

  multerUpload(req, res, async (err) => {
    if (err) {
      return cb(err);
    }

    try {
      if (req.file) {
        const uploaded = await uploadToCloudinary(
          req.file.buffer,
          `file-${Date.now()}`,
          "uploads"
        );
        req.file = {
          ...req.file,
          filename: uploaded.filename,
          path: uploaded.path,
        };
      }

      cb(null);
    } catch (error) {
      cb(error);
    }
  });
};

// Accepts a single file that can be an image OR a video (e.g. service video)
export const uploadSingleMedia = (req, res, cb) => {
  const multerUpload = uploadMediaMulter.single("file");

  multerUpload(req, res, async (err) => {
    if (err) return cb(err);
    try {
      if (req.file) {
        const isVideo = req.file.mimetype.startsWith("video/");
        const uploaded = await uploadToCloudinary(
          req.file.buffer,
          `media-${Date.now()}`,
          isVideo ? "service-videos" : "uploads",
          isVideo
        );
        req.file = { ...req.file, filename: uploaded.filename, path: uploaded.path, isVideo };
      }
      cb(null);
    } catch (error) {
      cb(error);
    }
  });
};

export const uploadAttachments = (req, res, cb) => {
  const multerUpload = upload.array("attachments", 5);

  multerUpload(req, res, async (err) => {
    if (err) {
      return cb(err);
    }

    try {
      if (req.files?.length) {
        const uploadPromises = req.files.map((file, index) =>
          uploadToCloudinary(
            file.buffer,
            `attachment-${Date.now()}-${index}`,
            "attachments"
          ).then((uploaded) => ({
            ...file,
            filename: uploaded.filename,
            path: uploaded.path,
          }))
        );

        req.files = await Promise.all(uploadPromises);
      }

      cb(null);
    } catch (error) {
      cb(error);
    }
  });
};

