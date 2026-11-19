/**
 * Notes / scratchpad. A free-text box that saves as you type (debounced),
 * stored locally so it's there next time you open a tab.
 */

const NOTES = (function () {
  "use strict";

  let saveTimer = null;

  async function init(textEl, store) {
    if (!textEl) return;

    if (store) {
      try {
        const d = await store.get(["notes"]);
        if (typeof d.notes === "string") textEl.value = d.notes;
      } catch (e) {
        /* ignore */
      }
    }

    textEl.addEventListener("input", function () {
      if (!store) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        try {
          store.set({ notes: textEl.value });
        } catch (e) {
          /* ignore */
        }
      }, 400);
    });
  }

  return { init: init };
})();
