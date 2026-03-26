const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  studentId: {
    type: String,
    required: true,
    unique: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  fullName: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["student", "admin"],
    default: "student"
  },

  hasVoted: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("User", userSchema);