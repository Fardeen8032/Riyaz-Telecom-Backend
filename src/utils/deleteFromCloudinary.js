import cloudinary from "../config/cloudinary.js";

const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl) {
    return;
  }

  const urlParts = imageUrl.split("/");

  const uploadIndex = urlParts.indexOf("upload");

  if (uploadIndex === -1) {
    return;
  }

  const publicIdWithExtension = urlParts
    .slice(uploadIndex + 2)
    .join("/");

  const publicId = publicIdWithExtension
    .replace(/\.[^/.]+$/, "");

  await cloudinary.uploader.destroy(publicId);
};

export default deleteFromCloudinary;