const mongoose = require("mongoose");

const electionSchema = new mongoose.Schema(
{
  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  startDate: {
    type: Date,
    required: true
  },

  endDate: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["upcoming", "active", "completed"],
    default: "upcoming"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Election", electionSchema);