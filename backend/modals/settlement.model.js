import { Schema, model } from "mongoose";

const settlementSchema = new Schema({
    claim: { type: Schema.Types.ObjectId, ref: "Claim", required: true },

    approvedAmount: Number,

    totalDeductions: Number,

    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
});

export const SETTLEMENT = model("SettlementReport", settlementSchema);
