import { Schema, model } from "mongoose";

const claimSchema = new Schema(
    {
        username: { type: String, required: true },

        post: { type: Schema.Types.ObjectId, ref: "Post", required: true },

        status: {
            type: String,
            enum: [
                "in_review",
                "deduction_added",
                "declined_deduction",
                "confirmed",
                "approved",
                "rejected",
            ],
            default: "in_review",
        },

        reason: { type: String }, // only if deduction

        expectedEarnings: { type: Number, required: true },

        finalEarning: { type: Number, default: 0 },

        logs: [
            {
                action: String,
                by: { type: Schema.Types.ObjectId, ref: "User" },
                timestamp: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

claimSchema.index({ createdAt: -1 });
export const CLAIM = model("Claim", claimSchema);
