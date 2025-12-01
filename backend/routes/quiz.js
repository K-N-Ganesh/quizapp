import { Router } from "express";
const router = Router();
import mongoose from "mongoose";
import contestent from "../models/Contestant.js";



router.post('/contestant', async (req, res) => {
   try {
    const { students } = req.body;
    console.log("fdhdshf",students);
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.json({ status: "error", message: "No student data provided" });
    }

    await Contestant.insertMany(students);
    res.json({ status: "success", message: "Contestants added successfully" });
  } catch (err) {
    console.error(err);
    res.json({ status: "error", message: "Server error" });
  }
});
router.post("/question", async (req, res) => {
  try {
    const { className, questionText, options, correctAnswer } = req.body;

    // Validation 1: Required fields
    if (!className || !questionText || !Array.isArray(options) || options.length !== 4 || !correctAnswer) {
      return res.status(400).json({
        status: "error",
        message: "Provide className, questionText, 4 options, and correctAnswer."
      });
    }

    // Validation 2: className allowed?
    const validClasses = ["BCA-I", "BCA-II", "BCA-III"];
    if (!validClasses.includes(className)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid className. Must be BCA-I, BCA-II, or BCA-III."
      });
    }

    // Validation 3: Correct answer must match one of the options
    if (!options.includes(correctAnswer)) {
      return res.status(400).json({
        status: "error",
        message: "Correct answer must match one of the options."
      });
    }

    // Save to MongoDB
    const question = new Question({
      className,
      questionText,
      options,
      correctAnswer
    });

    await question.save();

    res.status(201).json({
      status: "success",
      message: "Question added successfully",
      question
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});


router.post("/", async (req, res) => {
  try {
    const { name , usn , responses } = req.body;
    let score = 0;

    const contestant1 = await Contestant.findOne({ usn: usn.trim() });
    if (!contestant1) {
        console.log("eror",usn,responses);
      return res.status(400).json({ status: "error", message: "Contestant not found" });
    }

    const questionIds = Object.keys(responses).map(id => new mongoose.Types.ObjectId(id));
    const questions = await Question.find({ _id: { $in: questionIds } });

    questions.forEach((question) => {
      const qid = question._id.toString();
      if (responses[qid] === question.correctAnswer) {
        score++;
      }
    });

    contestant1.results.push({
      responses,
      score
    });

    await contestant1.save();

    res.json({ status: "success", score });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});
// routes/quiz.js (add this route)
import Question from "../models/Question.js";
import Contestant from "../models/Contestant.js";

function getClassFromUSN(usn) {
  if (usn.includes("TY23")) return "BCA-III";
  if (usn.includes("TY24")) return "BCA-II";
  if (usn.includes("TY25")) return "BCA-I";
  return null; // unknown
}
  router.get("/random", async (req, res) => {
  try {
    const { usn } = req.query;
console.log("whdwe",usn)
    if (!usn) {
      return res.status(400).json({ error: "USN is required" });
    }

    const contestant = await Contestant.findOne({ usn: usn.trim() });

    if (!contestant) {
      return res.status(404).json({ error: "Contestant not found" });
    }

    // Check if quiz was already attempted
    if (contestant.results && contestant.results.length > 0) {
      return res.status(403).json({ error: "Quiz already attempted" });
    }

    // Send random questions
    let skip = 0;
let limit = 5;

// if (usn >= "01" && usn <= "30") {
//   skip = 0; // First 15 questions
// } else if (usn >= "31" && usn <= "64") {
//   skip = 15; // Next 15 questions
// } else {
//   return res.status(400).json({ error: 'Invalid USN range' });
// }

const className = getClassFromUSN(usn);
if (!className) {
      return res.status(400).json({ status: "error", message: "Invalid USN format." });
    }
const questions = await Question.aggregate([
  { $match: { className } },
  { $sort: { _id: 1 } },
  { $sample: { size: 5 } },
  {
    $project: {
      questionText: 1,
      options: 1,
    }
  }
]);

const response = {
  name: contestant.name,
  questions: questions
};
console.log(skip,questions);

    res.json(response);

  } catch (err) {
    console.error("Error fetching quiz questions:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

export default router;
