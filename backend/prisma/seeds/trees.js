export const treeProblems = [
  {
    title: "Maximum Depth of Binary Tree",
    difficulty: "easy",
    category: "trees",
    description:
      "Given the root of a binary tree, return its maximum depth — the number of nodes along the longest path from the root down to the farthest leaf.",
    hints: [
      "Think recursively: depth = 1 + max(left depth, right depth).",
      "BFS level-by-level also works; count the levels.",
    ],
    testCases: [
      { input: { root: [3, 9, 20, null, null, 15, 7] }, expected: 3 },
      { input: { root: [1, null, 2] }, expected: 2 },
    ],
  },
  {
    title: "Validate Binary Search Tree",
    difficulty: "medium",
    category: "trees",
    description:
      "Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST requires every node's left subtree to contain only values strictly less than the node, and every node's right subtree to contain only values strictly greater.",
    hints: [
      "Pass down min/max bounds as you recurse.",
      "In-order traversal of a BST should produce a strictly increasing sequence.",
    ],
    testCases: [
      { input: { root: [2, 1, 3] }, expected: true },
      { input: { root: [5, 1, 4, null, null, 3, 6] }, expected: false },
    ],
  },
  {
    title: "Lowest Common Ancestor of a Binary Tree",
    difficulty: "medium",
    category: "trees",
    description:
      "Given a binary tree and two nodes `p` and `q`, find their lowest common ancestor (LCA). The LCA is the deepest node that has both `p` and `q` as descendants (a node is considered a descendant of itself).",
    hints: [
      "If root is null, p, or q — return root.",
      "Recurse left and right; if both return non-null, root is the LCA.",
    ],
    testCases: [
      {
        input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 1 },
        expected: 3,
      },
      {
        input: { root: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 4 },
        expected: 5,
      },
    ],
  },
];
