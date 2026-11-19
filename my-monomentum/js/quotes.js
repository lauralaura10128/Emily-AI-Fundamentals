/**
 * A fresh quote on every new tab.
 * The quotes are bundled right here, so they load instantly and work offline.
 * A different one is shown each time you open a tab (never the same twice in a
 * row), picked at random from the list below.
 */

const QUOTES = (function () {
  "use strict";

  const LIST = [
    { t: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
    { t: "What you do today can improve all your tomorrows.", a: "Ralph Marston" },
    { t: "It always seems impossible until it's done.", a: "Nelson Mandela" },
    { t: "The secret of getting ahead is getting started.", a: "Mark Twain" },
    { t: "Well begun is half done.", a: "Aristotle" },
    { t: "Do what you can, with what you have, where you are.", a: "Theodore Roosevelt" },
    { t: "Quality is not an act, it is a habit.", a: "Aristotle" },
    { t: "The future depends on what you do today.", a: "Mahatma Gandhi" },
    { t: "Little by little, one travels far.", a: "J.R.R. Tolkien" },
    { t: "Simplicity is the ultimate sophistication.", a: "Leonardo da Vinci" },
    { t: "Act as if what you do makes a difference. It does.", a: "William James" },
    { t: "Energy and persistence conquer all things.", a: "Benjamin Franklin" },
    { t: "Start where you are. Use what you have. Do what you can.", a: "Arthur Ashe" },
    { t: "A year from now you may wish you had started today.", a: "Karen Lamb" },
    { t: "The journey of a thousand miles begins with a single step.", a: "Lao Tzu" },
    { t: "Make each day your masterpiece.", a: "John Wooden" },
    { t: "Doubt kills more dreams than failure ever will.", a: "Suzy Kassem" },
    { t: "Dream big and dare to fail.", a: "Norman Vaughan" },
    { t: "Everything you can imagine is real.", a: "Pablo Picasso" },
    { t: "Whether you think you can or you can't, you're right.", a: "Henry Ford" },
    { t: "Strive not to be a success, but rather to be of value.", a: "Albert Einstein" },
    { t: "The best way to predict the future is to create it.", a: "Peter Drucker" },
    { t: "You miss 100% of the shots you don't take.", a: "Wayne Gretzky" },
    { t: "Opportunities don't happen. You create them.", a: "Chris Grosser" },
    { t: "Great things are done by a series of small things brought together.", a: "Vincent van Gogh" },
    { t: "Focus on being productive instead of busy.", a: "Tim Ferriss" },
    { t: "Either you run the day or the day runs you.", a: "Jim Rohn" },
    { t: "Success is the sum of small efforts repeated day in and day out.", a: "Robert Collier" },
    { t: "Done is better than perfect.", a: "Sheryl Sandberg" },
    { t: "If you want to lift yourself up, lift up someone else.", a: "Booker T. Washington" },
    { t: "Patience, persistence and perspiration make an unbeatable combination for success.", a: "Napoleon Hill" },
    { t: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
    { t: "The way to get started is to quit talking and begin doing.", a: "Walt Disney" },
    { t: "Courage is not the absence of fear, but the triumph over it.", a: "Nelson Mandela" },
    { t: "Happiness is not something ready made. It comes from your own actions.", a: "Dalai Lama" },
    { t: "What we think, we become.", a: "Buddha" },
    { t: "In the middle of difficulty lies opportunity.", a: "Albert Einstein" },
    { t: "The harder I work, the luckier I get.", a: "Samuel Goldwyn" },
    { t: "Keep your face always toward the sunshine.", a: "Walt Whitman" },
    { t: "Nothing will work unless you do.", a: "Maya Angelou" },
    { t: "Fall seven times, stand up eight.", a: "Japanese Proverb" },
    { t: "A goal without a plan is just a wish.", a: "Antoine de Saint-Exupery" },
    { t: "You are never too old to set another goal or to dream a new dream.", a: "C.S. Lewis" },
    { t: "The mind is everything. What you think you become.", a: "Buddha" },
    { t: "Today is your opportunity to build the tomorrow you want.", a: "Ken Poirot" }
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Pick a random index, avoiding the one shown last time.
  function pick(prevIndex) {
    if (LIST.length <= 1) return 0;
    let i = prevIndex;
    while (i === prevIndex) {
      i = Math.floor(Math.random() * LIST.length);
    }
    return i;
  }

  /**
   * @param {HTMLElement} el     container element
   * @param {object}      store  storage helper with get()/set() (optional)
   */
  async function init(el, store) {
    if (!el) return;

    let prev = -1;
    if (store) {
      try {
        const d = await store.get(["lastQuote"]);
        if (typeof d.lastQuote === "number") prev = d.lastQuote;
      } catch (e) {
        /* ignore */
      }
    }

    const i = pick(prev);
    const q = LIST[i];
    el.innerHTML =
      '<span class="quote__text">' + escapeHtml(q.t) + "</span>" +
      '<span class="quote__author">' + escapeHtml(q.a) + "</span>";
    el.classList.add("is-visible");

    if (store) {
      try {
        store.set({ lastQuote: i });
      } catch (e) {
        /* ignore */
      }
    }
  }

  return { init: init };
})();
