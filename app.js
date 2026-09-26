(() => {
  const $ = (sel) => document.querySelector(sel);

  const form = $("#form");
  const ladderEl = $("#ladder");
  const resultEl = $("#result");
  const stageLabel = $("#stage-label");
  const inputsReduce = $("#inputs-reduce");
  const inputsCommon = $("#inputs-common");
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
    ladderEl.innerHTML = "";
    resultEl.textContent = "輸入分數後按「開始動畫」。";
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
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
    resultEl.textContent = "輸入分數後按「開始動畫」。";
  });

  async function playLadder(steps, { markFinal = true } = {}) {
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
      pair.innerHTML = `
        <span class="n${markFinal && isLast ? " final" : ""}">${left}</span>
        <span class="n${markFinal && isLast ? " final" : ""}">${right}</span>
      `;

      ladderEl.append(factor, pair);
      nodes.push({ factor, pair, hasFactor: step.left != null });
    }

    for (const node of nodes) {
      if (token !== animToken) return;
      node.pair.classList.add("is-in");
      if (node.hasFactor) node.factor.classList.add("is-in");
      await sleep(420);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (mode === "reduce") {
      const num = Number($("#num").value);
      const den = Number($("#den").value);
      if (!num || !den || num < 1 || den < 1) {
        resultEl.textContent = "請輸入大於 0 的整數。";
        return;
      }

      const steps = shortDivisionSteps(num, den);
      const g = gcd(num, den);
      const factors = steps.slice(0, -1).map((s) => s.left);
      const sn = num / g;
      const sd = den / g;

      stageLabel.textContent = "短除法求最大公因數（約分）";
      await playLadder(steps);

      if (g === 1) {
        resultEl.innerHTML = `<strong>${num}/${den}</strong> 已經是最簡分數（gcd = 1）。`;
      } else {
        const factorText = factors.join(" × ");
        resultEl.innerHTML = `
          gcd(${num}, ${den}) = ${factorText} = <strong>${g}</strong><br />
          <span class="eq">${num}/${den} = ${num}÷${g} / ${den}÷${g} =</span>
          <strong>${sn}/${sd}</strong>
        `;
      }
      return;
    }

    const an = Number($("#a-num").value);
    const ad = Number($("#a-den").value);
    const bn = Number($("#b-num").value);
    const bd = Number($("#b-den").value);
    if ([an, ad, bn, bd].some((n) => !n || n < 1)) {
      resultEl.textContent = "請輸入大於 0 的整數。";
      return;
    }

    const steps = shortDivisionSteps(ad, bd);
    const common = lcm(ad, bd);
    const leftFactors = steps.slice(0, -1).map((s) => s.left);
    const last = steps[steps.length - 1].pair;
    const mA = common / ad;
    const mB = common / bd;

    stageLabel.textContent = "短除法求最小公倍數（通分）";
    await playLadder(steps, { markFinal: true });

    const parts = [...leftFactors, ...last].filter((n) => n > 1);
    resultEl.innerHTML = `
      lcm(${ad}, ${bd}) = ${parts.join(" × ")} = <strong>${common}</strong><br />
      <span class="eq">${an}/${ad} = ${an}×${mA}/${ad}×${mA} =</span>
      <strong>${an * mA}/${common}</strong>
      &nbsp;·&nbsp;
      <span class="eq">${bn}/${bd} = ${bn}×${mB}/${bd}×${mB} =</span>
      <strong>${bn * mB}/${common}</strong>
    `;
  });

  setMode("reduce");
})();
