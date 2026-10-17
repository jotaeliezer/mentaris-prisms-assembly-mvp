import { nextProblem, problemSpec } from "../js/questions.js";
import { makeRng } from "../js/util.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const rng = makeRng("mentaris-questions");

for (let i = 0; i < 40; i++) {
  const spec = problemSpec("add", i % 2 ? "hard" : "easy");
  const q = nextProblem(spec, rng);
  assert(q.answer === q.a + q.b, "add answer");
  assert(q.prompt === q.a + " + " + q.b, "add prompt");
  if (spec.difficulty === "easy") {
    assert(q.a >= 1 && q.a <= 9 && q.b >= 1 && q.b <= 9, "easy add range " + q.prompt);
  } else {
    assert(q.a >= 10 && q.a <= 30 && q.b >= 10 && q.b <= 30, "hard add range " + q.prompt);
  }
}

for (let i = 0; i < 30; i++) {
  const spec = problemSpec("sub", i % 2 ? "hard" : "easy");
  const q = nextProblem(spec, rng);
  assert(q.a - q.b === q.answer, "sub identity " + q.prompt);
  assert(q.answer > 0, "sub positive");
}

for (let i = 0; i < 20; i++) {
  const easy = nextProblem(problemSpec("mul", "easy"), rng);
  assert(easy.answer === easy.a * easy.b, "mul easy");
  assert(easy.a >= 2 && easy.a <= 9 && easy.b >= 2 && easy.b <= 9, "mul easy range");
  const hard = nextProblem(problemSpec("mul", "hard"), rng);
  assert(hard.answer === hard.a * hard.b, "mul classic2");
  assert(hard.a >= 10 && hard.a <= 99 && hard.b >= 2 && hard.b <= 9, "classic2 shape");
}

for (let i = 0; i < 15; i++) {
  const q = nextProblem(problemSpec("square", "easy"), rng);
  assert(q.answer === q.a * q.a, "square");
  assert(q.prompt === q.a + "²", "square prompt");
}

for (let i = 0; i < 15; i++) {
  const q = nextProblem(problemSpec("decimal", "easy"), rng);
  assert(String(q.answerText).indexOf("~") === -1, "terminating decimal");
  assert(q.prompt.indexOf("/") > 0, "fraction prompt");
  const [n, d] = q.prompt.split("/").map(Number);
  assert(Math.abs(n / d - Number(q.answerText)) < 1e-9, "decimal value " + q.prompt + " -> " + q.answerText);
}

const classic3 = nextProblem({ operation: "mul", questionMode: "classic3" }, rng);
assert(classic3.a >= 100 && classic3.a <= 999 && classic3.b >= 2 && classic3.b <= 9, "classic3");
assert(classic3.answer === classic3.a * classic3.b, "classic3 product");

const sameA = nextProblem(problemSpec("add", "easy"), makeRng("same"));
const sameB = nextProblem(problemSpec("add", "easy"), makeRng("same"));
assert(sameA.prompt === sameB.prompt && sameA.answer === sameB.answer, "seed stable");

console.log("questions ok");
