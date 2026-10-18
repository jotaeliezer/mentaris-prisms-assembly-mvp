import { clamp, randi } from "./util.js";

/**
 * The only question generator.
 *
 * Arithmetic branches follow nextProblem() in Mentaris - The Arith Belt
 * (branch math-game1, src/js/core/game.js). Subtraction follows the
 * addition-mode path in getAlienQuestion() in that same file: pick an
 * answer and a subtrahend with randi, then show a − b. randi matches
 * src/js/core/utils.js, with the random source passed in so a world seed
 * can rebuild the same questions.
 *
 * A mission locks `operation` and `questionMode`. Layers do not change
 * the operation.
 */

function rationalNumeratorsForDifficulty(diffRaw) {
  const diff = String(diffRaw || "normal").toLowerCase();
  if (diff === "easy") return [1, 2, 3];
  if (diff === "normal") return [1, 2, 3, 4, 5];
  if (diff === "hard") return [5, 6, 7, 8];
  if (diff === "brutal") return [8, 9, 10, 11];
  return [1, 2, 3, 4, 5];
}

function rationalFracGcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function reduceRationalPair(n, d) {
  if (!d) return { n: 0, d: 1 };
  const g = rationalFracGcd(n, d);
  return { n: Math.round(n / g), d: Math.round(d / g) };
}

function formatRepeatingDecimal(numer, denom) {
  if (!denom) return "?";
  const sign = numer < 0 ? "-" : "";
  const n = Math.abs(numer);
  const d = Math.abs(denom);
  const intPart = Math.floor(n / d);
  let rem = n % d;
  if (rem === 0) return sign + String(intPart);
  const digits = [];
  const seen = {};
  let repeatIndex = -1;
  let guard = 0;
  while (rem !== 0 && seen[rem] === undefined && guard++ < 30) {
    seen[rem] = digits.length;
    rem *= 10;
    digits.push(String(Math.floor(rem / d)));
    rem = rem % d;
  }
  if (rem !== 0 && seen[rem] !== undefined) repeatIndex = seen[rem];
  const nonRepeat = repeatIndex >= 0 ? digits.slice(0, repeatIndex).join("") : digits.join("");
  const repeat = repeatIndex >= 0 ? digits.slice(repeatIndex).join("") : "";
  if (repeat) return sign + String(intPart) + "." + nonRepeat + "~" + repeat + "~";
  return sign + String(intPart) + "." + nonRepeat;
}

function buildRationalPool(minDen, maxDen, difficulty) {
  const numSet = rationalNumeratorsForDifficulty(difficulty);
  const byKey = {};
  for (let d = minDen; d <= maxDen; d++) {
    if (d <= 0) continue;
    for (let si = 0; si < numSet.length; si++) {
      const rawN = numSet[si];
      if (rawN < 1 || rawN > d) continue;
      const r = reduceRationalPair(rawN, d);
      if (r.d <= 1) continue;
      const key = r.n + "/" + r.d;
      if (byKey[key]) continue;
      byKey[key] = { num: r.n, den: r.d, frac: key, dec: formatRepeatingDecimal(r.n, r.d) };
    }
  }
  return Object.keys(byKey).map((k) => byKey[k]);
}

function buildRationalPoolWithFallback(minDen, maxDen, difficulty) {
  const diff = String(difficulty || "normal").toLowerCase();
  const order = [diff, "brutal", "normal", "easy"];
  const tried = {};
  for (let oi = 0; oi < order.length; oi++) {
    const dTry = order[oi];
    if (tried[dTry]) continue;
    tried[dTry] = true;
    const pool = buildRationalPool(minDen, maxDen, dTry);
    if (pool.length) return pool;
  }
  return buildRationalPool(2, 12, "brutal");
}

function finish(fields) {
  const answerText = fields.answerText != null ? String(fields.answerText) : String(fields.answer);
  return { ...fields, answerText };
}

function subtractionProblem(questionMode, difficulty, rng) {
  let answer;
  let b;
  if (questionMode === "sub_hard" || difficulty === "hard" || difficulty === "brutal") {
    b = randi(rng, 10, 30);
    answer = randi(rng, 10, 40);
  } else if (questionMode === "sub_easy" || difficulty === "easy") {
    b = randi(rng, 1, 9);
    answer = randi(rng, 1, 9);
  } else {
    b = randi(rng, 1, 9);
    answer = randi(rng, 2, 15);
  }
  const a = answer + b;
  return finish({
    a,
    b,
    op: "−",
    answer,
    prompt: a + " − " + b,
    questionMode: questionMode || "sub_alien",
    difficulty,
    operation: "sub",
  });
}

