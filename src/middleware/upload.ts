import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import { env } from "../config/env.js";

// Configure Cloudinary
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

// Set up Multer to use Cloudinary storage, one folder per upload type
const uploader = (folder: string) => multer({
    storage: new CloudinaryStorage({
        cloudinary,
        params: {
            folder, // Folder in Cloudinary where files will be stored
            allowed_formats: ['jpg', 'png', 'svg'],
            public_id: (req: unknown, file: { originalname: string }) => file.originalname.split('.')[0], // Use the original file name
            // shortcut: multer-storage-cloudinary's types omit `folder`, remove the cast if they add it
        } as any,
    }),
});

const uploadGroupPhoto = uploader('group_photos');
const uploadUserPhoto = uploader('profile_photos');
const uploadMessagePhoto = uploader('message_photos');

// Fire and forget: the request is already failing, so a leaked photo must not slow or break the response.
const discardUpload = (file?: Express.Multer.File) => {
    if (!file) return;
    cloudinary.uploader.destroy(file.filename).catch((err) => console.error("Failed to discard upload", err));
};

export {
    discardUpload,
    uploadGroupPhoto,
    uploadUserPhoto,
    uploadMessagePhoto
}
