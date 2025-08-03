import mongoose, { Schema, model } from "mongoose";

const postInteraction = new Schema(
    {
        username: { type: String, required: true },

        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: true,
        },

        type: { type: String, enum: ["view", "like"], required: true },
    },
    { timestamps: true }
);

postInteraction.index({ createdAt: -1 });
export const POST_INTERACTION = model("PostInteraction", postInteraction);
