(() => {
  /**
   * TIMSS 2023 四年級的三個內容領域是 Number、Measurement and Geometry、Data。
   * 每個領域一個下拉選單。整數的因數、倍數，與分數的約分、通分，都在「數」。
   * 新單元加在對應 items，並給 href。
   * https://timss2023.org/results/grade-4-math-subdomains/
   */
  const DOMAINS = [
    {
      id: "number",
      label: "數",
      items: [
        { id: "factors", label: "因數", href: "factors.html" },
        { id: "multiples", label: "倍數", href: "multiples.html" },
        { id: "expand", label: "擴分", href: "index.html?mode=picture" },
        { id: "fractions", label: "約分通分", href: "index.html" },
      ],
    },
    { id: "measure", label: "測量與幾何", items: [] },
    { id: "data", label: "統計", items: [] },
  ];

  const root = document.querySelector("[data-unit-menu]");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const currentId = params.get("mode") === "picture" ? "expand" : (document.body.dataset.unit || "");
  const pickers = [];
  const units = new Map();

  function closeOthers(except) {
    pickers.forEach((picker) => {
      if (picker !== except) picker.setOpen(false);
    });
  }

  DOMAINS.forEach((domain) => {
    const hasCurrent = domain.items.some((item) => item.id === currentId);
    const currentItem = domain.items.find((item) => item.id === currentId);
    const field = document.createElement("div");
    field.className = "unit-field" + (hasCurrent ? " is-current" : "");

    const title = document.createElement("span");
    title.className = "unit-title";
    title.id = `unit-title-${domain.id}`;
    title.textContent = domain.label;

    const picker = document.createElement("div");
    picker.className = "unit-picker";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "unit-picker-btn";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    const listId = `unit-list-${domain.id}`;
    button.setAttribute("aria-controls", listId);

    const value = document.createElement("span");
    value.className = "unit-picker-value";
    value.id = `unit-value-${domain.id}`;
    value.textContent = currentItem ? currentItem.label : "尚未加入";
    button.setAttribute("aria-labelledby", `${title.id} ${value.id}`);
    button.append(value);

    const chevron = document.createElement("span");
    chevron.className = "unit-picker-chevron";
    chevron.setAttribute("aria-hidden", "true");
    button.append(chevron);

    const list = document.createElement("div");
    list.id = listId;
    list.className = "unit-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", domain.label);
    list.hidden = true;

    const options = [];

    if (domain.items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "unit-empty";
      empty.textContent = "尚未加入";
      list.append(empty);
    }

    domain.items.forEach((item) => {
      const selected = item.id === currentId;
      const option = document.createElement(item.href ? "a" : "span");
      option.className = "unit-option" + (selected ? " is-current" : "");
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", selected ? "true" : "false");
      option.dataset.unit = item.id;
      option.append(document.createTextNode(item.label));

      if (item.href) {
        option.href = item.href;
        if (selected) {
          const here = document.createElement("span");
          here.className = "here";
          here.textContent = "目前";
          option.append(here);
        }
      } else {
        option.setAttribute("aria-disabled", "true");
        const soon = document.createElement("span");
        soon.className = "soon";
        soon.textContent = "即將推出";
        option.append(soon);
      }

      list.append(option);
      options.push(option);
      units.set(item.id, { option, value, label: item.label, domainId: domain.id });
    });

    function enabledOptions() {
      return options.filter((option) => option.getAttribute("aria-disabled") !== "true");
    }

    function setOpen(open) {
      if (open) closeOthers(api);
      picker.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", open ? "true" : "false");
      list.hidden = !open;
      if (!open) return;
      const currentOption = options.find((option) => option.getAttribute("aria-selected") === "true");
      const focusTarget = currentOption || enabledOptions()[0];
      if (focusTarget) focusTarget.focus();
    }

    button.addEventListener("click", () => {
      setOpen(list.hidden);
    });

    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      setOpen(true);
    });

    list.addEventListener("click", (event) => {
      const option = event.target.closest("[role='option']");
      if (!option) return;
      if (option.getAttribute("aria-disabled") === "true" || option.getAttribute("aria-selected") === "true") {
        event.preventDefault();
        setOpen(false);
        button.focus();
      }
    });

    list.addEventListener("keydown", (event) => {
      const enabled = enabledOptions();
      const index = enabled.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        button.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
        return;
      }
      event.preventDefault();
      if (enabled.length === 0) return;
      let next = 0;
      if (event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % enabled.length;
      if (event.key === "ArrowUp") next = index <= 0 ? enabled.length - 1 : index - 1;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = enabled.length - 1;
      enabled[next].focus();
    });

    const api = { setOpen };
    pickers.push(api);
    picker.append(button, list);
    field.append(title, picker);
    root.append(field);
  });

  function selectUnit(id) {
    const target = units.get(id);
    if (!target) return;
    units.forEach((entry) => {
      if (entry.domainId !== target.domainId) return;
      const on = entry.option === target.option;
      entry.option.classList.toggle("is-current", on);
      entry.option.setAttribute("aria-selected", on ? "true" : "false");
      const here = entry.option.querySelector(".here");
      if (on && !here) {
        const badge = document.createElement("span");
        badge.className = "here";
        badge.textContent = "目前";
        entry.option.append(badge);
      }
      if (!on && here) here.remove();
    });
    target.value.textContent = target.label;
  }

  document.addEventListener("unit-mode", (event) => {
    if (event.detail && event.detail.id) selectUnit(event.detail.id);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!root.contains(event.target)) closeOthers(null);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = root.querySelector(".unit-picker.is-open .unit-picker-btn");
    if (!open) return;
    closeOthers(null);
    open.focus();
  });

  const stepBtn = document.querySelector("#btn-step");
  const stepDock = document.querySelector("#btn-step-dock");
  if (stepBtn && stepDock) {
    const syncDock = () => {
      const on = stepBtn.classList.contains("is-active");
      stepDock.classList.toggle("is-active", on);
      stepDock.setAttribute("aria-pressed", on ? "true" : "false");
    };
    new MutationObserver(syncDock).observe(stepBtn, {
      attributes: true,
      attributeFilter: ["class"],
    });
    stepDock.hidden = false;
    stepDock.addEventListener("click", () => stepBtn.click());
    syncDock();
  }

  const screenBtn = document.querySelector("#btn-screen");
  if (screenBtn) {
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    const paintScreen = () => {
      const on = Boolean(fullscreenElement());
      screenBtn.classList.toggle("is-active", on);
      screenBtn.setAttribute("aria-pressed", on ? "true" : "false");
      screenBtn.textContent = on ? "結束全螢幕" : "全螢幕";
      document.documentElement.classList.toggle("is-fullscreen", on);
    };
    screenBtn.addEventListener("click", () => {
      if (fullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
        return;
      }
      const page = document.documentElement;
      const enter = page.requestFullscreen || page.webkitRequestFullscreen;
      if (!enter) return;
      const pending = enter.call(page);
      if (pending && typeof pending.catch === "function") pending.catch(() => {});
    });
    document.addEventListener("fullscreenchange", paintScreen);
    document.addEventListener("webkitfullscreenchange", paintScreen);
    paintScreen();
  }
})();
