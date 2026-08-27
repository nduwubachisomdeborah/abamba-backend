import mongoose from "mongoose";

const dispatchTrackerSchema = new mongoose.Schema(
    {
        state: { type: String, required: true, unique: true }, // "Imo" or "Abia"
        currentCompanyIndex: { type: Number, default: 0 },
        currentTurnCount: { type: Number, default: 0 }, // 0 or 1 (2 turns per company)
    },
    { timestamps: true }
);

const DispatchTracker = mongoose.model(
    "DispatchTracker",
    dispatchTrackerSchema
);

export default DispatchTracker;
