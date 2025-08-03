// @ts-check
import mongoose, { startSession } from "mongoose";
import { POST } from "../modals/post.model.js";
import { POST_INTERACTION } from "../modals/postInteraction.model.js";
import { USER } from "../modals/user.model.js";
import { AuthController } from "./auth.controller.js";
import { CLAIM } from "../modals/claim.model.js";
import { ADMIN_CONFIG } from "../modals/adminConfig.model.js";

export class UserController {
    static getUserInfo = async (req, res) => {
        try {
            const userInfo = await USER.findOne({
                username: req.user.username,
            });
            if (!userInfo) throw new Error("No user found.");

            return res.json({
                msg: "user found",
                data: userInfo,
                success: true,
            });
        } catch (error) {
            console.log("getuser info", error);
            return res.json({ msg: "user not found", success: false });
        }
    };

    static createPost = async (req, res) => {
        try {
            const { caption } = req.body;

            if (!caption) {
                return res.status(400).json({
                    success: false,
                    msg: "Caption is required.",
                });
            }

            const username = req.user?.username;

            if (!username) {
                return res.status(401).json({
                    success: false,
                    msg: "Unauthorized. Missing user.",
                });
            }

            let fileURL = null;
            if (req.file) {
                const imageKit = AuthController.IMAGE_KIT();
                if (!imageKit) throw new Error("failed to upload file");

                const sanitizedFileName = req.file.originalname
                    .replace(/[^a-zA-Z0-9.]/g, "") // Remove special characters
                    .replace(/(.*)\.(?=.*\.)/, "$1_") // Ensure only one dot for extension
                    .slice(0, 8); // Limit filename to 8 characters

                const uploaded = await imageKit.upload({
                    file: req.file.buffer.toString("base64"),
                    fileName: `${Date.now()}_${sanitizedFileName}`,
                });

                fileURL = uploaded.url;
            }

            await POST.create({
                caption,
                ...(fileURL ? { fileURL } : {}),
                username,
            });

            return res.status(201).json({
                success: true,
                msg: "Post created successfully",
            });
        } catch (err) {
            console.error("Create Post Error:", err);
            return res.status(500).json({
                success: false,
                msg: "Internal Server Error",
            });
        }
    };

