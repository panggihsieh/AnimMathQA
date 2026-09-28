(() => {
  const $ = (sel) => document.querySelector(sel);

  const form = $("#form");
  const boardEl = $("#factor-board");
  const commonBoard = $("#common-board");
  const inputsOne = $("#inputs-one");
  const inputsTwo = $("#inputs-two");
  const pairEl = $("#pair-list");
  const ladderEl = $("#ladder");
  const primeWrap = $("#prime-wrap");
  const resultEl = $("#result");
  const stageLabel = $("#stage-label");
  const modeButtons = document.querySelectorAll(".mode");
  const levelButtons = document.querySelectorAll(".level-btn");
  const levelRange = $("#level-range");
  const speedButtons = document.querySelectorAll(".speed-btn");

  const LEVELS = {
    low: { min: 2, max: 30, label: "30 以內，至少兩個質因數", common: "30 以內，公因數不只 1" },
    mid: { min: 30, max: 50, label: "30–50，至少兩個質因數", common: "30–50，公因數不只 1" },
    high: { min: 50, max: 100, label: "50–100，含質數", common: "50–100，只有公因數 1" },
  };
  const SPEED_OPTIONS = [3, 12, 24, 47, 60];
  const LABELS = {
    factors: "找出所有可以整除的數",
    common: "找出兩個數都有的因數",
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

  function pairDivisionSteps(a, b) {
    const steps = [];
    let x = Math.abs(a);
    let y = Math.abs(b);
    let d = 2;
    while (d <= x && d <= y) {
      if (x % d === 0 && y % d === 0) {
        steps.push({ left: d, pair: [x, y] });
        x /= d;
        y /= d;
      } else {
        d += 1;
      }
    }
    steps.push({ left: null, pair: [x, y] });
    return steps;
  }

  function divisionSentence(a, b, g) {
    const divisors = pairDivisionSteps(a, b).flatMap((step) => (step.left == null ? [] : [step.left]));
    if (divisors.length === 0) return `${a} 和 ${b} 沒有可以一起除的數，最大公因數是 1。`;
    if (divisors.length === 1) return `${a} 和 ${b} 一起除以 ${divisors[0]}，最大公因數是 ${g}。`;
    return `${a} 和 ${b} 的短除法，左邊 ${divisors.join("×")}＝${g}，最大公因數是 ${g}。`;
  }

  function gcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x || 1;
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

  function readField(sel) {
    const raw = $(sel).value.trim();
    const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n < 1 || n > 999) return null;
    return n;
  }

  function promptText() {
    return mode === "common" ? "輸入兩個數字後按「開始動畫」。" : "輸入數字後按「開始動畫」。";
  }

  function syncLevelLabel() {
    levelRange.textContent = mode === "common" ? LEVELS[level].common : LEVELS[level].label;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function motionOff() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function paceFor(beats) {
    if (manual) {
      document.documentElement.style.setProperty("--anim-fade", "280ms");
      return 280;
    }
    if (motionOff()) {
      document.documentElement.style.setProperty("--anim-fade", "0ms");
      return 0;
    }
    const ms = (speedSeconds * 1000) / Math.max(1, beats);
    const fade = Math.min(350, ms * 0.45);
    document.documentElement.style.setProperty("--anim-fade", `${fade}ms`);
    return ms;
  }

  let manual = false;
  let playing = false;
  let stepDir = 1;
  const waits = new Set();
  const shown = [];
  const future = [];
  const stepBtn = $("#btn-step");
  const backBtn = $("#btn-step-back");

  function paintBack() {
    if (backBtn) backBtn.disabled = shown.length === 0;
  }

  function clearTrail() {
    shown.length = 0;
    future.length = 0;
    stepDir = 1;
    paintBack();
  }

  function paintManual() {
    speedButtons.forEach((btn) => {
      const on = !manual && Number(btn.dataset.seconds) === speedSeconds;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
    stepBtn.classList.toggle("is-active", manual);
    stepBtn.setAttribute("aria-pressed", manual ? "true" : "false");
  }

  function cancelWaits() {
    const pending = [...waits];
    waits.clear();
    pending.forEach((finish) => finish());
  }

  function halt() {
    animToken += 1;
    cancelWaits();
    playing = false;
    clearTrail();
  }

  function beginPlay() {
    halt();
    const token = animToken;
    playing = true;
    return token;
  }

  function waitPace(ms, token) {
    if (token !== animToken) return Promise.resolve(0);
    return new Promise((resolve) => {
      let timer = 0;
      const finish = () => {
        if (finish.done) return;
        finish.done = true;
        clearTimeout(timer);
        waits.delete(finish);
        const dir = token === animToken ? stepDir : 0;
        stepDir = 1;
        resolve(dir);
      };
      waits.add(finish);
      if (manual) return;
      if (motionOff() || ms <= 0) {
        finish();
        return;
      }
      timer = window.setTimeout(finish, ms);
    });
  }

  function showBeat(beat) {
    beat.apply();
    shown.push(beat);
    paintBack();
  }

  function hideBeat() {
    const beat = shown.pop();
    if (!beat) return;
    beat.undo();
    future.push(beat);
    paintBack();
  }

  async function runBeats(beats, pace, token) {
    if (motionOff() && !manual) {
      beats.forEach(showBeat);
      return token === animToken;
    }
    let i = 0;
    while (token === animToken) {
      if (stepDir < 0) {
        stepDir = 1;
        if (i > 0) {
          hideBeat();
          i -= 1;
        }
      } else if (i < beats.length) {
        future.length = 0;
        showBeat(beats[i]);
        i += 1;
      } else {
        break;
      }
      const hold = i > 0 && beats[i - 1] ? (beats[i - 1].hold || 1) : 1;
      const dir = await waitPace(pace * hold, token);
      if (!dir) return false;
      stepDir = dir;
    }
    return token === animToken;
  }

  function releaseWait() {
    const finish = waits.values().next().value;
    if (finish) finish();
  }

  function enableManual() {
    manual = true;
    document.documentElement.style.setProperty("--anim-fade", "280ms");
    paintManual();
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
    commonBoard.hidden = true;
    commonBoard.replaceChildren();
    resultEl.hidden = false;
    resultEl.replaceChildren();
  }

  function showPrompt() {
    clearStage();
    resultEl.textContent = promptText();
  }

  function setSpeed(next) {
    const n = Number(next);
    if (!SPEED_OPTIONS.includes(n)) return;
    const resume = manual && waits.size > 0;
    if (!manual && n === speedSeconds) return;
    manual = false;
    speedSeconds = n;
    paintManual();
    if (resume) waits.values().next().value();
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

  stepBtn.addEventListener("click", () => {
    enableManual();
    if (waits.size) {
      stepDir = 1;
      releaseWait();
      return;
    }
    if (future.length) {
      showBeat(future.pop());
      return;
    }
    if (playing) return;
    form.requestSubmit();
  });

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (!shown.length) return;
      enableManual();
      if (waits.size) {
        stepDir = -1;
        releaseWait();
        return;
      }
      hideBeat();
    });
  }

  function pickWeighted(items, weight) {
    const weights = items.map((item) => weight(item));
    const total = weights.reduce((sum, n) => sum + n, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function richPair(min, max) {
    const found = [];
    for (let i = 0; i < 48; i += 1) {
      const a = randInt(min, max);
      const b = randInt(min, max);
      if (a === b || omega(a) < 2 || omega(b) < 2) continue;
      const g = gcd(a, b);
      if (omega(g) < 2) continue;
      found.push({ a, b, g });
    }
    if (found.length === 0) return null;
    return pickWeighted(found, (item) => omega(item.g));
  }

  function coprimePair(min, max) {
    for (let i = 0; i < 80; i += 1) {
      const a = randInt(min, max);
      const b = randInt(min, max);
      if (a !== b && gcd(a, b) === 1) return { a, b };
    }
    return { a: min, b: Math.min(max, min + 1) };
  }

  function fillRandom() {
    const band = LEVELS[level];
    if (mode === "common") {
      const pair = level === "high" ? coprimePair(band.min, band.max) : (richPair(band.min, band.max) || { a: 12, b: 18 });
      $("#fa").value = pair.a;
      $("#fb").value = pair.b;
    } else {
      const n = level === "high" ? randInt(band.min, band.max) : compositeIn(band.min, band.max);
      $("#n").value = n == null ? 24 : n;
    }
    halt();
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
    syncLevelLabel();
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
    const commonMode = next === "common";
    inputsOne.classList.toggle("is-hidden", commonMode);
    inputsTwo.classList.toggle("is-hidden", !commonMode);
    $("#n").disabled = commonMode;
    $("#fa").disabled = !commonMode;
    $("#fb").disabled = !commonMode;
    stageLabel.textContent = LABELS[next];
    syncLevelLabel();
    halt();
    showPrompt();
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  $("#btn-random").addEventListener("click", fillRandom);

  $("#btn-reset").addEventListener("click", () => {
    $("#n").value = 24;
    $("#fa").value = 6;
    $("#fb").value = 4;
    halt();
    showPrompt();
  });

  const STEP_COLORS = [
    "#1f6f97",
    "#b4234d",
    "#c2410c",
    "#2f7a5c",
    "#6d28d9",
    "#0f766e",
    "#a16207",
    "#be185d",
    "#1d4ed8",
    "#3f6212",
    "#9a3412",
    "#0369a1",
  ];

  function stepColor(index) {
    if (index < STEP_COLORS.length) return STEP_COLORS[index];
    const hue = Math.round((index * 137.508) % 360);
    return `hsl(${hue} 58% 32%)`;
  }

  function paintStep(el, index) {
    el.style.setProperty("--step", stepColor(index));
  }

  function chip(n) {
    const el = document.createElement("span");
    el.className = "factor-chip";
    el.textContent = String(n);
    return el;
  }

  function renderFactors(n) {
    const pairs = factorPairs(n);
    const values = [...new Set(pairs.flat())].sort((a, b) => a - b);
    const chips = new Map();
    boardEl.replaceChildren();
    values.forEach((value) => {
      const el = chip(value);
      boardEl.append(el);
      chips.set(value, el);
    });
    pairs.forEach(([a, b], index) => {
      paintStep(chips.get(a), index);
      if (a !== b) paintStep(chips.get(b), index);
    });
    return pairs.map(([a, b]) => (a === b ? [chips.get(a)] : [chips.get(a), chips.get(b)]));
  }

  function renderPairs(n) {
    pairEl.replaceChildren();
    return factorPairs(n).map(([a, b], index) => {
      const row = document.createElement("div");
      row.className = "pair-row";
      paintStep(row, index);
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
      paintStep(num, index);
      bits.push(num);
    });
    expr.append(...bits);
    return expr;
  }

  function beatOf(item) {
    if (Array.isArray(item)) return { show: item, paint: [], hold: 1 };
    if (item && item.show) return { show: item.show, paint: item.paint || [], hold: item.hold || 1 };
    return { show: [item], paint: [], hold: 1 };
  }

  function applyBeat(beat) {
    beat.paint.forEach(([el, index]) => paintStep(el, index));
    beat.show.forEach((el) => el.classList.add("is-in"));
  }

  async function reveal(groups, pace, token) {
    return runBeats(groups.map(undoableBeat), pace, token);
  }

  function undoableBeat(item) {
    const beat = beatOf(item);
    let prev = [];
    return {
      hold: beat.hold,
      apply() {
        prev = beat.paint.map(([el]) => [el, el ? el.style.getPropertyValue("--step") : ""]);
        applyBeat(beat);
      },
      undo() {
        beat.show.forEach((el) => el && el.classList.remove("is-in"));
        prev.forEach(([el, value]) => {
          if (!el) return;
          if (value) el.style.setProperty("--step", value);
          else el.style.removeProperty("--step");
        });
      },
    };
  }

  function textBeat(text) {
    return {
      apply() { resultEl.textContent = text; },
      undo() { resultEl.textContent = ""; },
    };
  }

  function ladderBeats(steps) {
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
      return { factor, pair, num, hasFactor: step.left != null };
    });
    nodes.forEach((node, index) => {
      if (index > 0) paintStep(node.num, index - 1);
      if (node.hasFactor) paintStep(node.factor, index);
    });
    return nodes.map((node) => ({
      apply() {
        node.pair.classList.add("is-in");
        if (node.hasFactor) node.factor.classList.add("is-in");
      },
      undo() {
        node.pair.classList.remove("is-in");
        if (node.hasFactor) node.factor.classList.remove("is-in");
      },
    }));
  }

  function factorList(n) {
    return [...new Set(factorPairs(n).flat())].sort((a, b) => a - b);
  }

  function listText(n) {
    return factorList(n).join("、");
  }

  function renderCommon(a, b) {
    const commons = factorList(gcd(a, b));
    const maps = [a, b].map((n) => {
      const line = document.createElement("div");
      line.className = "common-line";
      const name = document.createElement("span");
      name.className = "common-name";
      name.textContent = String(n);
      const board = document.createElement("div");
      board.className = "factor-board";
      const chips = new Map();
      factorList(n).forEach((value) => {
        const el = chip(value);
        board.append(el);
        chips.set(value, el);
      });
      line.append(name, board);
      commonBoard.append(line);
      return chips;
    });

    const answer = document.createElement("div");
    answer.className = "common-line";
    const answerName = document.createElement("span");
    answerName.className = "common-name";
    answerName.textContent = "公因數";
    const answerBoard = document.createElement("div");
    answerBoard.className = "factor-board";
    answer.append(answerName, answerBoard);
    commonBoard.append(answer);

    const beats = [];
    [a, b].forEach((n, row) => {
      factorPairs(n).forEach(([left, right]) => {
        const group = [maps[row].get(left)];
        if (left !== right) group.push(maps[row].get(right));
        beats.push(group);
      });
    });
    commons.forEach((value, index) => {
      const mark = chip(value);
      answerBoard.append(mark);
      beats.push({
        show: [mark],
        paint: [
          [maps[0].get(value), index],
          [maps[1].get(value), index],
          [mark, index],
        ],
      });
    });
    const greatest = commons[commons.length - 1];
    appendDivision(a, b, greatest, beats);
    const tiling = appendTiles(a, b, greatest, commons.length - 1, beats);
    const sharing = appendShare(a, b, greatest, beats);
    return { beats, commons, tiling, sharing };
  }

  function figureBlock(titleText, propText) {
    const view = document.createElement("div");
    view.className = "apply-view";
    const title = document.createElement("p");
    title.className = "figure-label";
    title.textContent = titleText;
    const prop = document.createElement("p");
    prop.className = "cut-prop";
    prop.textContent = propText;
    view.append(title, prop);
    return view;
  }

  function appendDivision(a, b, g, beats) {
    const steps = pairDivisionSteps(a, b);
    const propText = divisionSentence(a, b, g);
    const ladder = document.createElement("div");
    ladder.className = "ladder";
    const nodes = steps.map((step, i) => {
      const factor = document.createElement("div");
      factor.className = "factor";
      factor.textContent = step.left == null ? "" : String(step.left);
      const pair = document.createElement("div");
      pair.className = "pair" + (i < steps.length - 1 ? " has-bracket" : "");
      const isLast = i === steps.length - 1;
      step.pair.forEach((value) => {
        const num = document.createElement("span");
        num.className = "n" + (isLast ? " final" : "");
        num.textContent = String(value);
        pair.append(num);
      });
      ladder.append(factor, pair);
      return { factor, pair, hasFactor: step.left != null };
    });
    const view = figureBlock("短除法", propText);
    view.append(ladder);
    commonBoard.append(view);
    beats.push({ show: [view], hold: 4 });
    nodes.forEach((node) => {
      const show = [node.pair];
      if (node.hasFactor) show.push(node.factor);
      beats.push(show);
    });
  }

  function appendTiles(a, b, g, colorIndex, beats) {
    const widthN = Math.max(a, b);
    const heightN = Math.min(a, b);
    const cols = Math.round(widthN / g);
    const rows = Math.round(heightN / g);
    const frame = document.createElement("div");
    frame.className = "tile-frame tile-draw";
    const y = document.createElement("span");
    y.className = "tile-axis";
    y.textContent = `寬 ${heightN}`;
    const x = document.createElement("span");
    x.className = "tile-axis";
    x.textContent = `長 ${widthN}`;
    const board = document.createElement("div");
    board.className = "tile-board";
    board.style.setProperty("--cols", String(cols));
    board.style.setProperty("--rows", String(rows));
    board.setAttribute("role", "img");
    const blocks = cols * rows;
    const propText = `長為 ${widthN}、寬為 ${heightN} 的長方形，最大公因數是 ${g}。長方形被切成 ${blocks} 塊邊長 ${g} 的正方形，橫向 ${cols} 塊、直向 ${rows} 塊，正好鋪滿，沒有剩下。`;
    board.setAttribute("aria-label", propText);
    frame.append(y, board, x);
    const view = figureBlock("最大正方形", propText);
    view.append(frame);
    commonBoard.append(view);
    beats.push({ show: [view], hold: 4 }, [frame]);

    const many = cols > 16 || rows > 12 || cols * rows > 96;
    if (many) {
      board.classList.add("is-dense");
      const label = document.createElement("span");
      label.className = "tile-dense-label";
      label.textContent = String(g);
      paintStep(label, colorIndex);
      board.append(label);
      beats.push([board]);
      return { cols, rows };
    }

    const cells = [];
    const showNum = cols * rows <= 12;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cell = document.createElement("span");
        cell.className = "tile-cell";
        if (c === cols - 1) cell.classList.add("is-last-col");
        if (r === rows - 1) cell.classList.add("is-last-row");
        if (showNum) cell.textContent = String(g);
        paintStep(cell, colorIndex);
        board.append(cell);
        cells.push(cell);
      }
    }
    if (cells.length <= 16) cells.forEach((cell) => beats.push([cell]));
    else {
      for (let r = 0; r < rows; r += 1) beats.push(cells.slice(r * cols, (r + 1) * cols));
    }
    return { cols, rows };
  }

  function shareLane(kind, count) {
    const lane = document.createElement("div");
    lane.className = "share-lane";
    if (count > 12) {
      lane.textContent = String(count);
      return lane;
    }
    for (let i = 0; i < count; i += 1) {
      const bit = document.createElement("span");
      bit.className = `bit ${kind}`;
      bit.setAttribute("aria-hidden", "true");
      lane.append(bit);
    }
    return lane;
  }

  function appendShare(a, b, g, beats) {
    const apples = Math.round(a / g);
    const cookies = Math.round(b / g);
    const propText = `${a} 顆蘋果、${b} 片餅乾，分成 ${g} 堆，每堆 ${apples} 顆蘋果、${cookies} 片餅乾，沒有剩下。`;
    const share = document.createElement("div");
    share.className = "share";
    share.setAttribute("role", "img");
    share.setAttribute("aria-label", propText);
    const names = document.createElement("div");
    names.className = "share-names";
    ["蘋果", "餅乾"].forEach((text) => {
      const name = document.createElement("span");
      name.textContent = text;
      names.append(name);
    });
    const scroll = document.createElement("div");
    scroll.className = "share-scroll";
    const grid = document.createElement("div");
    grid.className = "share-grid";
    share.append(names, scroll);
    scroll.append(grid);
    const view = figureBlock("分堆", propText);
    view.append(share);
    commonBoard.append(view);
    beats.push({ show: [view], hold: 4 });

    if (g > 20) {
      grid.classList.add("is-schematic");
      grid.style.setProperty("--piles", String(g));
      const label = document.createElement("span");
      label.className = "share-schematic-label";
      label.textContent = `${g} 堆`;
      grid.append(label);
      beats.push([share, grid]);
      return { piles: g, apples, cookies };
    }

    const cols = [];
    for (let i = 0; i < g; i += 1) {
      const col = document.createElement("div");
      col.className = "share-col";
      col.append(shareLane("apple", apples), shareLane("cookie", cookies));
      grid.append(col);
      cols.push(col);
    }
    if (cols.length === 0) beats.push([share]);
    else if (cols.length <= 12) {
      cols.forEach((col, index) => beats.push(index === 0 ? [share, col] : [col]));
    } else beats.push([share, ...cols]);
    return { piles: g, apples, cookies };
  }

  function commonSentence(a, b, commons) {
    const g = commons[commons.length - 1];
    const cols = Math.round(Math.max(a, b) / g);
    const rows = Math.round(Math.min(a, b) / g);
    const apples = Math.round(a / g);
    const cookies = Math.round(b / g);
    const division = divisionSentence(a, b, g);
    const tile = `長方形被切成 ${cols * rows} 塊邊長 ${g} 的正方形，橫向 ${cols} 塊、直向 ${rows} 塊，正好鋪滿，沒有剩下`;
    const share = `分成 ${g} 堆，每堆 ${apples} 顆蘋果、${cookies} 片餅乾，沒有剩下`;
    if (commons.length === 1) return `${a} 和 ${b} 的公因數只有 1。${division}${tile}。${share}。`;
    return `${a} 和 ${b} 的公因數：${commons.join("、")}。${division}${tile}。${share}。`;
  }

  async function play() {
    const token = beginPlay();
    try {
    clearStage();
    if (mode === "common") {
      const a = readField("#fa");
      const b = readField("#fb");
      if (a == null || b == null) {
        resultEl.textContent = "請輸入 1 到 999 的整數。";
        return;
      }
      commonBoard.hidden = false;
      const { beats, commons } = renderCommon(a, b);
      const steps = beats.map(undoableBeat);
      steps.push(textBeat(commonSentence(a, b, commons)));
      await runBeats(steps, paceFor(steps.length), token);
      return;
    }

    const n = readField("#n");
    if (n == null) {
      resultEl.textContent = "請輸入 1 到 999 的整數。";
      return;
    }

    if (mode === "factors") {
      boardEl.hidden = false;
      const steps = renderFactors(n).map(undoableBeat);
      steps.push(textBeat(`${n} 的因數：${listText(n)}。`));
      await runBeats(steps, paceFor(steps.length), token);
      return;
    }

    if (mode === "pairs") {
      pairEl.hidden = false;
      const text = factorPairs(n).map(([a, b]) => `${a}×${b}`).join("、");
      const steps = renderPairs(n).map(undoableBeat);
      steps.push(textBeat(`${text}，相乘都是 ${n}。`));
      await runBeats(steps, paceFor(steps.length), token);
      return;
    }

    primeWrap.hidden = false;
    const { primes, steps: division } = divisionSteps(n);
    const showEq = n > 1 && !isPrime(n);
    const steps = ladderBeats(division);
    if (n === 1) steps.push(textBeat("1 的因數只有 1，它不是質數。"));
    else if (!showEq) steps.push(textBeat(`${n} 是質數，不能再拆。`));
    else {
      const expr = equation(n, primes);
      steps.push({
        apply() {
          resultEl.append(expr);
          expr.classList.add("is-in");
        },
        undo() { expr.remove(); },
      });
    }
    await runBeats(steps, paceFor(steps.length), token);
    } finally {
      if (token === animToken) playing = false;
    }
  }

  form.addEventListener("invalid", () => {
    halt();
    showPrompt();
  }, true);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    play();
  });

  const initial = new URLSearchParams(location.search).get("mode");
  setMode(initial === "pairs" || initial === "prime" || initial === "common" ? initial : "factors");
})();
