const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (base64Data, folder = 'chat-app') => {
  if (!base64Data || typeof base64Data !== 'string') return null;
  const trimmed = base64Data.trim();
  if (!trimmed.startsWith('data:image')) return null;
  try {
    const result = await cloudinary.uploader.upload(trimmed, { folder });
    return result.secure_url;
  } catch (err) {
    console.error('Cloudinary upload error:', err.message);
    return null;
  }
};

module.exports = { cloudinary, uploadImage };
