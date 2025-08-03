// @ts-check
import { CLAIM } from "../modals/claim.model.js";
import { SETTLEMENT } from "../modals/settlement.model.js";

export class Admin {
    static getConfirmedClaims = async (req, res) => {
        try {
            const offset = parseInt(req.query.offset) || 0;
            const limit = parseInt(req.query.limit) || 5;

            if (offset < 0 || limit <= 0) {
                return res.status(400).json({
                    success: false,
                    msg: "Invalid pagination parameters.",
                });
            }
            const totalPosts = await CLAIM.find({
                status: "confirmed",
            }).countDocuments();

            const claims = await CLAIM.find({
                status: "confirmed",
            })
                .sort({ createdat: -1 })
                .skip(offset)
                .limit(limit);

            return res.json({
                success: true,
                data: {
                    claims,
                    pagination: {
                        offset,
                        limit,
                        total: totalPosts,
                        hasMore: offset + limit < totalPosts,
                    },
                },
                msg: "got claims",
            });
        } catch (error) {
            console.log(error);
            return res.json({
                success: false,
                msg: error.message || "something went wrong",
            });
        }
    };

    static getSettlement = async (req, res) => {
        try {
            const offset = parseInt(req.query.offset) || 0;
            const limit = parseInt(req.query.limit) || 5;

            if (offset < 0 || limit <= 0) {
                return res.status(400).json({
                    success: false,
                    msg: "Invalid pagination parameters.",
                });
            }

            const totalPosts = await CLAIM.find({
                status: "approved",
            }).countDocuments();

            const settlements = await SETTLEMENT.aggregate([
                {
                    $match: {},
                },
                {
                    $skip: offset,
                },
                {
                    $limit: limit,
                },
                {
                    $lookup: {
                        from: "claims",
                        localField: "claim",
                        foreignField: "_id",
                        as: "claimData",
                    },
                },
                {
                    $unwind: {
                        path: "$claimData",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "approvedBy",
                        foreignField: "_id",
                        as: "approverData",
                    },
                },
                {
                    $unwind: {
                        path: "$approverData",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        claim: 1,
                        approvedAmount: 1,
                        totalDeductions: 1,
                        approvedBy: 1,
                        createdAt: "$claimData.createdAt",
                        updatedAt: "$claimData.updatedAt",
                        logs: "$claimData.logs",
                        postOwnerName: "$claimData.username",
                        approverName: "$approverData.username",
                    },
                },
            ]);

            return res.json({
                success: true,
                data: {
                    settlements,
                    pagination: {
                        offset,
                        limit,
                        total: totalPosts,
                        hasMore: offset + limit < totalPosts,
                    },
                },
                msg: "got claims",
            });
        } catch (error) {
            console.log(error);
            return res.json({
                success: false,
                msg: error.message || "something went wrong",
            });
        }
    };
}
