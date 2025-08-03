import axios from "./axios";

export const UploadFile = async (file: File | null) => {
    if (!file) return;
    try {
        const res = await axios.get(`/imageKit?tmsmt=${Date.now()}`);

        if (!res.data?.signature) return false;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("publicKey", "public_iz6sM0TqQHI5bZ6dWzXmKIY2ciI=");
        formData.append("signature", res.data.signature);
        formData.append("expire", res.data.expire);
        formData.append("token", res.data.token);
        const sanitizedFileName = file.name
            .replace(/[^a-zA-Z0-9.]/g, "") // Remove special characters
            .replace(/(.*)\.(?=.*\.)/, "$1_") // Ensure only one dot for extension
            .slice(0, 8); // Limit filename to 8 characters
        formData.append("fileName", `${Date.now()}_${sanitizedFileName}`);

        const response = await axios.post(
            "https://upload.imagekit.io/api/v1/files/upload",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
        );

        return response.data.url;
    } catch {
        return false;
    }
};
