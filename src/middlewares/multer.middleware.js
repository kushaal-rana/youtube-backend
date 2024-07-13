import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); //this might overwrite if there are multiple files with same name hence add something unique to original name
  },
});

export const upload = multer({
  storage,
});
