export const dpProblems = [
  {
    title: "Climbing Stairs",
    difficulty: "easy",
    category: "dynamic-programming",
    description:
      "You are climbing a staircase with `n` steps. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    hints: [
      "ways(n) = ways(n-1) + ways(n-2) — it's just Fibonacci.",
      "You only need the last two values; no need for a full DP array.",
    ],
    testCases: [
      { input: { n: 2 }, expected: 2 },
      { input: { n: 3 }, expected: 3 },
      { input: { n: 5 }, expected: 8 },
    ],
  },
  {
    title: "Coin Change",
    difficulty: "medium",
    category: "dynamic-programming",
    description:
      "Given an array of coin denominations `coins` and a total amount `amount`, return the fewest number of coins needed to make up that amount. Return -1 if it cannot be done.",
    hints: [
      "Build a DP array where dp[i] = min coins to make amount i.",
      "For each amount, try every coin and take the minimum.",
    ],
    testCases: [
      { input: { coins: [1, 5, 6, 9], amount: 11 }, expected: 2 },
      { input: { coins: [1, 2, 5], amount: 11 }, expected: 3 },
      { input: { coins: [2], amount: 3 }, expected: -1 },
    ],
  },
  {
    title: "Longest Increasing Subsequence",
    difficulty: "medium",
    category: "dynamic-programming",
    description:
      "Given an integer array `nums`, return the length of the longest strictly increasing subsequence.",
    hints: [
      "dp[i] = length of LIS ending at index i.",
      "For each i, iterate over all j < i and extend if nums[j] < nums[i].",
      "An O(n log n) solution using binary search on a patience-sort array also exists.",
    ],
    testCases: [
      { input: { nums: [10, 9, 2, 5, 3, 7, 101, 18] }, expected: 4 },
      { input: { nums: [0, 1, 0, 3, 2, 3] }, expected: 4 },
      { input: { nums: [7, 7, 7, 7, 7] }, expected: 1 },
    ],
  },
  {
    title: "Word Break",
    difficulty: "hard",
    category: "dynamic-programming",
    description:
      "Given a string `s` and a dictionary `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.",
    hints: [
      "dp[i] = true if s[0..i] can be formed from the dictionary.",
      "For each position i, check all substrings s[j..i] where dp[j] is true.",
    ],
    testCases: [
      {
        input: { s: "leetcode", wordDict: ["leet", "code"] },
        expected: true,
      },
      {
        input: { s: "applepenapple", wordDict: ["apple", "pen"] },
        expected: true,
      },
      {
        input: { s: "catsandog", wordDict: ["cats", "dog", "sand", "and", "cat"] },
        expected: false,
      },
    ],
  },
];
