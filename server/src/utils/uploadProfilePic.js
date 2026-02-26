const { uploadImage } = require('../config/cloudinary');

const uploadUserProfilePic = async (base64Data) => {
  return uploadImage(base64Data);
};

const uploadGroupProfilePic = async (base64Data) => {
  return uploadImage(base64Data);
};

module.exports = { uploadUserProfilePic, uploadGroupProfilePic };
