(() => {
  const $ = (sel) => document.querySelector(sel);

  const form = $("#form");
  const boardEl = $("#factor-board");
  const pairEl = $("#pair-list");
  const ladderEl = $("#ladder");
  const primeWrap = $("#prime-wrap");
  const resultEl = $("#result");
  const stageLabel = $("#stage-label");
  const modeButtons = document.querySelectorAll(".mode");
  const levelButtons = document.querySelectorAll(".level-btn");
  const levelRange = $("#level-range");
  const speedButtons = document.querySelectorAll(".speed-btn");

  const PROMPT = "輸入數字後按「開始動畫」。";
  const LEVELS = {
    low: { min: 2, max: 30, label: "30 以內，至少兩個質因數" },
    mid: { min: 30, max: 50, label: "30–50，至少兩個質因數" },
    high: { min: 50, max: 100, label: "50–100，含質數" },
  };
  const SPEED_OPTIONS = [3, 12, 24, 47, 60];
  const LABELS = {
    factors: "找出所有可以整除的數",
    pairs: "相乘得到這個數的配對",
    prime: "短除法求質因數",
  };

  let mode = "factors";
  let level = "low";
  let speedSeconds = 3;
  let animToken = 0;

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /** 質因數個數，含重複。1 是 0 個，質數是 1 個。 */
  function omega(n) {
    let count = 0;
    let x = Math.abs(n);
    if (x < 2) return 0;
    let p = 2;
    while (p * p <= x) {
      while (x % p === 0) {
        count += 1;
        x = Math.floor(x / p);
      }
      p += p === 2 ? 1 : 2;
    }
    if (x > 1) count += 1;
    return count;
  }

  function factorPairs(n) {
    const pairs = [];
    for (let i = 1; i * i <= n; i += 1) {
      if (n % i === 0) pairs.push([i, Math.floor(n / i)]);
    }
    return pairs;
  }

  function primeFactorList(n) {
    const factors = [];
    let x = n;
    if (x < 2) return factors;
    let d = 2;
    while (d * d <= x) {
      while (x % d === 0) {
        factors.push(d);
        x = Math.floor(x / d);
      }
      d += d === 2 ? 1 : 2;
    }
    if (x > 1) factors.push(x);
    return factors;
  }

  function isPrime(n) {
    const primes = primeFactorList(n);
    return primes.length === 1 && primes[0] === n;
  }

  function divisionSteps(n) {
    const primes = primeFactorList(n);
    if (n < 2 || isPrime(n)) return { primes, steps: [{ left: null, pair: [n] }] };
    const steps = [];
    let x = n;
    primes.forEach((p) => {
      steps.push({ left: p, pair: [x] });
      x = Math.floor(x / p);
    });
    steps.push({ left: null, pair: [1] });
    return { primes, steps };
  }

  function readN() {
    const raw = $("#n").value.trim();
    const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n < 1 || n > 999) return null;
    return n;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function motionOff() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paceFor(beats) {
    if (motionOff()) {
      document.documentElement.style.setProperty("--anim-fade", "0ms");
      return 0;
    }
    const ms = (speedSeconds * 1000) / Math.max(1, beats);
    const fade = Math.min(350, ms * 0.45);
    document.documentElement.style.setProperty("--anim-fade", `${fade}ms`);
    return ms;
  }

  function compositeIn(min, max) {
    for (let i = 0; i < 40; i += 1) {
      const n = randInt(min, max);
      if (omega(n) >= 2) return n;
    }
    return null;
  }

  function clearStage() {
    boardEl.hidden = true;
    boardEl.replaceChildren();
    pairEl.hidden = true;
    pairEl.replaceChildren();
    primeWrap.hidden = true;
    ladderEl.replaceChildren();
    resultEl.hidden = false;
    resultEl.replaceChildren();
  }

  function showPrompt() {
    clearStage();
    resultEl.textContent = PROMPT;
  }

  function setSpeed(next) {
    const n = Number(next);
    if (!SPEED_OPTIONS.includes(n) || n === speedSeconds) return;
    speedSeconds = n;
    speedButtons.forEach((btn) => {
      const on = Number(btn.dataset.seconds) === n;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  speedButtons.forEach((btn) => {
    btn.addEventListener("click", () => setSpeed(btn.dataset.seconds));
    btn.addEventListener("keydown", (event) => {
      const index = SPEED_OPTIONS.indexOf(Number(btn.dataset.seconds));
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = SPEED_OPTIONS[(index + step + SPEED_OPTIONS.length) % SPEED_OPTIONS.length];
      const target = document.querySelector(`.speed-btn[data-seconds="${next}"]`);
      target.focus();
      setSpeed(next);
    });
  });

  function fillRandom() {
    const band = LEVELS[level];
    const n = level === "high" ? randInt(band.min, band.max) : compositeIn(band.min, band.max);
    $("#n").value = n == null ? 24 : n;
    animToken += 1;
    showPrompt();
  }

  function setLevel(next) {
    if (!LEVELS[next] || next === level) return;
    level = next;
    levelButtons.forEach((btn) => {
      const on = btn.dataset.level === next;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
    levelRange.textContent = LEVELS[next].label;
    fillRandom();
  }

  levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => setLevel(btn.dataset.level));
    btn.addEventListener("keydown", (event) => {
      const order = ["low", "mid", "high"];
      const index = order.indexOf(btn.dataset.level);
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = order[(index + step + order.length) % order.length];
      const target = document.querySelector(`.level-btn[data-level="${next}"]`);
      target.focus();
      setLevel(next);
    });
  });

  function setMode(next) {
    if (!LABELS[next]) return;
    mode = next;
    modeButtons.forEach((btn) => {
      const on = btn.dataset.mode === next;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    const url = new URL(location.href);
    if (next === "factors") url.searchParams.delete("mode");
    else url.searchParams.set("mode", next);
    history.replaceState(null, "", url);
    stageLabel.textContent = LABELS[next];
    animToken += 1;
    showPrompt();
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  $("#btn-random").addEventListener("click", fillRandom);

  $("#btn-reset").addEventListener("click", () => {
    $("#n").value = 24;
    animToken += 1;
    showPrompt();
  });

  function chip(n, square) {
    const el = document.createElement("span");
    el.className = "factor-chip" + (square ? " is-square" : "");
    el.textContent = String(n);
    return el;
  }

  function renderFactors(n) {
    const pairs = factorPairs(n);
    const squarePair = pairs.find(([a, b]) => a === b);
    const square = squarePair ? squarePair[0] : null;
    const values = [...new Set(pairs.flat())].sort((a, b) => a - b);
    const chips = new Map();
    boardEl.replaceChildren();
    values.forEach((value) => {
      const el = chip(value, value === square);
      boardEl.append(el);
      chips.set(value, el);
    });
    return pairs.map(([a, b]) => (a === b ? [chips.get(a)] : [chips.get(a), chips.get(b)]));
  }

  function renderPairs(n) {
    pairEl.replaceChildren();
    return factorPairs(n).map(([a, b]) => {
      const row = document.createElement("div");
      row.className = "pair-row" + (a === b ? " is-square" : "");
      const left = document.createElement("span");
      left.className = "pair-n";
      left.textContent = String(a);
      const op = document.createElement("span");
      op.className = "pair-op";
      op.textContent = "×";
      const right = document.createElement("span");
      right.className = "pair-n";
      right.textContent = String(b);
      row.append(left, op, right);
      pairEl.append(row);
      return row;
    });
  }

  function equation(n, primes) {
    const expr = document.createElement("span");
    expr.className = "prime-eq";
    const bits = [document.createTextNode(`${n} = `)];
    primes.forEach((p, index) => {
      if (index > 0) bits.push(document.createTextNode(" × "));
      const num = document.createElement("span");
      num.className = "prime-num";
      num.textContent = String(p);
      bits.push(num);
    });
    expr.append(...bits);
    return expr;
  }

  async function reveal(groups, pace, token) {
    const rows = groups.map((item) => (Array.isArray(item) ? item : [item]));
    if (motionOff()) {
      rows.flat().forEach((el) => el.classList.add("is-in"));
      return token === animToken;
    }
    await sleep(16);
    for (const row of rows) {
      if (token !== animToken) return false;
      row.forEach((el) => el.classList.add("is-in"));
      await sleep(pace);
    }
    return token === animToken;
  }

  async function playLadder(steps, pace, token) {
    ladderEl.replaceChildren();
    const nodes = steps.map((step, i) => {
      const factor = document.createElement("div");
      factor.className = "factor";
      factor.textContent = step.left == null ? "" : String(step.left);
      const pair = document.createElement("div");
      pair.className = "pair" + (i < steps.length - 1 ? " has-bracket" : "");
      const num = document.createElement("span");
      num.className = "n" + (i === steps.length - 1 ? " final" : "");
      num.textContent = String(step.pair[0]);
      pair.append(num);
      ladderEl.append(factor, pair);
      return { factor, pair, hasFactor: step.left != null };
    });

    const show = (node) => {
      node.pair.classList.add("is-in");
      if (node.hasFactor) node.factor.classList.add("is-in");
    };
    if (motionOff()) {
      nodes.forEach(show);
      return token === animToken;
    }
    for (const node of nodes) {
      if (token !== animToken) return false;
      show(node);
      await sleep(pace);
    }
    return token === animToken;
  }

  function listText(n) {
    return [...new Set(factorPairs(n).flat())].sort((a, b) => a - b).join("、");
  }

  async function play() {
    const n = readN();
    const token = ++animToken;
    clearStage();
    if (n == null) {
      resultEl.textContent = "請輸入 1 到 999 的整數。";
      return;
    }

    if (mode === "factors") {
      boardEl.hidden = false;
      const beats = renderFactors(n);
      const ok = await reveal(beats, paceFor(beats.length), token);
      if (!ok) return;
      resultEl.textContent = `${n} 的因數：${listText(n)}。`;
      return;
    }

    if (mode === "pairs") {
      pairEl.hidden = false;
      const rows = renderPairs(n);
      const ok = await reveal(rows, paceFor(rows.length), token);
      if (!ok) return;
      const text = factorPairs(n).map(([a, b]) => `${a}×${b}`).join("、");
      resultEl.textContent = `${text}，相乘都是 ${n}。`;
      return;
    }

    primeWrap.hidden = false;
    const { primes, steps } = divisionSteps(n);
    const showEq = n > 1 && !isPrime(n);
    const ok = await playLadder(steps, paceFor(steps.length + (showEq ? 1 : 0)), token);
    if (!ok) return;
    if (n === 1) {
      resultEl.textContent = "1 的因數只有 1，它不是質數。";
      return;
    }
    if (!showEq) {
      resultEl.textContent = `${n} 是質數，不能再拆。`;
      return;
    }
    const expr = equation(n, primes);
    resultEl.append(expr);
    if (motionOff()) {
      expr.classList.add("is-in");
      return;
    }
    await sleep(16);
    if (token !== animToken) return;
    expr.classList.add("is-in");
  }

  $("#n").addEventListener("invalid", () => {
    animToken += 1;
    showPrompt();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    play();
  });

  const initial = new URLSearchParams(location.search).get("mode");
  setMode(initial === "pairs" || initial === "prime" ? initial : "factors");
})();
