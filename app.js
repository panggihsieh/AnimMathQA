(() => {
  const $ = (sel) => document.querySelector(sel);

  const form = $("#form");
  const ladderEl = $("#ladder");
  const resultEl = $("#result");
  const stageLabel = $("#stage-label");
  const inputsReduce = $("#inputs-reduce");
  const inputsCommon = $("#inputs-common");
  const inputsPicture = $("#inputs-picture");
  const calcControls = $("#calc-controls");
  const ladderWrap = $(".ladder-wrap");
  const pictureEl = $("#picture");
  const barsEl = $("#bars");
  const reduceWork = $("#reduce-work");
  const commonWork = $("#common-work");
  const modeButtons = document.querySelectorAll(".mode");
  const cutButtons = document.querySelectorAll("[data-cut]");
  let cut = 3;

  let mode = "reduce";
  let animToken = 0;

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  function lcm(a, b) {
    return Math.abs(a * b) / gcd(a, b);
  }

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  const LEVELS = {
    low: { min: 1, max: 30, label: "30 以內，至少兩個質因數" },
    mid: { min: 30, max: 50, label: "30–50，至少兩個質因數" },
    high: { min: 50, max: 100, label: "50–100，分子分母互質" },
  };

  let level = "low";
  const levelButtons = document.querySelectorAll(".level-btn");
  const levelRange = $("#level-range");

  function levelBounds() {
    const band = LEVELS[level];
    return {
      numMin: band.min,
      numMax: band.max,
      denMin: Math.max(2, band.min),
      denMax: band.max,
    };
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

  /** 低、中：兩個數都至少兩個質因數，且公因數也至少兩個；公因數越多越容易被抽到。 */
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

  function compositeIn(min, max) {
    for (let i = 0; i < 40; i += 1) {
      const n = randInt(min, max);
      if (omega(n) >= 2) return n;
    }
    return null;
  }

  /** 高等級：分子與分母互質。 */
  function coprimeFraction(numMin, numMax, denMin, denMax) {
    for (let i = 0; i < 80; i += 1) {
      const n = randInt(numMin, numMax);
      const d = randInt(denMin, denMax);
      if (gcd(n, d) === 1) return { n, d };
    }
    return null;
  }

  function randomReduce() {
    const { denMin, denMax } = levelBounds();
    if (level === "high") {
      const pair = coprimeFraction(denMin, denMax, denMin, denMax);
      return pair ? { num: pair.n, den: pair.d } : { num: 50, den: 51 };
    }
    const pair = richPair(denMin, denMax);
    if (pair) return { num: pair.a, den: pair.b };
    return level === "mid" ? { num: 32, den: 48 } : { num: 12, den: 24 };
  }

  function randomCommon() {
    const { numMin, numMax, denMin, denMax } = levelBounds();
    if (level === "high") {
      for (let i = 0; i < 20; i += 1) {
        const a = coprimeFraction(numMin, numMax, denMin, denMax);
        const b = coprimeFraction(numMin, numMax, denMin, denMax);
        if (a && b && a.d !== b.d) return { an: a.n, ad: a.d, bn: b.n, bd: b.d };
      }
      return { an: 50, ad: 51, bn: 52, bd: 53 };
    }
    const dens = richPair(denMin, denMax);
    const an = compositeIn(numMin, numMax);
    const bn = compositeIn(numMin, numMax);
    if (dens && an != null && bn != null) {
      return { an, ad: dens.a, bn, bd: dens.b };
    }
    if (level === "mid") return { an: 30, ad: 36, bn: 42, bd: 48 };
    return { an: 8, ad: 12, bn: 18, bd: 24 };
  }

  function fillRandom() {
    if (mode === "reduce") {
      const pair = randomReduce();
      $("#num").value = pair.num;
      $("#den").value = pair.den;
    } else {
      const pair = randomCommon();
      $("#a-num").value = pair.an;
      $("#a-den").value = pair.ad;
      $("#b-num").value = pair.bn;
      $("#b-den").value = pair.bd;
    }
    halt();
    ladderEl.innerHTML = "";
    clearWorks();
    resultEl.hidden = false;
    resultEl.textContent = "輸入分數後按「開始動畫」。";
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

  /** 短除法：除數與被除數列對齊，最底列為商 */
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

  const SPEED_OPTIONS = [3, 12, 24, 47, 60];
  let speedSeconds = 3;
  const speedButtons = document.querySelectorAll(".speed-btn");

  function animationSeconds() {
    return SPEED_OPTIONS.includes(speedSeconds) ? speedSeconds : 3;
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

  function motionOff() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  /** 把整段動畫均分到每個出現步驟，總長等於所選秒數 */
  function paceFor(beats) {
    if (manual) {
      document.documentElement.style.setProperty("--anim-fade", "280ms");
      return 280;
    }
    if (motionOff()) {
      document.documentElement.style.setProperty("--anim-fade", "0ms");
      return 0;
    }
    const ms = (animationSeconds() * 1000) / Math.max(1, beats);
    const fade = Math.min(350, ms * 0.45);
    document.documentElement.style.setProperty("--anim-fade", `${fade}ms`);
    return ms;
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

  function zhCount(n) {
    return `${n}分之`;
  }

  function fractionReadout(num, den) {
    const frac = document.createElement("span");
    frac.className = "shown-frac";
    frac.setAttribute("aria-label", `${zhCount(den)}${num}`);
    frac.innerHTML = `<span>${num}</span><span class="bar" aria-hidden="true"></span><span>${den}</span>`;
    return frac;
  }

  function drawBar(parts, shaded, splitEvery) {
    const bar = document.createElement("div");
    bar.className = "draw-bar";
    bar.style.setProperty("--parts", String(parts));
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", `分成 ${parts} 格，塗了 ${shaded} 格`);
    const splitGroups = [];
    for (let i = 0; i < parts; i += 1) {
      const cell = document.createElement("span");
      cell.className = "cell" + (i < shaded ? " is-shaded" : "");
      cell.setAttribute("aria-hidden", "true");
      if (splitEvery && i < parts - 1 && (i + 1) % splitEvery !== 0) {
        cell.classList.add("will-split");
        const group = i % splitEvery;
        if (!splitGroups[group]) splitGroups[group] = [];
        splitGroups[group].push(cell);
      }
      bar.append(cell);
    }
    return { bar, splitGroups: splitGroups.filter(Boolean) };
  }

  function renderPicture() {
    const parts = 2 * cut;
    const board = document.createElement("div");
    board.className = "draw-board";

    const track = document.createElement("div");
    track.className = "draw-track";
    const line = document.createElement("div");
    line.className = "half-line draw-reveal";
    line.setAttribute("aria-hidden", "true");
    const tag = document.createElement("span");
    tag.textContent = "一半";
    line.append(tag);
    const step = document.createElement("p");
    step.className = "draw-step draw-reveal";
    step.textContent = `每一格再分成 ${cut} 小格`;
    const top = drawBar(2, 1);
    const bottom = drawBar(parts, cut, cut);
    top.bar.classList.add("draw-reveal", "is-pending");
    bottom.bar.classList.add("draw-reveal");
    track.append(line, top.bar, step, bottom.bar);

    const side = document.createElement("div");
    side.className = "draw-side";
    const sideGap = document.createElement("span");
    sideGap.setAttribute("aria-hidden", "true");
    const topFrac = fractionReadout(1, 2);
    const bottomFrac = fractionReadout(cut, parts);
    topFrac.classList.add("draw-reveal");
    bottomFrac.classList.add("draw-reveal");
    side.append(topFrac, sideGap, bottomFrac);

    const times = document.createElement("div");
    times.className = "draw-times";
    times.setAttribute("aria-hidden", "true");
    times.innerHTML = `<span>×${cut}</span><span></span><span>×${cut}</span>`;
    const equal = document.createElement("span");
    equal.className = "draw-equal";
    equal.textContent = "=";
    const eq = document.createElement("div");
    eq.className = "draw-eq draw-reveal";
    eq.setAttribute("aria-label", `${zhCount(2)}1 等於 ${zhCount(parts)}${cut}`);
    eq.append(fractionReadout(1, 2), times, equal, fractionReadout(cut, parts));

    board.append(track, side);
    barsEl.replaceChildren(board, eq);
    return {
      topBar: top.bar,
      topShade: top.bar.querySelector(".is-shaded"),
      topFrac,
      line,
      step,
      bottomBar: bottom.bar,
      splits: bottom.splitGroups,
      bottomFrac,
      eq,
    };
  }

  function pictureCaption() {
    return `塗色都停在一半。1 和 2 一起乘 ${cut}，還是一樣大。`;
  }

  function classBeat(nodes) {
    const list = nodes.filter(Boolean);
    return {
      apply() { list.forEach((el) => el.classList.add("is-in")); },
      undo() { list.forEach((el) => el.classList.remove("is-in")); },
    };
  }

  async function playPicture() {
    const token = beginPlay();
    try {
    const view = renderPicture();
    const steps = [
      classBeat([view.topBar]),
      classBeat([view.topShade]),
      classBeat([view.topFrac]),
      classBeat([view.line]),
      classBeat([view.step]),
      classBeat([view.bottomBar]),
      ...view.splits.map((group) => classBeat(group)),
      classBeat([view.bottomFrac]),
      classBeat([view.eq]),
      {
        apply() {
          barsEl.removeAttribute("aria-hidden");
          resultEl.hidden = false;
          resultEl.textContent = pictureCaption();
        },
        undo() {
          barsEl.setAttribute("aria-hidden", "true");
          resultEl.textContent = "";
        },
      },
    ];
    barsEl.setAttribute("aria-hidden", "true");
    resultEl.hidden = false;
    resultEl.textContent = "";
    await runBeats(steps, paceFor(steps.length), token);
    } finally {
      if (token === animToken) playing = false;
    }
  }

  function setCut(next) {
    cut = next;
    cutButtons.forEach((btn) => {
      const on = Number(btn.dataset.cut) === next;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
    if (mode === "picture") playPicture();
  }

  cutButtons.forEach((btn) => {
    btn.addEventListener("click", () => setCut(Number(btn.dataset.cut)));
  });

  function setMode(next) {
    mode = next;
    modeButtons.forEach((btn) => {
      const on = btn.dataset.mode === next;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    const picture = next === "picture";
    inputsReduce.classList.toggle("is-hidden", next !== "reduce");
    inputsCommon.classList.toggle("is-hidden", next !== "common");
    inputsPicture.classList.toggle("is-hidden", !picture);
    calcControls.classList.remove("is-hidden");
    $(".level").hidden = picture;
    $("#btn-random").hidden = picture;
    ladderWrap.hidden = picture;
    pictureEl.hidden = !picture;
    halt();
    ladderEl.innerHTML = "";
    clearWorks();
    resultEl.hidden = false;
    const url = new URL(location.href);
    if (picture) url.searchParams.set("mode", "picture");
    else url.searchParams.delete("mode");
    history.replaceState(null, "", url);
    document.dispatchEvent(new CustomEvent("unit-mode", {
      detail: { id: picture ? "expand" : "fractions" },
    }));
    if (picture) {
      stageLabel.textContent = "畫圖表示";
      playPicture();
      return;
    }
    stageLabel.textContent =
      next === "reduce" ? "短除法求最大公因數（約分）" : "短除法求最小公倍數（通分）";
    resultEl.textContent = "輸入分數後按「開始動畫」。";
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  $("#btn-random").addEventListener("click", fillRandom);

  $("#btn-reset").addEventListener("click", () => {
    halt();
    if (mode === "picture") {
      setCut(3);
      return;
    }
    if (mode === "reduce") {
      $("#num").value = 24;
      $("#den").value = 42;
    } else {
      $("#a-num").value = 1;
      $("#a-den").value = 6;
      $("#b-num").value = 1;
      $("#b-den").value = 4;
    }
    ladderEl.innerHTML = "";
    clearWorks();
    resultEl.hidden = false;
    resultEl.textContent = "輸入分數後按「開始動畫」。";
  });

  function ladderBeats(steps, { markFinal = true, lastClasses = null } = {}) {
    ladderEl.innerHTML = "";
    const nodes = steps.map((step, i) => {
      const factor = document.createElement("div");
      factor.className = "factor";
      factor.textContent = step.left == null ? "" : String(step.left);
      const pair = document.createElement("div");
      pair.className = "pair" + (i < steps.length - 1 ? " has-bracket" : "");
      const [left, right] = step.pair;
      const isLast = i === steps.length - 1;
      const tone = isLast && lastClasses
        ? lastClasses
        : (markFinal && isLast ? ["final", "final"] : ["", ""]);
      pair.innerHTML = `
        <span class="n${tone[0] ? ` ${tone[0]}` : ""}">${left}</span>
        <span class="n${tone[1] ? ` ${tone[1]}` : ""}">${right}</span>
      `;
      ladderEl.append(factor, pair);
      return { factor, pair, hasFactor: step.left != null };
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

  function clearReduceWork() {
    reduceWork.hidden = true;
    reduceWork.replaceChildren();
  }

  function clearCommonWork() {
    commonWork.hidden = true;
    commonWork.replaceChildren();
  }

  function clearWorks() {
    clearReduceWork();
    clearCommonWork();
  }

  function equalsSign() {
    return Object.assign(document.createElement("span"), { className: "op", textContent: "=" });
  }

  function factorMark(text, className = "div") {
    const mark = document.createElement("span");
    mark.className = className;
    mark.textContent = text;
    return mark;
  }

  function stackedFraction(top, bottom, className) {
    const frac = document.createElement("span");
    frac.className = `shown-frac ${className}`;
    const topEl = document.createElement("span");
    topEl.className = "top";
    topEl.append(...top);
    const bar = document.createElement("span");
    bar.className = "bar";
    bar.setAttribute("aria-hidden", "true");
    const botEl = document.createElement("span");
    botEl.className = "bot";
    botEl.append(...bottom);
    frac.append(topEl, bar, botEl);
    return frac;
  }

  function plain(text) {
    return document.createTextNode(text);
  }

  function divisorMark(g) {
    return factorMark(`÷${g}`);
  }

  /** 短除法結束後，在輸入分數右側逐步寫出同除與最簡分數 */
  function reduceBeats(num, den, g) {
    if (g <= 1) return [];
    const sn = num / g;
    const sd = den / g;
    const groups = [
      [Object.assign(document.createElement("span"), { className: "op", textContent: "=" })],
      [stackedFraction([plain(String(num)), divisorMark(g)], [plain(String(den)), divisorMark(g)], "mid")],
      [
        Object.assign(document.createElement("span"), { className: "op", textContent: "=" }),
        stackedFraction([plain(String(sn))], [plain(String(sd))], "final"),
      ],
    ];
    return groups.map((group) => ({
      apply() {
        reduceWork.hidden = false;
        reduceWork.append(...group);
        group.forEach((node) => node.classList.add("is-in"));
      },
      undo() {
        group.forEach((node) => node.remove());
        if (!reduceWork.childNodes.length) reduceWork.hidden = true;
      },
    }));
  }

  /** 短除法的除數與最底列，依顏色乘成最小公倍數 */
  function lcmExpression(steps, common) {
    const factors = [];
    steps.slice(0, -1).forEach((step) => {
      factors.push({ n: step.left, tone: "div" });
    });
    const last = steps[steps.length - 1].pair;
    factors.push({ n: last[0], tone: "mul-b" }, { n: last[1], tone: "mul-a" });
    const parts = factors.filter((factor) => factor.n > 1);

    const expr = document.createElement("span");
    expr.className = "lcm-expr op";
    const name = document.createElement("span");
    name.textContent = "LCM";
    expr.append(name, Object.assign(document.createElement("span"), { textContent: "=" }));

    parts.forEach((factor, index) => {
      if (index > 0) {
        expr.append(Object.assign(document.createElement("span"), { textContent: "×" }));
      }
      const num = document.createElement("span");
      num.className = factor.tone;
      num.textContent = String(factor.n);
      expr.append(num);
    });
    if (parts.length === 0) {
      const only = document.createElement("span");
      only.className = "lcm-value";
      only.textContent = String(common);
      expr.append(only);
      return expr;
    }

    const value = document.createElement("span");
    value.className = "lcm-value";
    value.textContent = String(common);
    expr.append(Object.assign(document.createElement("span"), { textContent: "=" }), value);
    return expr;
  }

  /** 先寫出最小公倍數當公分母，再寫每個分數要同乘的數 */
  function commonBeats(an, ad, bn, bd, mA, mB, common, steps) {
    const specs = [
      { n: an, d: ad, m: mA, tone: "mul-a" },
      { n: bn, d: bd, m: mB, tone: "mul-b" },
    ];
    const lines = specs.map((item) => {
      const row = document.createElement("div");
      row.className = "reduce-work";
      const groups = item.m <= 1
        ? [[equalsSign(), stackedFraction([plain(String(item.n))], [plain(String(item.d))], "final")]]
        : [
            [equalsSign()],
            [stackedFraction(
              [plain(String(item.n)), factorMark(`×${item.m}`, item.tone)],
              [plain(String(item.d)), factorMark(`×${item.m}`, item.tone)],
              "mid",
            )],
            [equalsSign(), stackedFraction([plain(String(item.n * item.m))], [plain(String(common))], "final")],
          ];
      return { row, groups };
    });

    const lcmRow = document.createElement("div");
    lcmRow.className = "reduce-work";
    const lcmExpr = lcmExpression(steps, common);
    lcmRow.append(lcmExpr);

    const beats = [{
      apply() {
        commonWork.hidden = false;
        commonWork.append(lcmRow);
        lcmExpr.classList.add("is-in");
      },
      undo() {
        lcmExpr.classList.remove("is-in");
        lcmRow.remove();
        if (!commonWork.childNodes.length) commonWork.hidden = true;
      },
    }];

    const stepCount = Math.max(...lines.map((line) => line.groups.length));
    for (let i = 0; i < stepCount; i += 1) {
      beats.push({
        apply() {
          lines.forEach((line) => {
            const group = line.groups[i];
            if (!group) return;
            if (!line.row.isConnected) commonWork.append(line.row);
            line.row.append(...group);
            group.forEach((node) => node.classList.add("is-in"));
          });
        },
        undo() {
          lines.forEach((line) => {
            const group = line.groups[i];
            if (!group) return;
            group.forEach((node) => node.remove());
            if (!line.row.childNodes.length) line.row.remove();
          });
        },
      });
    }
    return beats;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (mode === "picture") {
      playPicture();
      return;
    }

    if (mode === "reduce") {
      const num = Number($("#num").value);
      const den = Number($("#den").value);
      if (!num || !den || num < 1 || den < 1) {
        halt();
        clearWorks();
        resultEl.hidden = false;
        resultEl.textContent = "請輸入大於 0 的整數。";
        return;
      }

      const steps = shortDivisionSteps(num, den);
      const g = gcd(num, den);
      stageLabel.textContent = "短除法求最大公因數（約分）";
      resultEl.hidden = true;
      resultEl.textContent = "";
      clearWorks();
      const token = beginPlay();
      try {
        const beats = [...ladderBeats(steps), ...reduceBeats(num, den, g)];
        await runBeats(beats, paceFor(beats.length), token);
      } finally {
        if (token === animToken) playing = false;
      }
      return;
    }

    const an = Number($("#a-num").value);
    const ad = Number($("#a-den").value);
    const bn = Number($("#b-num").value);
    const bd = Number($("#b-den").value);
    if ([an, ad, bn, bd].some((n) => !n || n < 1)) {
      halt();
      clearWorks();
      resultEl.hidden = false;
      resultEl.textContent = "請輸入大於 0 的整數。";
      return;
    }

    const steps = shortDivisionSteps(ad, bd);
    const common = lcm(ad, bd);
    const mA = common / ad;
    const mB = common / bd;

    stageLabel.textContent = "短除法求最小公倍數（通分）";
    resultEl.hidden = true;
    resultEl.textContent = "";
    clearWorks();
    const token = beginPlay();
    try {
      const beats = [
        ...ladderBeats(steps, { markFinal: false, lastClasses: ["mul-b", "mul-a"] }),
        ...commonBeats(an, ad, bn, bd, mA, mB, common, steps),
      ];
      await runBeats(beats, paceFor(beats.length), token);
    } finally {
      if (token === animToken) playing = false;
    }
  });

  setMode(new URLSearchParams(location.search).get("mode") === "picture" ? "picture" : "reduce");
})();
