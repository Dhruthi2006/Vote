const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
{
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true
  },

  fullName: {
    type: String,
    required: true
  },

  position: {
    type: String,
    required: true
  },

  department: {
    type: String
  },

  manifesto: {
    type: String
  },

  photoUrl: {
    type: String
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Candidate", candidateSchema);