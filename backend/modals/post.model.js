import { Schema, model } from "mongoose";

const postSchema = new Schema(
    {
        username: { type: String, required: true },

        caption: String,

        fileURL: String,

        likes: { type: Number, default: 0 },

        views: { type: Number, default: 0 },

        claimed: { type: Boolean, default: false },
    },
    { timestamps: true }
);

postSchema.index({ createdAt: -1 });
export const POST = model("Post", postSchema);
