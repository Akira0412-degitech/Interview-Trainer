export const arrayProblems = [
  {
    title: "Two Sum",
    difficulty: "easy",
    category: "arrays",
    description:
      "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. You may assume exactly one solution exists, and you may not use the same element twice.",
    hints: [
      "Try using a hash map to store values you've seen so far.",
      "For each number, check if (target - number) exists in your map.",
    ],
    testCases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, expected: [0, 1] },
    ],
  },
  {
    title: "Best Time to Buy and Sell Stock",
    difficulty: "easy",
    category: "arrays",
    description:
      "You are given an array `prices` where `prices[i]` is the price of a stock on day `i`. Find the maximum profit you can achieve from a single buy-sell transaction. Return 0 if no profit is possible.",
    hints: [
      "Track the minimum price seen so far as you iterate.",
      "At each day, calculate profit if you sold today.",
    ],
    testCases: [
      { input: { prices: [7, 1, 5, 3, 6, 4] }, expected: 5 },
      { input: { prices: [7, 6, 4, 3, 1] }, expected: 0 },
    ],
  },
  {
    title: "Container With Most Water",
    difficulty: "medium",
    category: "arrays",
    description:
      "Given an integer array `height` of length `n`, where each element represents the height of a vertical line, find two lines that together with the x-axis form a container that holds the most water. Return the maximum amount of water.",
    hints: [
      "Use two pointers starting at both ends.",
      "Move the pointer with the shorter height inward.",
    ],
    testCases: [
      { input: { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] }, expected: 49 },
      { input: { height: [1, 1] }, expected: 1 },
    ],
  },
];
