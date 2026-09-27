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

  function randomReduce() {
    for (let i = 0; i < 80; i += 1) {
      const num = randInt(2, 100);
      const den = randInt(2, 100);
      if (gcd(num, den) > 1) return { num, den };
    }
    return { num: 24, den: 42 };
  }

  function randomCommon() {
    const ad = randInt(2, 100);
    let bd = randInt(2, 100);
    if (bd === ad) bd = ad === 100 ? 99 : ad + 1;
    return { an: randInt(1, 100), ad, bn: randInt(1, 100), bd };
  }

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

  $("#btn-random").addEventListener("click", () => {
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
    form.requestSubmit();
  });

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

  async function playLadder(steps, { markFinal = true, lastClasses = null } = {}) {
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
      await sleep(420);
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
  async function playReduceWork(num, den, g, token) {
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
      await sleep(30);
      if (token !== animToken) return;
      group.forEach((node) => node.classList.add("is-in"));
      await sleep(560);
    }
  }

  /** 短除法結束後，在兩個分數右側逐步寫出同乘與通分結果 */
  async function playCommonWork(an, ad, bn, bd, mA, mB, common, token) {
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

    commonWork.hidden = false;
    commonWork.replaceChildren(...lines.map((line) => line.row));

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
      await sleep(30);
      if (token !== animToken) return;
      batch.forEach((node) => node.classList.add("is-in"));
      await sleep(560);
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
      const token = await playLadder(steps);
      if (token == null) return;
      await playReduceWork(num, den, g, token);
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
    const token = await playLadder(steps, { markFinal: false, lastClasses: ["mul-b", "mul-a"] });
    if (token == null) return;
    await playCommonWork(an, ad, bn, bd, mA, mB, common, token);
  });

  setMode("reduce");
})();
