const express = require("express");
const router = express.Router();
const { jwtAuthMiddleWare } = require("../jwt");
const User = require("../models/user");
const Candidate = require("../models/candidate");

const checkAdminRole = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user.role === "admin";
  } catch (error) {
    return false;
  }
};

router.post("/", jwtAuthMiddleWare, async (req, res) => {
  try {
    if (!(await checkAdminRole(req.user.id))) {
      return res.status(403).json({ message: "user does not has admin role" });
    }
    const data = req.body;
    const newCandidate = new Candidate(data);
    const response = await newCandidate.save();
    res.status(200).json({ response: response, message: "candidate added" });
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
});

router.put("/:candidateID", jwtAuthMiddleWare, async (req, res) => {
  try {
    if (!(await checkAdminRole(req.user.id))) {
      return res.status(403).json({ message: "user does not has admin role" });
    }
    const candidateID = req.params.candidateID;
    const updatedCandidateData = req.body;

    const response = await Candidate.findByIdAndUpdate(
      candidateID,
      updatedCandidateData,
      {
        new: true, //return the updated document
        runValidators: true, // run mongoose validation
      }
    );
    if (!response) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    console.log("Candidate data updated");
    res.status(200).json({ response, message: "Candidate data updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:candidateID", jwtAuthMiddleWare, async (req, res) => {
  try {
    if (!(await checkAdminRole(req.user.id))) {
      return res.status(403).json({ message: "user does not has admin role" });
    }
    const candidateID = req.params.candidateID;

    const response = await Candidate.findByIdAndDelete(candidateID);

    if (!response) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    console.log("Candidate deleted");
    res.status(200).json({ response, message: "candidate Deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/vote/:candidateID", jwtAuthMiddleWare, async (req, res) => {
  //no admin can vote
  //user can only vote once

  candidateID = req.params.candidateID;
  userId = req.user.id;
  try {
    const candidate = await Candidate.findById(candidateID);
    if (!candidateID) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVoted) {
      return res.status(400).json({ error: "You already voted" });
    }

    if (user.role === "admin") {
      res.status(403).json({ error: "admin is not allowed to vote" });
    }

    candidate.votes.push({ user: userId });
    candidate.voteCount++;
    await candidate.save();

    user.isVoted = true;
    await user.save();

    res.status(200).json({ message: "Vote Recorded successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/vote/count", async (req, res) => {
  try {
    const candidate = await Candidate.find().sort({ voteCount: "desc" });

    const voteRecord = candidate.map((data) => {
      return { party: data.party, count: data.voteCount };
    });
    return res.status(200).json({ voteRecord });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/candidateList", async (req, res) => {
  try {
    const candidateList = await Candidate.find();
    return res
      .status(200)
      .json({ candidateList, message: "Candidate fetched sucessfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