    static getFeed = async (req, res) => {
        try {
            const offset = parseInt(req.query.offset) || 0;
            const limit = parseInt(req.query.limit) || 5;

            if (offset < 0 || limit <= 0) {
                return res.status(400).json({
                    success: false,
                    msg: "Invalid pagination parameters.",
                });
            }

            const totalPosts = await POST.countDocuments();
            const posts = await POST.aggregate([
                // Sort by latest
                { $sort: { createdAt: -1 } },

                // Pagination
                { $skip: offset },
                { $limit: limit },

                // Lookup interactions
                {
                    $lookup: {
                        from: "postinteractions",
                        let: { postId: "$_id", username: req.user.username },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$post", "$$postId"] },
                                            {
                                                $eq: [
                                                    "$username",
                                                    "$$username",
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "userInteractions",
                    },
                },

                // Extract interaction types and compute flags
                {
                    $addFields: {
                        interactionTypes: {
                            $map: {
                                input: "$userInteractions",
                                as: "interaction",
                                in: "$$interaction.type",
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        hasLiked: { $in: ["like", "$interactionTypes"] },
                        hasViewed: { $in: ["view", "$interactionTypes"] },
                        isOwner: { $eq: ["$username", req.user.username] },
                    },
                },
                {
                    $project: {
                        interactionTypes: 0, // optional: hide temp field
                        userInteractions: 0, // optional: hide full interactions
                    },
                },
            ]);

            return res.status(200).json({
                success: true,
                msg: "Feed fetched successfully.",
                data: {
                    posts,
                    pagination: {
                        offset,
                        limit,
                        total: totalPosts,
                        hasMore: offset + limit < totalPosts,
                    },
                },
            });
        } catch (err) {
            console.error("Error fetching feed:", err);
            return res.status(500).json({
                success: false,
                msg: "Internal server error while fetching feed.",
            });
        }
    };

    static storeInteraction = async (req, res) => {
        try {
            const { postID, type } = req.body;
            if (!postID || !type || !["view", "like"].includes(type)) {
                throw new Error("Required fields are empty");
            }

            const exists = await POST_INTERACTION.findOne({
                username: req.user.username,
                type: type,
                post: postID,
            });

            if (exists) throw new Error(`You have already ${type} this post`);

            await POST_INTERACTION.create({
                post: new mongoose.Types.ObjectId(postID),
                type: type,
                username: req.user.username,
            });

            await POST.findOneAndUpdate(
                {
                    _id: postID,
                },
                {
                    $inc: {
                        ...(type === "like" ? { likes: 1 } : {}),
                        ...(type === "view" ? { views: 1 } : {}),
                    },
                }
            );

            res.json({ success: true, msg: "Interaction registered" });
        } catch (error) {
            return res.json({
                success: false,
                msg: error?.message || "something went wrong",
            });
        }
    };

    static claimSubmission = async (req, res) => {
        const session = await startSession();
        session.startTransaction();
        try {
            const { postID } = req.body;

            if (!postID) throw new Error("no post id was provided");

            const postDetails = await POST.findOne({ _id: postID }).session(
                session
            );
            if (!postDetails) throw new Error("invlid post id");

            if (req.user.username !== postDetails.username)
                throw new Error("You are not the owner");

            const exists = await CLAIM.findOne({
                user: req.user.username,
                post: new mongoose.Types.ObjectId(postID),
            }).session(session);

            if (exists) throw new Error("A claim already exists for this post");

            const adminConfigs = await ADMIN_CONFIG.findOne({}).session(
                session
            );

            const expectedEarning =
                Number(adminConfigs?.perLikeRate) * Number(postDetails.likes) +
                Number(adminConfigs?.perViewRate) * Number(postDetails.views);

            await CLAIM.create(
                [
                    {
                        username: req.user.username,
                        post: new mongoose.Types.ObjectId(postID),
                        expectedEarnings: expectedEarning,
                        logs: [
                            {
                                action: "created",
                                by: new mongoose.Types.ObjectId(req.user.id),
                            },
                        ],
                    },
                ],
                { session: session }
            );

            await POST.findOneAndUpdate(
                { _id: postID },
                {
                    $set: { claimed: true },
                }
            ).session(session);

            await session.commitTransaction();
            return res.json({ success: true, msg: "claim initiated" });
        } catch (error) {
            await session.abortTransaction();
            console.log("error while claim", error);
            return res.json({
                success: false,
                msg: error.message || "something went wrong",
            });
        }
    };

    static getMyClaims = async (req, res) => {
        try {
            const claims = await CLAIM.find({ username: req.user.username })
                .sort({ updatedAt: -1 })
                .lean();
            return res.json({ success: true, data: claims, msg: "got claims" });
        } catch (error) {
            return res.json({ success: false, msg: "failed" });
        }
    };

    static getMyClaimsToReview = async (req, res) => {
        try {
            const claims = await CLAIM.find({
                status: {
                    $in: ["in_review", "declined_deduction"],
                },
            })
                .sort({ updatedAt: -1 })
                .lean();
            return res.json({ success: true, data: claims, msg: "got claims" });
        } catch (error) {
            return res.json({ success: false, msg: "failed" });
        }
    };

    static userClaimDeductionAcknowledgement = async (req, res) => {
        try {
            const { postID, type } = req.body;

            await CLAIM.findOneAndUpdate(
                {
                    username: req.user.username,
                    post: new mongoose.Types.ObjectId(postID),
                },
                {
                    $set: {
                        status:
                            type === "approve"
                                ? "confirmed"
                                : "declined_deduction",
                    },
                    $push: {
                        logs: {
                            action: `deduction-${type}`,
                            by: new mongoose.Types.ObjectId(req.user.id),
                        },
                    },
                }
            );

            return res.json({ success: true, msg: "updated" });
        } catch (error) {
            return res.json({ success: false, msg: "failed" });
        }
    };
}
