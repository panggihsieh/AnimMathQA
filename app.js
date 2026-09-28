(() => {
  const $ = (sel) => document.querySelector(sel);

  const form = $("#form");
  const ladderEl = $("#ladder");
  const resultEl = $("#result");
  const stageLabel = $("#stage-label");
  const inputsReduce = $("#inputs-reduce");
  const inputsCommon = $("#inputs-common");
  const reduceWork = $("#reduce-work");
  const commonWork = $("#common-work");
  const modeButtons = document.querySelectorAll(".mode");

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
    animToken += 1;
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

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const speedInput = $("#anim-seconds");
  const speedLabel = $("#anim-seconds-label");

  function animationSeconds() {
    const n = Number(speedInput.value);
    if (n < 1) return 1;
    if (n > 60) return 60;
    return n || 3;
  }

  /** 把整段動畫均分到每個出現步驟，總長等於拉桿的秒數 */
  function paceFor(beats) {
    const ms = (animationSeconds() * 1000) / Math.max(1, beats);
    const fade = Math.min(350, ms * 0.45);
    document.documentElement.style.setProperty("--anim-fade", `${fade}ms`);
    return ms;
  }

  speedInput.addEventListener("input", () => {
    speedLabel.textContent = String(animationSeconds());
  });

  function setMode(next) {
    mode = next;
    modeButtons.forEach((btn) => {
      const on = btn.dataset.mode === next;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    inputsReduce.classList.toggle("is-hidden", next !== "reduce");
    inputsCommon.classList.toggle("is-hidden", next !== "common");
    stageLabel.textContent =
      next === "reduce" ? "短除法求最大公因數（約分）" : "短除法求最小公倍數（通分）";
    animToken += 1;
    ladderEl.innerHTML = "";
    clearWorks();
    resultEl.hidden = false;
    resultEl.textContent = "輸入分數後按「開始動畫」。";
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  $("#btn-random").addEventListener("click", fillRandom);

  $("#btn-reset").addEventListener("click", () => {
    animToken += 1;
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

  async function playLadder(steps, { markFinal = true, lastClasses = null, pace = 420 } = {}) {
    const token = ++animToken;
    ladderEl.innerHTML = "";

    const nodes = [];
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
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
      nodes.push({ factor, pair, hasFactor: step.left != null });
    }

    for (const node of nodes) {
      if (token !== animToken) return null;
      node.pair.classList.add("is-in");
      if (node.hasFactor) node.factor.classList.add("is-in");
      await sleep(pace);
    }
    return token;
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
  async function playReduceWork(num, den, g, token, pace) {
    if (g <= 1 || token !== animToken) return;
    const sn = num / g;
    const sd = den / g;
    reduceWork.hidden = false;
    reduceWork.replaceChildren();

    const groups = [
      [Object.assign(document.createElement("span"), { className: "op", textContent: "=" })],
      [stackedFraction([plain(String(num)), divisorMark(g)], [plain(String(den)), divisorMark(g)], "mid")],
      [
        Object.assign(document.createElement("span"), { className: "op", textContent: "=" }),
        stackedFraction([plain(String(sn))], [plain(String(sd))], "final"),
      ],
    ];

    for (const group of groups) {
      if (token !== animToken) return;
      reduceWork.append(...group);
      await sleep(16);
      if (token !== animToken) return;
      group.forEach((node) => node.classList.add("is-in"));
      await sleep(Math.max(0, pace - 16));
    }
  }

  /** 短除法的除數與最底列，依顏色乘成最小公倍數 */
  function lcmExpression(steps, common) {
    const factors = [];
    steps.slice(0, -1).forEach((step) => {
      factors.push({ n: step.left, tone: "div" });
    });
    const last = steps[steps.length - 1].pair;
    factors.push({ n: last[0], tone: "mul-b" }, { n: last[1], tone: "mul-a" });
    const shown = factors.filter((factor) => factor.n > 1);

    const expr = document.createElement("span");
    expr.className = "lcm-expr op";
    const name = document.createElement("span");
    name.textContent = "LCM";
    expr.append(name, Object.assign(document.createElement("span"), { textContent: "=" }));

    shown.forEach((factor, index) => {
      if (index > 0) {
        expr.append(Object.assign(document.createElement("span"), { textContent: "×" }));
      }
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
    expr.append(Object.assign(document.createElement("span"), { textContent: "=" }), value);
    return expr;
  }

  /** 先寫出最小公倍數當公分母，再寫每個分數要同乘的數 */
  async function playCommonWork(an, ad, bn, bd, mA, mB, common, steps, token, pace) {
    if (token !== animToken) return;
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

    commonWork.hidden = false;
    commonWork.replaceChildren(lcmRow, ...lines.map((line) => line.row));

    if (token !== animToken) return;
    await sleep(16);
    if (token !== animToken) return;
    lcmExpr.classList.add("is-in");
    await sleep(Math.max(0, pace - 16));

    const stepCount = Math.max(...lines.map((line) => line.groups.length));
    for (let i = 0; i < stepCount; i += 1) {
      if (token !== animToken) return;
      const batch = [];
      lines.forEach((line) => {
        const group = line.groups[i];
        if (!group) return;
        line.row.append(...group);
        batch.push(...group);
      });
      await sleep(16);
      if (token !== animToken) return;
      batch.forEach((node) => node.classList.add("is-in"));
      await sleep(Math.max(0, pace - 16));
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (mode === "reduce") {
      const num = Number($("#num").value);
      const den = Number($("#den").value);
      if (!num || !den || num < 1 || den < 1) {
        animToken += 1;
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
      const resultBeats = g > 1 ? 3 : 0;
      const pace = paceFor(steps.length + resultBeats);
      const token = await playLadder(steps, { pace });
      if (token == null) return;
      await playReduceWork(num, den, g, token, pace);
      return;
    }

    const an = Number($("#a-num").value);
    const ad = Number($("#a-den").value);
    const bn = Number($("#b-num").value);
    const bd = Number($("#b-den").value);
    if ([an, ad, bn, bd].some((n) => !n || n < 1)) {
      animToken += 1;
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
    const resultBeats = (mA > 1 || mB > 1 ? 3 : 1) + 1;
    const pace = paceFor(steps.length + resultBeats);
    const token = await playLadder(steps, { markFinal: false, lastClasses: ["mul-b", "mul-a"], pace });
    if (token == null) return;
    await playCommonWork(an, ad, bn, bd, mA, mB, common, steps, token, pace);
  });

  setMode("reduce");
})();
