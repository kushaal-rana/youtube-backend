import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // node js file system inbuilt
import { User } from "../models/user.model.js";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uplaoded successfully
    // console.log(
    //   "File has been uplaoded successfully on Cloudinary",
    //   response.url
    // );
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation failed
    return null;
  }
};

const deleteOldImage = async (imageUrl) => {
  try {
    if (imageUrl) {
      const publicId = imageUrl.split("/").pop().split(".")[0];
      const response = await cloudinary.uploader.destroy(publicId);
      console.log(response, "Image deletion response from Cloudinary");
    }
  } catch (error) {
    console.error("Failed to delete old avatar image", error);
  }
}; //check once

export { uploadOnCloudinary, deleteOldImage };
