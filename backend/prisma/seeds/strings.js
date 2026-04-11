export const stringProblems = [
  {
    title: "Valid Parentheses",
    difficulty: "easy",
    category: "strings",
    description:
      "Given a string `s` containing only the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. A string is valid if every open bracket is closed by the same type of bracket in the correct order.",
    hints: [
      "Use a stack: push open brackets, pop on close brackets.",
      "If the stack is empty when you see a close bracket, it's invalid.",
    ],
    testCases: [
      { input: { s: "()" }, expected: true },
      { input: { s: "()[]{}" }, expected: true },
      { input: { s: "(]" }, expected: false },
      { input: { s: "([)]" }, expected: false },
    ],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
    category: "strings",
    description:
      "Given a string `s`, find the length of the longest substring that contains no repeating characters.",
    hints: [
      "Use a sliding window with two pointers.",
      "Track characters in the current window with a set or map.",
      "When a duplicate is found, move the left pointer past the previous occurrence.",
    ],
    testCases: [
      { input: { s: "abcabcbb" }, expected: 3 },
      { input: { s: "bbbbb" }, expected: 1 },
      { input: { s: "pwwkew" }, expected: 3 },
    ],
  },
  {
    title: "Valid Anagram",
    difficulty: "easy",
    category: "strings",
    description:
      "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise. An anagram uses all the original letters exactly once.",
    hints: [
      "Sort both strings and compare, or use a frequency map.",
      "A character frequency map: increment for s, decrement for t, then check all are zero.",
    ],
    testCases: [
      { input: { s: "anagram", t: "nagaram" }, expected: true },
      { input: { s: "rat", t: "car" }, expected: false },
    ],
  },
];
