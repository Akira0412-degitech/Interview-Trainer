import { prisma } from "../lib/prisma.js";
import { arrayProblems } from "./seeds/arrays.js";
import { stringProblems } from "./seeds/strings.js";
import { treeProblems } from "./seeds/trees.js";
import { dpProblems } from "./seeds/dynamic-programming.js";

const allProblems = [
  ...arrayProblems,
  ...stringProblems,
  ...treeProblems,
  ...dpProblems,
];

async function main() {
  console.log(`Seeding ${allProblems.length} problems...`);

  for (const problem of allProblems) {
    await prisma.problem.upsert({
      where: { title: problem.title },
      update: {},
      create: problem,
    });
    console.log(`  ✓ ${problem.title}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
