require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const connectDB = require("./config/db");

const User = require("./models/User");
const Election = require("./models/Election");
const Candidate = require("./models/Candidate");
const Vote = require("./models/Vote");
const EligibleVoter = require("./models/EligibleVoter");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

connectDB();

const JWT_SECRET = process.env.JWT_SECRET;

// ================= AUTH MIDDLEWARE =================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });

    req.user = user;
    next();
  });
};

// ================= ADMIN MIDDLEWARE =================
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// ================= REGISTER =================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { studentId, email, password, fullName } = req.body;

    const existingUser = await User.findOne({
      $or: [{ studentId }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      studentId,
      email,
      passwordHash,
      fullName,
      role: "student" // default
    });

    res.status(201).json({ message: "Registration successful", user });

  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// ================= LOGIN =================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { studentId, password } = req.body;

    const user = await User.findOne({ studentId });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: user._id,
        studentId: user.studentId,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token, user });

  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// ================= GET CURRENT USER =================
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash");
  res.json(user);
});

// ================= GET ELECTIONS =================
app.get("/api/elections", authenticateToken, async (req, res) => {
  const elections = await Election.find().sort({ createdAt: -1 });
  res.json(elections);
});

// ================= ACTIVE ELECTION =================
app.get("/api/elections/active", async (req, res) => {
  const election = await Election.findOne({ status: "active" });
  if (!election) return res.status(404).json({ error: "No active election" });
  res.json(election);
});

// ================= CREATE ELECTION =================
app.post("/api/elections", authenticateToken, isAdmin, async (req, res) => {
  const { title, description, startDate, endDate } = req.body;

  const election = await Election.create({
    title,
    description,
    startDate,
    endDate,
    status: "upcoming"
  });

  res.json(election);
});

// ================= UPDATE STATUS =================
app.patch("/api/elections/:id/status", authenticateToken, isAdmin, async (req, res) => {
  const { status } = req.body;

  const updated = await Election.findByIdAndUpdate(
    req.params.id,
    { status },
    { returnDocument: "after" }
  );

  res.json(updated);
});

// ================= ADD CANDIDATE =================
app.post("/api/candidates", authenticateToken, isAdmin, async (req, res) => {
  const candidate = await Candidate.create(req.body);
  res.json(candidate);
});

// ================= GET CANDIDATES =================
app.get("/api/elections/:electionId/candidates", authenticateToken, async (req, res) => {
  const candidates = await Candidate.find({ electionId: req.params.electionId });
  res.json(candidates);
});

// ================= ASSIGN VOTERS =================
app.post("/api/elections/:electionId/assign-voters", authenticateToken, isAdmin, async (req, res) => {
  const { electionId } = req.params;
  const { studentIds } = req.body;

  await EligibleVoter.deleteMany({ electionId });

  const voters = studentIds.map(id => ({
    electionId,
    studentId: id
  }));

  await EligibleVoter.insertMany(voters);

  res.json({ message: "Voters assigned" });
});

// ================= CHECK ELIGIBILITY =================
app.get("/api/elections/:electionId/eligible", authenticateToken, async (req, res) => {
  const isEligible = await EligibleVoter.findOne({
    electionId: req.params.electionId,
    studentId: req.user.id
  });

  res.json({ eligible: !!isEligible });
});

// ================= GET STUDENTS =================
app.get("/api/admin/students", authenticateToken, isAdmin, async (req, res) => {
  const students = await User.find({ role: "student" });
  res.json(students);
});


app.get("/api/elections/:id/assigned-students", authenticateToken, async (req, res) => {
  try {
    const voters = await EligibleVoter.find({
      electionId: req.params.id
    });

    const studentIds = voters.map(v => v.studentId.toString());

    res.json(studentIds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= CAST VOTE =================
app.post("/api/vote", authenticateToken, async (req, res) => {
  const { electionId, candidateId } = req.body;

  const eligible = await EligibleVoter.findOne({
    electionId,
    studentId: req.user.id
  });

  if (!eligible) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const existing = await Vote.findOne({
    electionId,
    userId: req.user.id
  });

  if (existing) {
    return res.status(400).json({ error: "Already voted" });
  }

  await Vote.create({
    electionId,
    candidateId,
    userId: req.user.id
  });

  res.json({ message: "Vote submitted" });
});

app.get("/api/elections/:electionId/voted", authenticateToken, async (req, res) => {
  try {
    const existingVote = await Vote.findOne({
      electionId: req.params.electionId,
      userId: req.user.id
    });

    res.json({ hasVoted: !!existingVote });

  } catch (err) {
    res.status(500).json({ error: "Failed to check vote status" });
  }
});

// ================= RESULTS =================
app.get("/api/elections/:electionId/results", authenticateToken, async (req, res) => {
  const { electionId } = req.params;

  const election = await Election.findById(electionId);

  if (!election) return res.status(404).json({ error: "Not found" });

  if (req.user.role !== "admin" && election.status !== "completed") {
    return res.status(403).json({ error: "Not available" });
  }

  const candidates = await Candidate.aggregate([
    {
      $match: { electionId: new mongoose.Types.ObjectId(electionId) }
    },
    {
      $lookup: {
        from: "votes",
        localField: "_id",
        foreignField: "candidateId",
        as: "votes"
      }
    },
    {
      $addFields: {
        vote_count: { $size: "$votes" }
      }
    },
    {
      $project: {
        fullName: 1,
        position: 1,
        department: 1,
        vote_count: 1
      }
    }
  ]);

  const totalVotes = candidates.reduce((sum, c) => sum + c.vote_count, 0);

  res.json({ election, results: candidates, totalVotes });
});

// ================= ADMIN STATS =================
app.get("/api/admin/stats", authenticateToken, isAdmin, async (req, res) => {
  const totalStudents = await User.countDocuments({ role: "student" });
  const totalVotes = await Vote.countDocuments();
  const activeElections = await Election.countDocuments({ status: "active" });
  const completedElections = await Election.countDocuments({ status: "completed" });

  res.json({
    totalStudents,
    totalVotes,
    activeElections,
    completedElections
  });
});

// ================= FRONTEND ROUTES =================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public/login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "public/register.html")));
app.get("/vote", (req, res) => res.sendFile(path.join(__dirname, "public/vote.html")));
app.get("/results", (req, res) => res.sendFile(path.join(__dirname, "public/results.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public/admin.html")));

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});