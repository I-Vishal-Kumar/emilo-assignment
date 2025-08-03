import multer from "multer";

// You can configure storage to memory or disk. For now, use memory:
const storage = multer.memoryStorage(); // good if you're uploading to a remote service like ImageKit

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // limit file size to 10MB
    },
});
