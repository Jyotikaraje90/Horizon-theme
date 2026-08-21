/*
 * PI Wishlist — shared client-side store.
 *
 * Wishlist state lives in localStorage as a JSON array of product handles,
 * newest first. It is per-browser and per-device: it deliberately does NOT
 * sync to a customer account. The wishlist page (pi-wishlist.liquid) reads the
 * same key and hydrates each handle via /products/<handle>.js.
 *
 * localStorage is the single source of truth. Sections never track their own
 * on/off state: they hand their heart buttons to PIWishlist.bind() with a
 * painter, and every change — this page, another section on this page, the
 * wishlist page, another tab — repaints all of them. That is what makes a
 * saved product read as saved everywhere it appears.
 */
(function () {
  var KEY = 'puertoink:wishlist';

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (h) { return typeof h === 'string' && h; });
    } catch (e) {
      /* Private mode / storage disabled — degrade to "empty" rather than throw. */
      return [];
    }
  }

  function write(list) {
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  var subscribers = [];

  var api = {
    key: KEY,

    get: read,

    has: function (handle) {
      return !!handle && read().indexOf(handle) !== -1;
    },

    count: function () { return read().length; },

    /* on === true adds, false removes. Returns the new count. */
    set: function (handle, on) {
      if (!handle) return api.count();
      var list = read();
      var i = list.indexOf(handle);
      if (on && i === -1) list.unshift(handle);
      if (!on && i !== -1) list.splice(i, 1);
      write(list);
      api.changed();
      return list.length;
    },

    /* Register a listener that runs whenever the wishlist changes. Returns an
       unsubscribe function. Listeners also run on the storage event, so a
       change made in another tab repaints this one. */
    subscribe: function (fn) {
      if (typeof fn !== 'function') return function () {};
      subscribers.push(fn);
      return function () {
        var i = subscribers.indexOf(fn);
        if (i !== -1) subscribers.splice(i, 1);
      };
    },

    /* Announce a change: repaint badges, then run every subscriber. Call this
       after writing the key by any route other than api.set(). */
    changed: function () {
      api.refresh();
      var list = read();
      for (var i = 0; i < subscribers.length; i++) {
        try { subscribers[i](list); } catch (e) {}
      }
    },

    /* Paint every count badge on the page. Badges hide themselves at zero. */
    refresh: function () {
      var n = read().length;
      var badges = document.querySelectorAll('[data-pi-wish-count]');
      for (var i = 0; i < badges.length; i++) {
        badges[i].textContent = n > 99 ? '99+' : String(n);
        if (n === 0) {
          badges[i].setAttribute('hidden', '');
        } else {
          badges[i].removeAttribute('hidden');
        }
      }
    },

    /* Wire a set of heart buttons carrying data-pi-wish="<handle>".
       paint(btn, isSaved) applies whatever active look that section already
       had; it is called once now and again on every later change, so hearts
       for the same product stay in step across sections, pages and tabs.
       Returns the repaint function for sections that inject cards later. */
    bind: function (buttons, paint) {
      if (!buttons || typeof paint !== 'function') return function () {};
      var list = Array.prototype.slice.call(buttons);

      function repaint() {
        var saved = read();
        list.forEach(function (btn) {
          var h = btn.getAttribute('data-pi-wish');
          paint(btn, !!h && saved.indexOf(h) !== -1);
        });
      }

      list.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          /* Hearts usually sit inside the card's product link. */
          e.preventDefault();
          e.stopPropagation();
          var h = btn.getAttribute('data-pi-wish');
          if (!h) return;
          api.set(h, !api.has(h));
        });
      });

      api.subscribe(repaint);
      repaint();
      return repaint;
    },

    /* Apply saved state to any button carrying data-pi-wish="<handle>".
       Kept for callers that only want a one-shot paint; bind() is preferred
       because it also keeps the buttons in sync afterwards. */
    hydrate: function (buttons, onActive) {
      if (!buttons || !onActive) return;
      for (var i = 0; i < buttons.length; i++) {
        var h = buttons[i].getAttribute('data-pi-wish');
        if (h && api.has(h)) onActive(buttons[i], h);
      }
    }
  };

  window.PIWishlist = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', api.refresh);
  } else {
    api.refresh();
  }

  /* Keep this tab honest when another tab changes the wishlist. */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) api.changed();
  });
})();
