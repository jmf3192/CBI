(function () {
  "use strict";

  const locale = "es-ES";
  const selector = "input[data-number-format]";

  function parse(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const clean = String(value ?? "")
      .trim()
      .replace(/[\s\u00a0€%]/g, "")
      .replace(/[^0-9,.-]/g, "");
    if (!clean || clean === "-" || clean === "," || clean === ".") return 0;

    const negative = clean.startsWith("-");
    const unsigned = clean.replace(/-/g, "");
    const comma = unsigned.lastIndexOf(",");
    const dot = unsigned.lastIndexOf(".");
    let normalized;

    if (comma >= 0 && dot >= 0) {
      normalized = comma > dot
        ? unsigned.replace(/\./g, "").replace(",", ".")
        : unsigned.replace(/,/g, "");
    } else if (comma >= 0) {
      normalized = unsigned.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(unsigned)) {
      normalized = unsigned.replace(/\./g, "");
    } else {
      normalized = unsigned;
    }

    const number = Number(`${negative ? "-" : ""}${normalized}`);
    return Number.isFinite(number) ? number : 0;
  }

  function format(value, maximumFractionDigits = 0) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits,
      useGrouping: "always",
    }).format(parse(value));
  }

  function fractionDigits(input) {
    const configured = Number(input.dataset.numberDecimals);
    return Number.isFinite(configured) ? Math.max(0, Math.min(6, configured)) : 0;
  }

  function formatWhileTyping(value, decimals) {
    const raw = String(value ?? "").replace(/[\s\u00a0€%]/g, "");
    const negative = raw.trim().startsWith("-");
    const unsigned = raw.replace(/-/g, "").replace(/[^0-9,.]/g, "");
    const commaIndex = unsigned.lastIndexOf(",");
    let integerDigits;
    let decimalDigits = "";
    let hasDecimalMark = false;

    if (decimals > 0 && commaIndex >= 0) {
      integerDigits = unsigned.slice(0, commaIndex).replace(/\D/g, "");
      decimalDigits = unsigned.slice(commaIndex + 1).replace(/\D/g, "").slice(0, decimals);
      hasDecimalMark = true;
    } else {
      const dotParts = unsigned.split(".");
      const dotLooksDecimal = decimals > 0
        && dotParts.length === 2
        && dotParts[1].length > 0
        && dotParts[1].length <= decimals
        && !/^\d{1,3}\.\d{3}$/.test(unsigned);
      if (dotLooksDecimal) {
        integerDigits = dotParts[0].replace(/\D/g, "");
        decimalDigits = dotParts[1].replace(/\D/g, "").slice(0, decimals);
        hasDecimalMark = true;
      } else {
        integerDigits = unsigned.replace(/\D/g, "");
      }
    }

    if (!integerDigits && !hasDecimalMark) return negative ? "-" : "";
    const integer = Number(integerDigits || "0");
    const grouped = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
      useGrouping: "always",
    }).format(integer);
    return `${negative ? "-" : ""}${grouped}${hasDecimalMark ? `,${decimalDigits}` : ""}`;
  }

  function restoreCaret(input, digitCount) {
    let position = 0;
    let seen = 0;
    while (position < input.value.length && seen < digitCount) {
      if (/\d/.test(input.value[position])) seen += 1;
      position += 1;
    }
    input.setSelectionRange(position, position);
  }

  function normalizeInput(input) {
    if (!String(input.value ?? "").trim()) return;
    input.value = format(input.value, fractionDigits(input));
  }

  function enhanceInput(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.numberEnhanced === "true") return;
    const decimals = fractionDigits(input);
    input.dataset.numberEnhanced = "true";
    input.classList.add("cbi-number-input");
    input.type = "text";
    input.inputMode = decimals > 0 ? "decimal" : "numeric";
    input.autocomplete = "off";
    normalizeInput(input);

    input.addEventListener("input", () => {
      const caret = input.selectionStart ?? input.value.length;
      const digitCount = (input.value.slice(0, caret).match(/\d/g) || []).length;
      input.value = formatWhileTyping(input.value, decimals);
      restoreCaret(input, digitCount);
    });
    input.addEventListener("focus", () => {
      if (parse(input.value) === 0) input.select();
    });
    input.addEventListener("blur", () => normalizeInput(input));
  }

  function init(root = document) {
    if (root.matches?.(selector)) enhanceInput(root);
    root.querySelectorAll?.(selector).forEach(enhanceInput);
  }

  function setValue(input, value) {
    if (!input) return;
    enhanceInput(input);
    input.value = format(value, fractionDigits(input));
  }

  window.CBINumbers = { parse, format, init, setValue };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), { once: true });
  } else {
    init();
  }

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) init(node);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
