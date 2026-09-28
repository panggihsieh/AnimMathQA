(() => {
  const $ = (sel) => document.querySelector(sel);

  const form = $("#form");
  const inputsOne = $("#inputs-one");
  const inputsTwo = $("#inputs-two");
  const listEl = $("#multiple-list");
  const commonBoard = $("#common-board");
  const lcmWrap = $("#lcm-wrap");
  const ladderEl = $("#ladder");
  const resultEl = $("#result");
  const stageLabel = $("#stage-label");
  const modeButtons = document.querySelectorAll(".mode");
  const levelButtons = document.querySelectorAll(".level-btn");
  const levelRange = $("#level-range");
  const speedButtons = document.querySelectorAll(".speed-btn");

  const LEVELS = {
    low: { min: 2, max: 30, one: "30 以內", pair: "30 以內，有公因數" },
    mid: { min: 30, max: 50, one: "30–50", pair: "30–50，有公因數" },
    high: { min: 50, max: 100, one: "50–100，含質數", pair: "50–100，兩數互質" },
  };
  const SPEED_OPTIONS = [3, 12, 24, 47, 60];
  const LABELS = {
    multiples: "1 倍、2 倍、3 倍",
    common: "共同的倍數沒有最大",
    lcm: "短除法求最小公倍數",
  };
  const SHOWN = 6;

  let mode = "multiples";
  let level = "low";
  let speedSeconds = 3;
  let animToken = 0;

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

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

  function lcm(a, b) {
    return (Math.abs(a) / gcd(a, b)) * Math.abs(b);
  }

  /** 和通分同一條短除法：能同時整除就一起除。 */
  function shortDivisionSteps(a, b) {
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

  function readField(sel) {
    const raw = $(sel).value.trim();
    const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n < 1 || n > 999) return null;
    return n;
  }

  function twoNumbers() {
    return mode === "common" || mode === "lcm";
  }

  function promptText() {
    return twoNumbers() ? "輸入兩個數字後按「開始動畫」。" : "輸入數字後按「開始動畫」。";
  }

  function syncLevelLabel() {
    levelRange.textContent = twoNumbers() ? LEVELS[level].pair : LEVELS[level].one;
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
  const waits = new Set();
  const stepBtn = $("#btn-step");

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
  }

  function beginPlay() {
    halt();
    const token = animToken;
    playing = true;
    return token;
  }

  function waitPace(ms, token) {
    if (token !== animToken) return Promise.resolve(false);
    return new Promise((resolve) => {
      let timer = 0;
      const finish = () => {
        if (finish.done) return;
        finish.done = true;
        clearTimeout(timer);
        waits.delete(finish);
        resolve(token === animToken);
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

  function clearStage() {
    listEl.hidden = true;
    listEl.setAttribute("aria-hidden", "true");
    listEl.replaceChildren();
    commonBoard.hidden = true;
    commonBoard.setAttribute("aria-hidden", "true");
    commonBoard.replaceChildren();
    lcmWrap.hidden = true;
    ladderEl.replaceChildren();
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
      waits.values().next().value();
      return;
    }
    if (playing) return;
    form.requestSubmit();
  });

  function fillRandom() {
    const band = LEVELS[level];
    if (twoNumbers()) {
      const pair = level === "high"
        ? coprimePair(band.min, band.max)
        : (richPair(band.min, band.max) || { a: 12, b: 18 });
      $("#fa").value = pair.a;
      $("#fb").value = pair.b;
    } else {
      const n = level === "high" ? randInt(band.min, band.max) : compositeIn(band.min, band.max);
      $("#n").value = n == null ? 6 : n;
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
    if (next === "multiples") url.searchParams.delete("mode");
    else url.searchParams.set("mode", next);
    history.replaceState(null, "", url);
    const pair = twoNumbers();
    inputsOne.classList.toggle("is-hidden", pair);
    inputsTwo.classList.toggle("is-hidden", !pair);
    $("#n").disabled = pair;
    $("#fa").disabled = !pair;
    $("#fb").disabled = !pair;
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
    $("#n").value = 6;
    $("#fa").value = 4;
    $("#fb").value = 6;
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
    if (!el) return;
    el.style.setProperty("--step", stepColor(index));
  }

  function chip(text) {
    const el = document.createElement("span");
    el.className = "factor-chip";
    el.textContent = String(text);
    return el;
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
    const beats = groups.map(beatOf);
    if (motionOff() && !manual) {
      beats.forEach(applyBeat);
      return token === animToken;
    }
    if (!manual) await sleep(16);
    for (const beat of beats) {
      if (token !== animToken) return false;
      applyBeat(beat);
      if (!(await waitPace(pace * beat.hold, token))) return false;
    }
    return token === animToken;
  }

  function pairBits(k, n) {
    const row = document.createElement("div");
    row.className = "pair-row";
    paintStep(row, k - 1);
    const bits = [
      [String(k), ""],
      ["×", "pair-op"],
      [String(n), ""],
      ["=", "pair-op"],
      [String(k * n), ""],
    ];
    bits.forEach(([text, className]) => {
      const span = document.createElement("span");
      if (className) span.className = className;
      span.textContent = text;
      row.append(span);
    });
    return row;
  }

  function renderTimes(n) {
    const rows = [];
    for (let k = 1; k <= SHOWN; k += 1) {
      const row = pairBits(k, n);
      listEl.append(row);
      rows.push(row);
    }
    const more = document.createElement("div");
    more.className = "pair-row is-gap";
    more.textContent = "…";
    listEl.append(more);
    rows.push(more);
    return rows;
  }

  /** 列到第二個公倍數；太長就留開頭、最小、再下一個，中間用省略號。 */
  function multipleTokens(n, least, second) {
    const full = [];
    for (let k = 1; k * n <= second; k += 1) full.push(k * n);
    if (full.length <= 8) {
      return full.map((value) => ({ kind: "n", value })).concat([{ kind: "gap" }]);
    }
    const head = [];
    for (let k = 1; head.length < 3 && k * n < least; k += 1) head.push(k * n);
    const tokens = head.map((value) => ({ kind: "n", value }));
    if (head.length) tokens.push({ kind: "gap" });
    tokens.push({ kind: "n", value: least }, { kind: "n", value: second }, { kind: "gap" });
    return tokens;
  }

  function renderRow(n, tokens) {
    const line = document.createElement("div");
    line.className = "common-line";
    const name = document.createElement("span");
    name.className = "common-name";
    name.textContent = String(n);
    const board = document.createElement("div");
    board.className = "factor-board";
    const chips = new Map();
    const els = [];
    tokens.forEach((token) => {
      const el = chip(token.kind === "gap" ? "…" : token.value);
      if (token.kind === "gap") el.classList.add("is-gap");
      else chips.set(token.value, el);
      board.append(el);
      els.push(el);
    });
    line.append(name, board);
    return { line, chips, els };
  }

  function multiplesUntil(n, end) {
    const list = [];
    for (let k = 1; k * n <= end + 1e-9; k += 1) list.push(k * n);
    return list;
  }

  function placeTick(lane, at, label) {
    const tick = document.createElement("span");
    tick.className = "period-tick";
    tick.style.setProperty("--at", String(at));
    if (label) {
      const text = document.createElement("span");
      text.textContent = label;
      tick.append(text);
    }
    lane.append(tick);
    return tick;
  }

  function placeMeet(field, at) {
    const meet = document.createElement("span");
    meet.className = "period-meet";
    meet.style.setProperty("--at", String(at));
    const text = document.createElement("span");
    text.textContent = "";
    meet.append(text);
    field.append(meet);
    return { meet, text };
  }

  /** 兩條時間軸對到同一個時刻。刻度太多時，只留開頭和兩次對齊。 */
  function appendPeriod(a, b, least, second, beats) {
    const view = document.createElement("div");
    view.className = "period-view";
    const title = document.createElement("p");
    title.className = "figure-label";
    title.textContent = "時間軸";
    const prop = document.createElement("p");
    prop.className = "cut-prop";
    prop.textContent = `${a} 和 ${b} 第一次相遇是 ${least}，再次相遇是 ${second}。`;
    const chart = document.createElement("div");
    chart.className = "period";
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", prop.textContent);

    const names = document.createElement("div");
    names.className = "period-names";
    [a, b].forEach((n) => {
      const name = document.createElement("span");
      name.textContent = String(n);
      names.append(name);
    });

    const field = document.createElement("div");
    field.className = "period-field";
    const lanesWrap = document.createElement("div");
    lanesWrap.className = "period-lanes";
    const laneA = document.createElement("div");
    const laneB = document.createElement("div");
    laneA.className = "period-lane";
    laneB.className = "period-lane";
    lanesWrap.append(laneA, laneB);
    field.append(lanesWrap);

    const more = document.createElement("span");
    more.className = "period-more";
    more.textContent = "…";
    chart.append(names, field, more);
    view.append(title, prop, chart);
    commonBoard.append(view);

    const diagram = [];
    const marks = new Map();
    const remember = (value, el) => {
      if (!marks.has(value)) marks.set(value, []);
      marks.get(value).push(el);
    };
    const many = Math.max(second / a, second / b) > 8;

    if (!many) {
      [[a, laneA], [b, laneB]].forEach(([n, lane]) => {
        const ticks = [];
        multiplesUntil(n, second).forEach((value) => {
          const meet = value === least || value === second;
          const tick = placeTick(lane, (value / second) * 0.92, meet ? "" : String(value));
          remember(value, tick);
          ticks.push(tick);
        });
        diagram.push(...ticks);
      });
    } else {
      const gap = document.createElement("span");
      gap.className = "period-gap";
      gap.textContent = "…";
      field.append(gap);
      [[a, laneA], [b, laneB]].forEach(([n, lane]) => {
        const early = Math.min(3, Math.floor((least - 1) / n));
        const ticks = [];
        for (let i = 0; i < early; i += 1) {
          ticks.push(placeTick(lane, 0.08 + i * 0.08, i === 0 ? String(n) : ""));
        }
        if (ticks.length) diagram.push(ticks);
      });
      diagram.push([gap]);
    }

    [least, second].forEach((value, index) => {
      const at = many ? (index === 0 ? 0.62 : 0.9) : (value / second) * 0.92;
      const { meet, text } = placeMeet(field, at);
      text.textContent = String(value);
      const tone = index === 0 ? 3 : 2;
      const paint = [[meet, tone]];
      (marks.get(value) || []).forEach((el) => paint.push([el, tone]));
      diagram.push({ show: [meet], paint });
    });
    diagram.push([more]);
    diagram.unshift([view]);
    beats.push(...diagram);
  }

  /** 長邊在水平方向，每次沿長邊堆上邊長等於短邊的正方形。 */
  function placeCuts(length, width) {
    const steps = [];
    function cut(x, y, len, wid, horizontal, step) {
      if (len === 0 || wid === 0) return;
      if (len < wid) {
        cut(x, y, wid, len, !horizontal, step);
        return;
      }
      const side = wid;
      const count = Math.floor(len / side);
      const rem = len % side;
      const batch = [];
      for (let i = 0; i < count; i += 1) {
        batch.push({
          x: horizontal ? x + i * side : x,
          y: horizontal ? y : y + i * side,
          side,
          step,
        });
      }
      steps.push(batch);
      if (rem === 0) return;
      if (horizontal) cut(x + count * side, y, wid, rem, false, step + 1);
      else cut(x, y + count * side, wid, rem, true, step + 1);
    }
    cut(0, 0, length, width, true, 0);
    return steps;
  }

  function stackSentence(length, width, steps) {
    if (steps.length === 1) return `長為 ${length}、寬為 ${width}，已經是正方形。`;
    const parts = steps.map((batch, index) => {
      const side = batch[0].side;
      const lead = index === 0 ? "先" : "再";
      return batch.length === 1
        ? `${lead}堆上邊長 ${side} 的正方形`
        : `${lead}堆上 ${batch.length} 個邊長 ${side} 的正方形`;
    });
    const small = steps[steps.length - 1][0].side;
    return `長為 ${length}、寬為 ${width} 的長方形，${parts.join("，")}。最小的正方形邊長是 ${small}。`;
  }

  function appendCuts(a, b, beats) {
    const length = Math.max(a, b);
    const width = Math.min(a, b);
    const steps = placeCuts(length, width);
    const view = document.createElement("div");
    view.className = "square-view";
    const title = document.createElement("p");
    title.className = "figure-label";
    title.textContent = "最小正方形";
    const prop = document.createElement("p");
    prop.className = "cut-prop";
    prop.textContent = steps.length === 1
      ? `長為 ${length}、寬為 ${width}，已經是正方形。`
      : `長為 ${length}、寬為 ${width} 的長方形，堆疊最大正方形的過程。`;

    const frame = document.createElement("div");
    frame.className = "cut-frame";
    const widthLabel = document.createElement("span");
    widthLabel.className = "cut-width";
    widthLabel.textContent = `寬 ${width}`;
    const board = document.createElement("div");
    board.className = "cut-board";
    board.style.setProperty("--len", String(length));
    board.style.setProperty("--wid", String(width));
    board.setAttribute("role", "img");
    board.setAttribute("aria-label", stackSentence(length, width, steps));
    const lengthLabel = document.createElement("span");
    lengthLabel.className = "cut-length";
    lengthLabel.textContent = `長 ${length}`;
    frame.append(widthLabel, board, lengthLabel);
    view.append(title, prop, frame);
    commonBoard.append(view);

    const pieces = steps.flat();
    const grouped = pieces.length > 24;
    const regions = grouped
      ? steps.map((batch) => {
        const x = Math.min(...batch.map((sq) => sq.x));
        const y = Math.min(...batch.map((sq) => sq.y));
        const right = Math.max(...batch.map((sq) => sq.x + sq.side));
        const bottom = Math.max(...batch.map((sq) => sq.y + sq.side));
        return {
          x,
          y,
          w: right - x,
          h: bottom - y,
          step: batch[0].step,
          label: batch.length === 1 ? String(batch[0].side) : `${batch.length} 個`,
        };
      })
      : pieces.map((sq) => ({
        x: sq.x,
        y: sq.y,
        w: sq.side,
        h: sq.side,
        step: sq.step,
        label: (sq.side / length >= 0.18 && sq.side / width >= 0.22) ? String(sq.side) : "",
      }));

    const byStep = [];
    regions.forEach((region) => {
      const cell = document.createElement("span");
      cell.className = "cut-cell";
      cell.style.setProperty("--x", String(region.x));
      cell.style.setProperty("--y", String(region.y));
      cell.style.setProperty("--w", String(region.w));
      cell.style.setProperty("--h", String(region.h));
      if (region.x + region.w === length) cell.classList.add("is-last-col");
      if (region.y + region.h === width) cell.classList.add("is-last-row");
      if (region.label) cell.textContent = region.label;
      paintStep(cell, region.step);
      board.append(cell);
      if (!byStep[region.step]) byStep[region.step] = [];
      byStep[region.step].push(cell);
    });

    beats.push({ show: [view], hold: 6 }, { show: [frame], hold: 3 }, ...byStep.filter(Boolean).map((cells) => cells));
    return { length, width, steps };
  }

  function renderCommon(a, b) {
    const least = lcm(a, b);
    const second = least * 2;
    const rowA = renderRow(a, multipleTokens(a, least, second));
    const rowB = renderRow(b, multipleTokens(b, least, second));
    commonBoard.append(rowA.line, rowB.line);

    const answer = document.createElement("div");
    answer.className = "common-line";
    const answerName = document.createElement("span");
    answerName.className = "common-name";
    answerName.textContent = "公倍數";
    const answerBoard = document.createElement("div");
    answerBoard.className = "factor-board";
    answer.append(answerName, answerBoard);
    commonBoard.append(answer);

    const beats = [...rowA.els, ...rowB.els];
    [least, second].forEach((value, index) => {
      const mark = chip(value);
      answerBoard.append(mark);
      const tone = index === 0 ? 3 : 2;
      beats.push({
        show: [mark],
        paint: [
          [rowA.chips.get(value), tone],
          [rowB.chips.get(value), tone],
          [mark, tone],
        ],
      });
    });
    const tail = chip("…");
    tail.classList.add("is-gap");
    answerBoard.append(tail);
    beats.push([tail]);
    appendPeriod(a, b, least, second, beats);
    const cuts = appendCuts(a, b, beats);
    return { beats, least, second, cuts };
  }

  async function playLadder(steps, pace, token) {
    ladderEl.replaceChildren();
    const nodes = steps.map((step, i) => {
      const factor = document.createElement("div");
      factor.className = "factor";
      factor.textContent = step.left == null ? "" : String(step.left);
      const pair = document.createElement("div");
      pair.className = "pair" + (i < steps.length - 1 ? " has-bracket" : "");
      const isLast = i === steps.length - 1;
      const tones = isLast ? ["mul-b", "mul-a"] : ["", ""];
      step.pair.forEach((value, side) => {
        const num = document.createElement("span");
        num.className = "n" + (tones[side] ? ` ${tones[side]}` : "");
        num.textContent = String(value);
        pair.append(num);
      });
      ladderEl.append(factor, pair);
      return { factor, pair, hasFactor: step.left != null };
    });
    const show = (node) => {
      node.pair.classList.add("is-in");
      if (node.hasFactor) node.factor.classList.add("is-in");
    };
    if (motionOff() && !manual) {
      nodes.forEach(show);
      return token === animToken;
    }
    for (const node of nodes) {
      if (token !== animToken) return false;
      show(node);
      if (!(await waitPace(pace, token))) return false;
    }
    return token === animToken;
  }

  function lcmExpression(steps, common) {
    const factors = [];
    steps.slice(0, -1).forEach((step) => {
      factors.push({ n: step.left, tone: "div" });
    });
    const last = steps[steps.length - 1].pair;
    factors.push({ n: last[0], tone: "mul-b" }, { n: last[1], tone: "mul-a" });
    const shown = factors.filter((factor) => factor.n > 1);

    const expr = document.createElement("span");
    expr.className = "lcm-expr";
    const name = document.createElement("span");
    name.textContent = "LCM";
    expr.append(name, document.createTextNode("="));

    shown.forEach((factor, index) => {
      if (index > 0) expr.append(document.createTextNode("×"));
      const num = document.createElement("span");
      num.className = factor.tone;
      num.textContent = String(factor.n);
      expr.append(num);
    });
    if (shown.length === 0) {
      const only = document.createElement("span");
      only.className = "lcm-value";
      only.textContent = String(common);
      expr.append(only);
      return expr;
    }
    const value = document.createElement("span");
    value.className = "lcm-value";
    value.textContent = String(common);
    expr.append(document.createTextNode("="), value);
    return expr;
  }

  async function play() {
    const token = beginPlay();
    try {
    clearStage();

    if (mode === "multiples") {
      const n = readField("#n");
      if (n == null) {
        resultEl.textContent = "請輸入 1 到 999 的整數。";
        return;
      }
      listEl.hidden = false;
      const rows = renderTimes(n);
      const ok = await reveal(rows, paceFor(rows.length), token);
      if (!ok) return;
      listEl.removeAttribute("aria-hidden");
      resultEl.textContent = `${n} 的倍數是 1×${n}、2×${n}、3×${n}……，可以一直寫下去。`;
      return;
    }

    const a = readField("#fa");
    const b = readField("#fb");
    if (a == null || b == null) {
      resultEl.textContent = "請輸入 1 到 999 的整數。";
      return;
    }

    if (mode === "common") {
      commonBoard.hidden = false;
      const { beats, least, second, cuts } = renderCommon(a, b);
      const ok = await reveal(beats, paceFor(beats.length), token);
      if (!ok) return;
      commonBoard.removeAttribute("aria-hidden");
      const stacking = stackSentence(cuts.length, cuts.width, cuts.steps);
      resultEl.textContent = `${a} 和 ${b} 的公倍數有 ${least}、${second}……。第一次相遇是 ${least}，再次相遇是 ${second}。${stacking}後面還會更大，所以沒有最大公倍數。最小公倍數是 ${least}。`;
      return;
    }

    const steps = shortDivisionSteps(a, b);
    const common = lcm(a, b);
    lcmWrap.hidden = false;
    const ok = await playLadder(steps, paceFor(steps.length + 1), token);
    if (!ok) return;
    const wrap = document.createElement("span");
    wrap.className = "prime-eq";
    wrap.append(
      lcmExpression(steps, common),
      document.createTextNode(`。${a} 和 ${b} 的最小公倍數是 ${common}，通分的公分母就是這個數。`),
    );
    resultEl.replaceChildren(wrap);
    if (motionOff() && !manual) {
      wrap.classList.add("is-in");
      return;
    }
    if (manual) {
      if (!(await waitPace(280, token))) return;
    } else {
      await sleep(16);
      if (token !== animToken) return;
    }
    wrap.classList.add("is-in");
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
  setMode(initial === "common" || initial === "lcm" ? initial : "multiples");
})();
