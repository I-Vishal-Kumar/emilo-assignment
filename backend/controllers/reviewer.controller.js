// @ts-check
import mongoose, { mongo } from "mongoose";
import { CLAIM } from "../modals/claim.model.js";
import { SETTLEMENT } from "../modals/settlement.model.js";

export class Reviewer {
    static reviewClaim = async (req, res) => {
        try {
            const claimId = req.params.claimId;
            const { status, finalEarning, reason } = req.body;

            if (!claimId) throw new Error("no post id presetn");

            if (["approved", "rejected"].includes(status)) {
                // admin has approved or rejected.
                // create settlement report.
                const claimDetails = await CLAIM.findById(claimId);

                const exists = await SETTLEMENT.findOne({
                    claim: new mongoose.Types.ObjectId(claimId),
                });

                if (exists) throw new Error("settlement already exists");

                const isDeducted = Math.abs(
                    Number(claimDetails?.finalEarning || 0) -
                        Number(claimDetails?.expectedEarnings || 0)
                );

                await SETTLEMENT.create({
                    approvedAmount: finalEarning,
                    approvedBy: new mongoose.Types.ObjectId(req.user.id),
                    claim: new mongoose.Types.ObjectId(claimId),
                    totalDeductions: isDeducted,
                });
            }

            await CLAIM.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(claimId) },
                {
                    $set: {
                        status,
                        finalEarning,
                        reason,
                    },
                    $push: {
                        logs: {
                            action: `status-changed-to-${status}`,
                            by: new mongoose.Types.ObjectId(req.user.id),
                        },
                    },
                }
            );

            return res.json({ success: true, msg: "updated" });
        } catch (error) {
            console.log(error);
            return res.json({
                success: false,
                msg: error.message || "something went wrong",
            });
        }
    };
}
