import jwt from "jsonwebtoken";
import md5 from "md5";
import ImageKit from "imagekit";
import { USER } from "../modals/user.model.js";

export class AuthController {
    static CREATE_JWT = (payload) => {
        console.log(process.env.JWT_SECRET);
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
    };

    static LOGIN = async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res
                    .status(400)
                    .json({ message: "Username and password are required" });
            }

            const user = await USER.findOne({ username }).select("+password");

            if (!user || user.password !== md5(password)) {
                return res.status(401).json({
                    success: false,
                    msg: "Invalid username or password",
                });
            }

            const token = AuthController.CREATE_JWT({
                id: user._id,
                username: user.username,
                role: user.role,
            });

            res.cookie("token", token, {
                httpOnly: true,
                sameSite: "None",
                secure: true, // use true in production with HTTPS
                maxAge: 24 * 60 * 60 * 1000, // 1 day
            });

            res.status(200).json({ success: true, msg: "Login successful" });
        } catch (err) {
            console.error("LOGIN ERROR:", err);
            res.status(500).json({
                success: false,
                msg: "Server error during login",
            });
        }
    };

    static SIGNUP = async (req, res) => {
        try {
            const { username, password, role } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    msg: "Username and password are required",
                });
            }

            const exists = await USER.findOne({ username });
            if (exists) {
                return res
                    .status(409)
                    .json({ success: false, msg: "Username already taken" });
            }

            const newUser = await USER.create({
                username,
                password: md5(password),
                role: role,
            });

            const token = AuthController.CREATE_JWT({
                id: newUser._id,
                username: newUser.username,
                role: newUser.role,
            });

            res.cookie("token", token, {
                httpOnly: true,
                sameSite: "None",
                secure: true, // set to true in production
                maxAge: 24 * 60 * 60 * 1000,
            });

            res.status(201).json({ success: true, msg: "Signup successful" });
        } catch (err) {
            console.error("SIGNUP ERROR:", err);
            res.status(500).json({
                success: false,
                msg: "Server error during signup",
            });
        }
    };

    static LOGOUT = (req, res) => {
        res.clearCookie("token");
        res.json({ success: true, msg: "Logged out" });
    };

    static IMAGE_KIT = () => {
        const imagekit = new ImageKit({
            publicKey: "public_iz6sM0TqQHI5bZ6dWzXmKIY2ciI=", // Replace with your ImageKit public key
            privateKey: "private_UQyekBIgdLrryoML/7eNiDvNQAM=", // Replace with your ImageKit private key
            urlEndpoint: "https://ik.imagekit.io/cxzryqyk6l", // Replace with your ImageKit endpoint
        });

        return imagekit;
    };
}
