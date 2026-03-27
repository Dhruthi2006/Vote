const mongoose = require("mongoose");

const eligibleVoterSchema = new mongoose.Schema({
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("EligibleVoter", eligibleVoterSchema);