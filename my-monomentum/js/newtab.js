/* ============================================================
   Emilys Monomentum — new tab page logic
   Features: live clock + greeting, daily rotating background,
   persistent priorities list.
   ============================================================ */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     Storage helper
     Uses chrome.storage.local when running as an installed
     extension, and falls back to localStorage so the page also
     works when opened directly as a file (handy for testing).
     --------------------------------------------------------- */
  const store = {
    hasChrome:
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local,

    get(keys) {
      return new Promise((resolve) => {
        if (this.hasChrome) {
          chrome.storage.local.get(keys, (res) => resolve(res || {}));
        } else {
          const out = {};
          (Array.isArray(keys) ? keys : [keys]).forEach((k) => {
            try {
              const raw = localStorage.getItem(k);
              if (raw !== null) out[k] = JSON.parse(raw);
            } catch (e) {
              /* ignore */
            }
          });
          resolve(out);
        }
      });
    },

    set(obj) {
      return new Promise((resolve) => {
        if (this.hasChrome) {
          chrome.storage.local.set(obj, () => resolve());
        } else {
          Object.keys(obj).forEach((k) => {
            try {
              localStorage.setItem(k, JSON.stringify(obj[k]));
            } catch (e) {
              /* ignore */
            }
          });
          resolve();
        }
      });
    }
  };

  /* ---------------------------------------------------------
     Clock + greeting
     --------------------------------------------------------- */
  const clockEl = document.getElementById("clock");
  const greetingEl = document.getElementById("greeting");
  const DEFAULT_NAME = "Emily";
  let userName = DEFAULT_NAME;

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    clockEl.innerHTML =
      h12 + ":" + pad(m) + '<span class="ampm">' + ampm + "</span>";
  }

  function greetingWord(hour) {
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function renderGreeting() {
    const hour = new Date().getHours();
    greetingEl.innerHTML =
      greetingWord(hour) +
      ', <span class="name" id="name" title="Click to change your name">' +
      escapeHtml(userName) +
      "</span>";
    document.getElementById("name").addEventListener("click", startEditName);
  }

  function startEditName() {
    const nameSpan = document.getElementById("name");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "name-input";
    input.value = userName;
    input.maxLength = 24;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const commit = async () => {
      const val = input.value.trim();
      userName = val || DEFAULT_NAME;
      await store.set({ userName: userName });
      renderGreeting();
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      if (e.key === "Escape") {
        input.value = userName;
        input.blur();
      }
    });
  }

  /* ---------------------------------------------------------
     Background image (daily rotation, cached)
     --------------------------------------------------------- */
  const bgEl = document.getElementById("bg");

  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / 86400000);
  }

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function applyBackground(url) {
    const img = new Image();
    img.onload = function () {
      bgEl.style.backgroundImage = 'url("' + url + '")';
      bgEl.classList.add("is-visible");
    };
    img.onerror = function () {
      /* Leave the CSS gradient in place; nothing else to do. */
    };
    img.src = url;
  }

  async function initBackground() {
    const width = Math.round(
      window.innerWidth * (window.devicePixelRatio || 1)
    );
    const cache = (await store.get(["bgCache"])).bgCache;

    // Instant paint from cache if it's for today (browser cache serves it fast).
    if (cache && cache.date === todayKey() && cache.url) {
      applyBackground(cache.url);
      return;
    }

    // Pick today's photo deterministically so it stays stable all day.
    const startIndex =
      dayOfYear(new Date()) % UNSPLASH_PHOTO_IDS.length;

    // Try the chosen photo; if it fails, walk forward through the list.
    let attempts = 0;
    function tryIndex(i) {
      if (attempts >= UNSPLASH_PHOTO_IDS.length) return;
      attempts++;
      const id = UNSPLASH_PHOTO_IDS[i % UNSPLASH_PHOTO_IDS.length];
      const url = buildUnsplashUrl(id, width);
      const img = new Image();
      img.onload = function () {
        bgEl.style.backgroundImage = 'url("' + url + '")';
        bgEl.classList.add("is-visible");
        store.set({ bgCache: { date: todayKey(), url: url } });
      };
      img.onerror = function () {
        tryIndex(i + 1);
      };
      img.src = url;
    }
    tryIndex(startIndex);
  }

  /* ---------------------------------------------------------
     Priorities list
     --------------------------------------------------------- */
  const listEl = document.getElementById("priority-list");
  const formEl = document.getElementById("priority-form");
  const inputEl = document.getElementById("priority-input");
  const countEl = document.getElementById("priorities-count");
  const emptyEl = document.getElementById("priorities-empty");
  const clearBtn = document.getElementById("clear-done");
  const cardEl = document.getElementById("priorities");
  const toggleBtn = document.getElementById("priorities-toggle");

  let priorities = [];

  function savePriorities() {
    return store.set({ priorities: priorities });
  }

  function renderPriorities() {
    listEl.innerHTML = "";
    priorities.forEach((p) => {
      const li = document.createElement("li");
      li.className = "priority-item" + (p.done ? " is-done" : "");

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "priority-check";
      check.checked = p.done;
      check.setAttribute("aria-label", "Mark done");
      check.addEventListener("change", () => {
        p.done = check.checked;
        savePriorities();
        renderPriorities();
      });

      const span = document.createElement("span");
      span.className = "priority-text";
      span.textContent = p.text;

      const del = document.createElement("button");
      del.className = "priority-delete";
      del.innerHTML = "&times;";
      del.title = "Remove";
      del.setAttribute("aria-label", "Remove priority");
      del.addEventListener("click", () => {
        priorities = priorities.filter((x) => x.id !== p.id);
        savePriorities();
        renderPriorities();
      });

      li.appendChild(check);
      li.appendChild(span);
      li.appendChild(del);
      listEl.appendChild(li);
    });

    const remaining = priorities.filter((p) => !p.done).length;
    const hasDone = priorities.some((p) => p.done);
    countEl.textContent = priorities.length
      ? remaining + " left"
      : "";
    emptyEl.style.display = priorities.length ? "none" : "";
    clearBtn.hidden = !hasDone;
  }

  function addPriority(text) {
    const t = text.trim();
    if (!t) return;
    priorities.push({
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      text: t,
      done: false
    });
    savePriorities();
    renderPriorities();
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    addPriority(inputEl.value);
    inputEl.value = "";
    inputEl.focus();
  });

  clearBtn.addEventListener("click", () => {
    priorities = priorities.filter((p) => !p.done);
    savePriorities();
    renderPriorities();
  });

  toggleBtn.addEventListener("click", async () => {
    const collapsed = cardEl.classList.toggle("is-collapsed");
    toggleBtn.textContent = collapsed ? "+" : "–";
    await store.set({ prioritiesCollapsed: collapsed });
  });

  /* ---------------------------------------------------------
     Small utils
     --------------------------------------------------------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  async function init() {
    // Clock first — no storage needed, paints immediately.
    updateClock();
    setInterval(updateClock, 1000);

    const data = await store.get([
      "userName",
      "priorities",
      "prioritiesCollapsed",
      "notesCollapsed"
    ]);

    userName = data.userName || DEFAULT_NAME;
    renderGreeting();
    // Keep the greeting word correct if the tab is left open across noon/evening.
    setInterval(renderGreeting, 60 * 1000);

    priorities = Array.isArray(data.priorities) ? data.priorities : [];
    renderPriorities();

    if (data.prioritiesCollapsed) {
      cardEl.classList.add("is-collapsed");
      toggleBtn.textContent = "+";
    }

    initBackground();

    // Live Lisbon weather (top-left). Shares the same storage helper for caching.
    if (typeof WEATHER !== "undefined") {
      WEATHER.init(document.getElementById("weather"), store);
    }

    // A fresh quote on every open (never the same one twice in a row).
    if (typeof QUOTES !== "undefined") {
      QUOTES.init(document.getElementById("quote"), store);
    }

    // Countdown to Germany's next public holiday (computed offline).
    if (typeof HOLIDAYS !== "undefined") {
      HOLIDAYS.init(document.getElementById("countdown"));
    }

    // Notes scratchpad (autosaves). Restore collapsed state.
    if (typeof NOTES !== "undefined") {
      NOTES.init(document.getElementById("notes-text"), store);
    }
    initNotesUI(data.notesCollapsed);

    // Web search bar.
    initSearch();
  }

  /* ---------------------------------------------------------
     Search bar — submit runs a Google search in this tab.
     --------------------------------------------------------- */
  function initSearch() {
    const form = document.getElementById("search-form");
    const input = document.getElementById("search-input");
    if (!form || !input) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const q = input.value.trim();
      if (q) {
        window.location.href =
          "https://www.google.com/search?q=" + encodeURIComponent(q);
      }
    });
  }

  /* ---------------------------------------------------------
     Notes collapse toggle (the text itself is handled by notes.js).
     --------------------------------------------------------- */
  function initNotesUI(startCollapsed) {
    const notesCard = document.getElementById("notes");
    const notesToggle = document.getElementById("notes-toggle");
    if (!notesCard || !notesToggle) return;
    // HTML starts collapsed; expand if the user had it open last time.
    if (startCollapsed === false) {
      notesCard.classList.remove("is-collapsed");
      notesToggle.textContent = "–";
    }
    notesToggle.addEventListener("click", async () => {
      const collapsed = notesCard.classList.toggle("is-collapsed");
      notesToggle.textContent = collapsed ? "+" : "–";
      await store.set({ notesCollapsed: collapsed });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
