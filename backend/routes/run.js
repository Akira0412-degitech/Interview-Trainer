import { Router } from "express";

const SANDBOX_URL = process.env.SANDBOX_URL || "http://localhost:8888";

const PROBLEMS = {
  1: {
    fn: "twoSum",
    compare: "sortedArray",
    run: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
    ],
    submit: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[1, 2, 3, 4, 5], 9], expected: [3, 4] },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
    ],
  },
  2: {
    fn: "isValid",
    compare: "strict",
    run: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
    ],
    submit: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
      { args: ["{[]}"], expected: true },
      { args: [""], expected: true },
    ],
  },
};

function buildPythonHarness(code, fn, testCases, compare) {
  const tc = JSON.stringify(testCases);
  const sortedCmp = compare === "sortedArray"
    ? "sorted(list(got)) == sorted(list(tc['expected']))"
    : "got == tc['expected']";
  return `import json, sys
${code}
test_cases = ${tc}
results = []
for tc in test_cases:
    try:
        got = ${fn}(*tc['args'])
        if got is None:
            ok = False
        else:
            ok = ${sortedCmp}
    except Exception as e:
        got = str(e)
        ok = False
    results.append({'passed': ok, 'output': got, 'expected': tc['expected'], 'args': tc['args']})
print(json.dumps(results))
`;
}

function buildJSHarness(code, fn, testCases, compare) {
  const tc = JSON.stringify(testCases);
  const cmp = compare === "sortedArray"
    ? "JSON.stringify([...got].sort((a,b)=>a-b))===JSON.stringify([...tc.expected].sort((a,b)=>a-b))"
    : "JSON.stringify(got)===JSON.stringify(tc.expected)";
  return `${code}
const __cases = ${tc};
const __results = __cases.map(tc => {
  try {
    const got = ${fn}(...tc.args);
    const passed = ${cmp};
    return { passed, output: got, expected: tc.expected, args: tc.args };
  } catch(e) {
    return { passed: false, output: e.message, expected: tc.expected, args: tc.args };
  }
});
console.log(JSON.stringify(__results));
`;
}

function formatResults(results, mode) {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;
  let out = allPassed
    ? mode === "submit"
      ? `✓ Accepted\n\n${total} / ${total} test cases passed`
      : `✓ All test cases passed`
    : `✗ ${passed} / ${total} test cases passed`;
  out += "\n";
  results.forEach((r, i) => {
    out += `\nTest ${i + 1}: ${r.passed ? "✓ Passed" : "✗ Failed"}\n`;
    out += `  Input:    ${JSON.stringify(r.args)}\n`;
    out += `  Expected: ${JSON.stringify(r.expected)}\n`;
    out += `  Output:   ${JSON.stringify(r.output)}\n`;
  });
  return { status: allPassed ? "accepted" : "wrong_answer", output: out };
}

const router = Router();

router.post("/", async (req, res) => {
  const { code, language, problemId, mode = "run" } = req.body;

  const problem = PROBLEMS[problemId];
  if (!problem) {
    return res.json({
      status: "error",
      output: `Execution not configured for problem ${problemId} yet.`,
    });
  }

  if (language !== "python" && language !== "javascript") {
    return res.json({
      status: "error",
      output: `Live execution is supported for Python and JavaScript only.\nFor ${language}, test locally with your preferred compiler.`,
    });
  }

  const testCases = mode === "submit" ? problem.submit : problem.run;
  const harness = language === "python"
    ? buildPythonHarness(code, problem.fn, testCases, problem.compare)
    : buildJSHarness(code, problem.fn, testCases, problem.compare);

  try {
    const sandboxRes = await fetch(`${SANDBOX_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: harness, language, timeout: 5000 }),
      signal: AbortSignal.timeout(10000),
    });

    if (!sandboxRes.ok) {
      return res.json({ status: "error", output: "Sandbox service error" });
    }

    const { stdout, stderr, timedOut } = await sandboxRes.json();

    if (timedOut) {
      return res.json({ status: "error", output: "Time Limit Exceeded (5s)" });
    }

    if (!stdout && stderr) {
      return res.json({ status: "error", output: stderr.trim() });
    }

    try {
      const results = JSON.parse(stdout.trim());
      res.json(formatResults(results, mode));
    } catch {
      res.json({ status: "error", output: stdout || stderr || "Unexpected output" });
    }
  } catch {
    res.json({ status: "error", output: "Sandbox service unavailable" });
  }
});

export default router;
