/*
 * PI Wishlist — shared client-side store.
 *
 * Wishlist state lives in localStorage as a JSON array of product handles,
 * newest first. It is per-browser and per-device: it deliberately does NOT
 * sync to a customer account. The wishlist page (pi-wishlist.liquid) reads the
 * same key and hydrates each handle via /products/<handle>.js.
 *
 * Product cards call PIWishlist.set(handle, isActive) from their own click
 * handlers so each section keeps whatever visual toggle it already had.
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
      api.refresh();
      return list.length;
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

    /* Apply saved state to any button carrying data-pi-wish="<handle>".
       onActive(btn, handle) runs for buttons whose product is already saved,
       so each section can apply its own active class / fill. */
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

  /* Keep the badge honest when another tab changes the wishlist. */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) api.refresh();
  });
})();