export function nextProblem(options, rng) {
  const questionMode = options.questionMode || "";
  const operation = options.operation || "add";
  const difficulty = String(options.difficulty || "normal").toLowerCase();
  const rr = options.ranges || { a1: 2, a2: 12, b1: 2, b2: 12 };

  if (questionMode === "square_shoot" || questionMode === "square_root") {
    const base = randi(rng, rr.a1, rr.a2);
    const squareValue = base * base;
    const root = questionMode === "square_root";
    return finish({
      a: base,
      b: root ? 1 : base,
      op: root ? "√" : "²",
      answer: root ? base : squareValue,
      prompt: root ? "√" + squareValue : base + "²",
      questionMode,
      difficulty,
      operation: "square",
    });
  }

  if (questionMode === "rational_frac" || questionMode === "rational_dec") {
    let minDen = clamp(rr.a1, 2, 12);
    let maxDen = clamp(rr.a2, 2, 12);
    if (maxDen < minDen) {
      const tmp = minDen;
      minDen = maxDen;
      maxDen = tmp;
    }
    const pool = buildRationalPoolWithFallback(minDen, maxDen, difficulty).filter((entry) => {
      return questionMode === "rational_frac" || (entry.dec.indexOf("~") === -1 && entry.dec.length <= 5);
    });
    const usable = pool.length ? pool : buildRationalPoolWithFallback(minDen, maxDen, difficulty);
    const entry = usable[randi(rng, 0, usable.length - 1)];
    const askFraction = questionMode === "rational_frac";
    return finish({
      a: entry.num,
      b: entry.den,
      op: "/",
      answer: askFraction ? entry.frac : entry.dec,
      answerText: askFraction ? entry.frac : entry.dec,
      prompt: askFraction ? entry.dec : entry.frac,
      questionMode,
      difficulty,
      operation: "decimal",
    });
  }

  if (operation === "sub" || questionMode === "sub_alien" || questionMode === "sub_easy" || questionMode === "sub_hard") {
    return subtractionProblem(questionMode, difficulty, rng);
  }

  if (questionMode === "add_series3" || questionMode === "add_series4") {
    const termCount = questionMode === "add_series4" ? 4 : 3;
    const terms = [];
    for (let ti = 0; ti < termCount; ti++) terms.push(randi(rng, rr.a1, rr.a2));
    const answer = terms.reduce((sum, val) => sum + val, 0);
    return finish({
      a: terms[0],
      b: terms[1],
      terms,
      op: "+",
      answer,
      prompt: terms.join(" + "),
      questionMode,
      difficulty,
      operation: "add",
    });
  }

  let a;
  let b;
  if (questionMode === "add_classic2" || questionMode === "add_stampede2" || questionMode === "add_digits2") {
    a = randi(rng, 10, 99);
    b = randi(rng, 10, 99);
  } else if (questionMode === "add_classic3" || questionMode === "add_stampede3" || questionMode === "add_digits3") {
    a = randi(rng, 100, 999);
    b = randi(rng, 100, 999);
  } else if (questionMode === "classic2" || questionMode === "stampede2" || questionMode === "digits2") {
    a = randi(rng, 10, 99);
    b = randi(rng, 2, 9);
  } else if (questionMode === "classic3" || questionMode === "stampede3" || questionMode === "digits3") {
    a = randi(rng, 100, 999);
    b = randi(rng, 2, 9);
  } else {
    a = randi(rng, rr.a1, rr.a2);
    b = randi(rng, rr.b1, rr.b2);
  }

  const isAdd = operation === "add" || questionMode.indexOf("add_") === 0;
  const answer = isAdd ? a + b : a * b;
  const op = isAdd ? "+" : "×";
  return finish({
    a,
    b,
    op,
    answer,
    prompt: a + " " + op + " " + b,
    questionMode,
    difficulty,
    operation: isAdd ? "add" : "mul",
  });
}

export function problemSpec(operation, difficulty) {
  const diff = difficulty === "hard" || difficulty === "brutal" ? "hard" : "easy";
  if (operation === "add") {
    if (diff === "hard") {
      return { operation: "add", questionMode: "", difficulty: "hard", ranges: { a1: 10, a2: 30, b1: 10, b2: 30 } };
    }
    return { operation: "add", questionMode: "", difficulty: "easy", ranges: { a1: 1, a2: 9, b1: 1, b2: 9 } };
  }
  if (operation === "sub") {
    return {
      operation: "sub",
      questionMode: diff === "hard" ? "sub_hard" : "sub_easy",
      difficulty: diff,
    };
  }
  if (operation === "mul") {
    if (diff === "hard") return { operation: "mul", questionMode: "classic2", difficulty: "hard" };
    return { operation: "mul", questionMode: "", difficulty: "easy", ranges: { a1: 2, a2: 9, b1: 2, b2: 9 } };
  }
  if (operation === "square") {
    const max = diff === "hard" ? 12 : 8;
    return {
      operation: "square",
      questionMode: "square_shoot",
      difficulty: diff,
      ranges: { a1: 2, a2: max, b1: 2, b2: max },
    };
  }
  return {
    operation: "decimal",
    questionMode: "rational_dec",
    difficulty: diff === "hard" ? "hard" : "easy",
    ranges: { a1: 2, a2: 10, b1: 2, b2: 10 },
  };
}
