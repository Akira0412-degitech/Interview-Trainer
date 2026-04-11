import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

export function chooseProblem(problems, difficulty) {
  const filtered = problems.filter((p) => p.difficulty === difficulty);
  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

router.get("/", async (req, res) => {
  const { difficulty, category } = req.query;
  const problems = await prisma.problem.findMany({
    where: {
      ...(difficulty ? { difficulty } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { id: "asc" },
  });

  const parsed = problems.map((p) => ({
    ...p,
    hints: p.hints,
    testCases: p.testCases,
  }));

  res.json(parsed);
});

router.get("/:id", async (req, res) => {
  const problem = await prisma.problem.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!problem) return res.status(404).json({ error: "Problem not found" });

  res.json({
    ...problem,
    hints: JSON.parse(problem.hints),
    testCases: JSON.parse(problem.testCases),
  });
});

export default router;
