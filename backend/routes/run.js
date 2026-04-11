import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const SANDBOX_URL = process.env.SANDBOX_URL || "http://localhost:8888";

function titleToFn(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function inferCompare(expected) {
  return Array.isArray(expected) ? "sortedArray" : "strict";
}

function convertTestCases(rawCases) {
  return rawCases.map((tc) => ({
    args: Object.values(tc.input),
    expected: tc.expected,
  }));
}

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

  const dbProblem = await prisma.problem.findUnique({ where: { id: Number(problemId) } });
  if (!dbProblem) {
    return res.json({ status: "error", output: `Problem ${problemId} not found.` });
  }

  const rawCases = Array.isArray(dbProblem.testCases)
    ? dbProblem.testCases
    : JSON.parse(dbProblem.testCases ?? "[]");
  const allCases = convertTestCases(rawCases);
  const fn = titleToFn(dbProblem.title);
  const compare = allCases.length > 0 ? inferCompare(allCases[0].expected) : "strict";

  const problem = {
    fn,
    compare,
    run: allCases.slice(0, Math.min(2, allCases.length)),
    submit: allCases,
  };

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
