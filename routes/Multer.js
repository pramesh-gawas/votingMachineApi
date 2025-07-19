const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    console.log(file);
    cb(null, date.now() + "-" + file.originalName);
  },
});

const upload = multer({ storage: storage });
