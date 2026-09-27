(() => {
  /**
   * TIMSS 2023 四年級的三個內容領域是 Number、Measurement and Geometry、Data。
   * 國小課程裡的 Data 就是統計：讀圖、整理與比較資料。機率要到較高年級才獨立出來。
   * 整數的因數、倍數，與分數的約分、通分，都在「數」。
   * 新單元加在對應 items，並給 href。
   * https://timss2023.org/results/grade-4-math-subdomains/
   */
  const DOMAINS = [
    {
      id: "number",
      label: "數",
      items: [
        { id: "factors", label: "因數" },
        { id: "multiples", label: "倍數" },
        { id: "fractions", label: "約分通分", href: "index.html" },
      ],
    },
    { id: "measure", label: "測量與幾何", items: [] },
    { id: "data", label: "統計", items: [] },
  ];

  const root = document.querySelector("[data-unit-menu]");
  if (!root) return;

  const currentId = document.body.dataset.unit || "";
  const current = DOMAINS.flatMap((domain) => domain.items.map((item) => ({ ...item, domain }))).find(
    (item) => item.id === currentId,
  );

  const picker = document.createElement("div");
  picker.className = "unit-picker";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "unit-picker-btn";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "unit-list");

  const kicker = document.createElement("span");
  kicker.className = "unit-picker-kicker";
  kicker.textContent = current ? current.domain.label : "數學單元";

  const value = document.createElement("span");
  value.className = "unit-picker-value";
  value.textContent = current ? current.label : "選擇單元";

  const chevron = document.createElement("span");
  chevron.className = "unit-picker-chevron";
  chevron.setAttribute("aria-hidden", "true");

  button.append(kicker, value, chevron);

  const list = document.createElement("div");
  list.id = "unit-list";
  list.className = "unit-list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "數學單元");
  list.hidden = true;

  const options = [];

  DOMAINS.forEach((domain) => {
    const group = document.createElement("div");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", domain.label);

    const label = document.createElement("p");
    label.className = "unit-group-label";
    label.textContent = domain.label;
    group.append(label);

    if (domain.items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "unit-empty";
      empty.textContent = "尚未加入";
      group.append(empty);
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

      group.append(option);
      options.push(option);
    });

    list.append(group);
  });

  function setOpen(open) {
    picker.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    list.hidden = !open;
    if (open) {
      const currentOption = options.find((option) => option.getAttribute("aria-selected") === "true");
      (currentOption || options.find((option) => option.hasAttribute("href")) || button).focus();
    }
  }

  function enabledOptions() {
    return options.filter((option) => option.getAttribute("aria-disabled") !== "true");
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

  document.addEventListener("pointerdown", (event) => {
    if (!picker.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !list.hidden) {
      setOpen(false);
      button.focus();
    }
  });

  picker.append(button, list);
  root.append(picker);
})();
