import dotenv from"dotenv";
dotenv.config();
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });


async function main() {
  const existing = await prisma.problem.count();
  if (existing > 0) {
    console.log("Seed data already exists. Skipping.");
    return;
  }
  await prisma.problem.createMany({
    data: [
      {
        title: "Two Sum",
        difficulty: "easy",
        category: "array",
        description:
          "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        hints: JSON.stringify([
          "Try using a hash map to store values you've seen.",
          "For each number, check if (target - number) exists in the map.",
        ]),
        testCases: JSON.stringify([
          { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
          { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
          { input: { nums: [3, 3], target: 6 }, expected: [0, 1] },
        ]),
      },
      {
        title: "Valid Parentheses",
        difficulty: "easy",
        category: "stack",
        description:
          "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if: open brackets must be closed by the same type of brackets, and open brackets must be closed in the correct order.",
        hints: JSON.stringify([
          "Use a stack to keep track of opening brackets.",
          "When you see a closing bracket, check if it matches the top of the stack.",
        ]),
        testCases: JSON.stringify([
          { input: { s: "()" }, expected: true },
          { input: { s: "()[]{}" }, expected: true },
          { input: { s: "(]" }, expected: false },
        ]),
      },
      {
        title: "Reverse Linked List",
        difficulty: "easy",
        category: "linked list",
        description:
          "Given the head of a singly linked list, reverse the list, and return the reversed list.",
        hints: JSON.stringify([
          "You can solve this iteratively using three pointers: prev, curr, next.",
          "Or recursively — think about what the base case is.",
        ]),
        testCases: JSON.stringify([
          { input: { head: [1, 2, 3, 4, 5] }, expected: [5, 4, 3, 2, 1] },
          { input: { head: [1, 2] }, expected: [2, 1] },
          { input: { head: [1] }, expected: [1] },
        ]),
      },
      {
        title: "Longest Substring Without Repeating Characters",
        difficulty: "medium",
        category: "sliding window",
        description:
          "Given a string s, find the length of the longest substring without repeating characters.",
        hints: JSON.stringify([
          "Use a sliding window with two pointers.",
          "Use a Set to track characters in the current window.",
        ]),
        testCases: JSON.stringify([
          { input: { s: "abcabcbb" }, expected: 3 },
          { input: { s: "bbbbb" }, expected: 1 },
          { input: { s: "pwwkew" }, expected: 3 },
        ]),
      },
      {
        title: "Binary Tree Level Order Traversal",
        difficulty: "medium",
        category: "tree",
        description:
          "Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).",
        hints: JSON.stringify([
          "Use a queue (BFS) to process nodes level by level.",
          "Track how many nodes are at each level using the queue size.",
        ]),
        testCases: JSON.stringify([
          {
            input: { root: [3, 9, 20, null, null, 15, 7] },
            expected: [[3], [9, 20], [15, 7]],
          },
          { input: { root: [1] }, expected: [[1]] },
          { input: { root: [] }, expected: [] },
        ]),
      },
      {
        title: "Coin Change",
        difficulty: "hard",
        category: "dynamic programming",
        description:
          "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.",
        hints: JSON.stringify([
          "Think about dynamic programming — build up solutions for smaller amounts first.",
          "dp[i] = minimum coins needed to make amount i.",
        ]),
        testCases: JSON.stringify([
          { input: { coins: [1, 5, 11], amount: 15 }, expected: 3 },
          { input: { coins: [2], amount: 3 }, expected: -1 },
          { input: { coins: [1], amount: 0 }, expected: 0 },
        ]),
      },
    ],
  });

  console.log("Seed data inserted successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
