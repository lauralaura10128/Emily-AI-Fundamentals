/**
 * Countdown to Germany's next nationwide public holiday.
 * Computed locally (no network), so it's always correct — including the
 * movable, Easter-based holidays. Covers the nine Germany-wide holidays
 * (bundeseinheitliche Feiertage).
 */

const HOLIDAYS = (function () {
  "use strict";

  // Easter Sunday for a given year — Anonymous Gregorian algorithm.
  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function addDays(date, n) {
    const x = new Date(date);
    x.setDate(x.getDate() + n);
    return x;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function holidaysFor(year) {
    const easter = easterSunday(year);
    return [
      { name: "New Year's Day", de: "Neujahr", date: new Date(year, 0, 1) },
      { name: "Good Friday", de: "Karfreitag", date: addDays(easter, -2) },
      { name: "Easter Monday", de: "Ostermontag", date: addDays(easter, 1) },
      { name: "Labour Day", de: "Tag der Arbeit", date: new Date(year, 4, 1) },
      { name: "Ascension Day", de: "Christi Himmelfahrt", date: addDays(easter, 39) },
      { name: "Whit Monday", de: "Pfingstmontag", date: addDays(easter, 50) },
      { name: "German Unity Day", de: "Tag der Deutschen Einheit", date: new Date(year, 9, 3) },
      { name: "Christmas Day", de: "1. Weihnachtstag", date: new Date(year, 11, 25) },
      { name: "Boxing Day", de: "2. Weihnachtstag", date: new Date(year, 11, 26) }
    ];
  }

  function nextHoliday() {
    const today = startOfDay(new Date());
    const year = today.getFullYear();
    // This year's remaining holidays, then next year's, sorted by date.
    const all = holidaysFor(year)
      .concat(holidaysFor(year + 1))
      .sort((a, b) => a.date - b.date);
    for (let j = 0; j < all.length; j++) {
      if (startOfDay(all[j].date) >= today) return all[j];
    }
    return all[0];
  }

  function init(el) {
    if (!el) return;

    function render() {
      const h = nextHoliday();
      const today = startOfDay(new Date());
      const days = Math.round((startOfDay(h.date) - today) / 86400000);
      const when =
        days === 0 ? "Today" : days === 1 ? "Tomorrow" : days + " days";

      el.innerHTML =
        '<span class="countdown__emoji">🎉</span>' +
        '<span class="countdown__days">' + when + "</span>" +
        '<span class="countdown__name">' + h.name + "</span>";

      el.title =
        "Next German public holiday: " +
        h.name + " (" + h.de + ") — " +
        h.date.toLocaleDateString("en-GB", {
          weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
      el.classList.add("is-visible");
    }

    render();
    // Re-check periodically so the countdown rolls over at midnight.
    setInterval(render, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) render();
    });
  }

  return { init: init };
})();
