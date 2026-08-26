import mongoose from "mongoose";

// Counter model for generating sequential order IDs
const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

const Counter = mongoose.model("Counter", counterSchema);

// Function to get the next sequence value for a given counter
export const getNextSequence = async (counterName) => {
  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

export default Counter;
