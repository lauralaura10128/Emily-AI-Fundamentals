/**
 * Live weather for Lisbon via Open-Meteo (https://open-meteo.com).
 * Free, no API key, CORS-enabled — fetched fresh from the browser so the
 * reading is always current. Results are cached briefly so the widget paints
 * instantly and still shows the last reading if you're offline.
 */

const WEATHER = (function () {
  "use strict";

  // Lisbon, Portugal
  const LAT = 38.7223;
  const LON = -9.1393;
  const CITY = "Lisbon";

  const API =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" + LAT +
    "&longitude=" + LON +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m" +
    "&timezone=Europe%2FLisbon";

  // WMO weather interpretation codes -> label + emoji (day/night aware for clear/partly).
  // https://open-meteo.com/en/docs (WMO Weather interpretation codes)
  function describe(code, isDay) {
    const day = isDay !== 0;
    const map = {
      0: [day ? "☀️" : "🌙", "Clear sky"],
      1: [day ? "🌤️" : "🌙", "Mainly clear"],
      2: [day ? "⛅" : "☁️", "Partly cloudy"],
      3: ["☁️", "Overcast"],
      45: ["🌫️", "Fog"],
      48: ["🌫️", "Rime fog"],
      51: ["🌦️", "Light drizzle"],
      53: ["🌦️", "Drizzle"],
      55: ["🌦️", "Heavy drizzle"],
      56: ["🌧️", "Freezing drizzle"],
      57: ["🌧️", "Freezing drizzle"],
      61: ["🌧️", "Light rain"],
      63: ["🌧️", "Rain"],
      65: ["🌧️", "Heavy rain"],
      66: ["🌧️", "Freezing rain"],
      67: ["🌧️", "Freezing rain"],
      71: ["🌨️", "Light snow"],
      73: ["🌨️", "Snow"],
      75: ["❄️", "Heavy snow"],
      77: ["❄️", "Snow grains"],
      80: ["🌦️", "Light showers"],
      81: ["🌧️", "Showers"],
      82: ["⛈️", "Violent showers"],
      85: ["🌨️", "Snow showers"],
      86: ["🌨️", "Snow showers"],
      95: ["⛈️", "Thunderstorm"],
      96: ["⛈️", "Thunderstorm, hail"],
      99: ["⛈️", "Thunderstorm, hail"]
    };
    return map[code] || [day ? "🌡️" : "🌡️", "—"];
  }

  function render(el, data) {
    const c = data && data.current;
    if (!c || typeof c.temperature_2m !== "number") {
      el.classList.remove("is-visible");
      return;
    }
    const [emoji, label] = describe(c.weather_code, c.is_day);
    const temp = Math.round(c.temperature_2m);
    const feels =
      typeof c.apparent_temperature === "number"
        ? Math.round(c.apparent_temperature)
        : null;

    el.innerHTML =
      '<span class="weather__icon">' + emoji + "</span>" +
      '<span class="weather__temp">' + temp + "°</span>" +
      '<span class="weather__meta">' +
        '<span class="weather__city">' + CITY + "</span>" +
        '<span class="weather__desc">' + label + "</span>" +
      "</span>";

    let title = label + " in " + CITY + " — " + temp + "°C";
    if (feels !== null) title += " (feels " + feels + "°)";
    if (typeof c.relative_humidity_2m === "number")
      title += ", humidity " + c.relative_humidity_2m + "%";
    if (typeof c.wind_speed_10m === "number")
      title += ", wind " + Math.round(c.wind_speed_10m) + " km/h";
    el.title = title;

    el.classList.add("is-visible");
  }

  async function refresh(el, store) {
    try {
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      render(el, data);
      if (store) store.set({ weatherCache: { at: Date.now(), data: data } });
    } catch (e) {
      // Keep whatever is already shown (from cache). Nothing else to do.
    }
  }

  /**
   * @param {HTMLElement} el     container element
   * @param {object}      store  storage helper with get()/set() (optional)
   */
  async function init(el, store) {
    if (!el) return;

    // Paint instantly from cache, then refresh live.
    if (store) {
      try {
        const cache = (await store.get(["weatherCache"])).weatherCache;
        if (cache && cache.data) render(el, cache.data);
      } catch (e) {
        /* ignore */
      }
    }

    refresh(el, store);
    // Keep it current while the tab stays open.
    setInterval(function () {
      refresh(el, store);
    }, 15 * 60 * 1000);
    // And refresh when the tab is refocused after being hidden a while.
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refresh(el, store);
    });
  }

  return { init: init };
})();
