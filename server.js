require("dotenv").config()

const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const path = require("path")
const mongoose = require("mongoose")

const connectDB = require("./config/db")

const User = require("./models/User")
const Election = require("./models/Election")
const Candidate = require("./models/Candidate")
const Vote = require("./models/Vote")

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static("public"))

connectDB()

const JWT_SECRET = process.env.JWT_SECRET

// ================= AUTH MIDDLEWARE =================

const authenticateToken = (req, res, next) => {

  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {

    if (err) {
      return res.status(403).json({ error: "Invalid token" })
    }

    req.user = user
    next()

  })

}

// ================= ADMIN MIDDLEWARE =================

const isAdmin = (req, res, next) => {

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" })
  }

  next()

}

// ================= REGISTER =================

app.post("/api/auth/register", async (req, res) => {

  try {

    const { studentId, email, password, fullName } = req.body

    const existingUser = await User.findOne({
      $or: [{ studentId }, { email }]
    })

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await User.create({
      studentId,
      email,
      passwordHash,
      fullName
    })

    res.status(201).json({ message: "Registration successful", user })

  } catch (error) {

    console.error(error)
    res.status(500).json({ error: "Registration failed" })

  }

})

// ================= LOGIN =================

app.post("/api/auth/login", async (req, res) => {

  try {

    const { studentId, password } = req.body

    const user = await User.findOne({ studentId })

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash)

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const token = jwt.sign(
      {
        id: user._id,
        studentId: user.studentId,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    )

    res.json({
      token,
      user
    })

  } catch (error) {

    console.error(error)
    res.status(500).json({ error: "Login failed" })

  }

})

// ================= GET CURRENT USER =================

app.get("/api/auth/me", authenticateToken, async (req, res) => {

  try {

    const user = await User.findById(req.user.id).select("-passwordHash")

    res.json(user)

  } catch (error) {

    res.status(500).json({ error: "Failed to fetch user" })

  }

})

// ================= GET ALL ELECTIONS =================

app.get("/api/elections", authenticateToken, async (req, res) => {

  try {

    const elections = await Election.find().sort({ createdAt: -1 })

    res.json(elections)

  } catch (error) {

    res.status(500).json({ error: "Failed to fetch elections" })

  }

})



app.get("/api/elections/active", async (req, res) => {
  try {
    const election = await Election.findOne({ status: "active" });

    if (!election) {
      return res.status(404).json({ error: "No active election" });
    }

    res.json(election);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CREATE ELECTION (ADMIN) =================

app.post("/api/elections", authenticateToken, isAdmin, async (req, res) => {

  try {

    const { title, description, startDate, endDate } = req.body

    const election = await Election.create({
      title,
      description,
      startDate,
      endDate,
      status: "upcoming"
    })

    res.status(201).json(election)

  } catch (error) {

    res.status(500).json({ error: "Failed to create election" })

  }

})

// ================= ADD CANDIDATE =================

app.post("/api/candidates", authenticateToken, isAdmin, async (req, res) => {

  try {

    const { electionId, fullName, position, department, manifesto, photoUrl } = req.body

    const candidate = await Candidate.create({
      electionId,
      fullName,
      position,
      department,
      manifesto,
      photoUrl
    })

    res.status(201).json(candidate)

  } catch (error) {

    res.status(500).json({ error: "Failed to add candidate" })

  }

})

// ================= GET CANDIDATES =================

app.get("/api/elections/:electionId/candidates", authenticateToken, async (req, res) => {

  try {

    const candidates = await Candidate.find({
      electionId: req.params.electionId
    })

    res.json(candidates)

  } catch (error) {

    res.status(500).json({ error: "Failed to fetch candidates" })

  }

})

// ================= CAST VOTE =================

app.post("/api/vote", authenticateToken, async (req, res) => {

  try {

    const { electionId, candidateId } = req.body
    const userId = req.user.id

    const existingVote = await Vote.findOne({
      electionId,
      userId
    })

    if (existingVote) {
      return res.status(400).json({ error: "You already voted" })
    }

    const vote = await Vote.create({
      electionId,
      candidateId,
      userId
    })

    await User.findByIdAndUpdate(userId, { hasVoted: true })

    res.json({ message: "Vote cast successfully", vote })

  } catch (error) {

    res.status(500).json({ error: "Failed to cast vote" })

  }

})

// ================= RESULTS =================
app.get("/api/elections/:electionId/results", authenticateToken, async (req, res) => {
  try {
    const { electionId } = req.params;

    const election = await Election.findById(electionId);

    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }

    const userRole = req.user.role;

    // ✅ Correct condition
    if (userRole !== "admin" && election.status !== "completed") {
      return res.status(403).json({
        error: "Results not available yet"
      });
    }

    const results = await Vote.aggregate([
      {
        $match: {
          electionId: new mongoose.Types.ObjectId(electionId)
        }
      },
      {
        $group: {
          _id: "$candidateId",
          vote_count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "candidates",
          localField: "_id",
          foreignField: "_id",
          as: "candidate"
        }
      },
      {
        $unwind: "$candidate"
      }
    ]);

    const formattedResults = results.map(r => ({
      fullName: r.candidate.fullName,
      position: r.candidate.position,
      department: r.candidate.department,
      vote_count: r.vote_count
    }));

    const totalVotes = formattedResults.reduce((sum, r) => sum + r.vote_count, 0);

    res.json({
      election,
      results: formattedResults,
      totalVotes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// ================= FRONTEND ROUTES =================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"))
})

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"))
})

app.get("/vote", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "vote.html"))
})

app.get("/results", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "results.html"))
})

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"))
})





app.patch("/api/elections/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const updatedElection = await Election.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedElection) {
      return res.status(404).json({ error: "Election not found" });
    }

    res.json({ message: "Status updated", election: updatedElection });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update election status" });
  }
});


app.get("/api/admin/stats", async (req, res) => {
  try {
    const totalStudents = await User.countDocuments();
    const totalVotes = await Vote.countDocuments();
    const activeElections = await Election.countDocuments({ status: "active" });
    const completedElections = await Election.countDocuments({ status: "completed" });

    res.json({
      totalStudents,
      totalVotes,
      activeElections,
      completedElections
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ================= START SERVER =================

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})