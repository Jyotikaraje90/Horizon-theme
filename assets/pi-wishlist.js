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

  /* Copy is overridable from Liquid via window.PIWishlistConfig so the strings
     stay editable without touching this file. */
  var cfg = window.PIWishlistConfig || {};
  var TEXT = {
    added: cfg.addedText || 'Item has been temporarily added to wishlist, please login to save it permanently',
    removed: cfg.removedText || 'Item has been removed from your wishlist',
    addLabel: cfg.addLabel || 'Add to wishlist',
    removeLabel: cfg.removeLabel || 'Remove from wishlist',
    panelTitle: cfg.panelTitle || 'My Wishlist',
    loginPrompt: cfg.loginPrompt || 'To save your wishlist please login or register.',
    empty: cfg.emptyText || 'Your wishlist is empty.',
    addedToCart: cfg.addedToCartText || 'Added to your cart'
  };

  var TOAST_MS = cfg.toastDuration || 5000;

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


  /* ── Presentation helpers ───────────────────────────────────────────────
     Everything below builds DOM at runtime; styling lives in pi-wishlist.css. */

  function svgClose() {
    return '<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
           '<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }

  /* Walk up from the heart until a card image turns up. Every section puts the
     button inside the image wrapper, so this stays section-agnostic. */
  function nearestThumb(btn) {
    var el = btn;
    for (var i = 0; i < 4 && el; i++) {
      var img = el.querySelector ? el.querySelector('img') : null;
      if (img) return img.currentSrc || img.src || '';
      el = el.parentElement;
    }
    return '';
  }

  var toastHost = null;

  function ensureToastHost() {
    if (toastHost && document.body.contains(toastHost)) return toastHost;
    toastHost = document.createElement('div');
    toastHost.className = 'pi-wl-toasts';
    document.body.appendChild(toastHost);
    return toastHost;
  }

  function toast(message, thumb, variant) {
    if (!document.body) return;
    var host = ensureToastHost();

    var el = document.createElement('div');
    el.className = 'pi-wl-toast' + (variant ? ' pi-wl-toast--' + variant : '');
    el.setAttribute('role', 'status');

    if (thumb) {
      var img = document.createElement('img');
      img.className = 'pi-wl-toast__thumb';
      img.src = thumb;
      img.alt = '';
      el.appendChild(img);
    }

    var text = document.createElement('span');
    text.className = 'pi-wl-toast__text';
    text.textContent = message;
    el.appendChild(text);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'pi-wl-toast__close';
    close.setAttribute('aria-label', 'Dismiss');
    close.innerHTML = svgClose();
    el.appendChild(close);

    host.appendChild(el);
    /* Next frame, so the transition has a start value to run from. */
    requestAnimationFrame(function () { el.classList.add('is-in'); });

    var timer = setTimeout(dismiss, TOAST_MS);

    function dismiss() {
      clearTimeout(timer);
      el.classList.remove('is-in');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    }

    close.addEventListener('click', dismiss);
  }

  function money(cents) {
    if (typeof cents !== 'number') return '';
    var code = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en', {
        style: 'currency', currency: code
      }).format(cents / 100);
    } catch (e) {
      return (cents / 100).toFixed(2) + ' ' + code;
    }
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

    /* Toast for a heart toggle. Called by bind()'s click handler only, so a
       repaint triggered by another tab does not spawn toasts. */
    notice: function (added, thumb) {
      toast(added ? TEXT.added : TEXT.removed, thumb, added ? '' : 'removed');
    },

    /* Open the header panel. Exposed so anything can trigger it. */
    openPanel: function () { openPanel(); },

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
          var on = !!h && saved.indexOf(h) !== -1;
          paint(btn, on);
          /* Hover/AT label has to track state, or a filled heart still reads
             "Add to wishlist". title= gives the tooltip for free. */
          var label = on ? TEXT.removeLabel : TEXT.addLabel;
          btn.setAttribute('title', label);
          btn.setAttribute('aria-label', label);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }

      list.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          /* Hearts usually sit inside the card's product link. */
          e.preventDefault();
          e.stopPropagation();
          var h = btn.getAttribute('data-pi-wish');
          if (!h) return;
          var adding = !api.has(h);
          api.set(h, adding);
          api.notice(adding, nearestThumb(btn));
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


  /* -- Header panel ------------------------------------------------------
     Clicking the header heart opens the saved items in place. The anchor still
     points at /pages/wishlist, so this degrades to that page without JS. */

  var panel = null;

  function buildPanel() {
    var el = document.createElement('div');
    el.className = 'pi-wl-panel';
    el.setAttribute('hidden', '');

    var card = document.createElement('div');
    card.className = 'pi-wl-panel__card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', TEXT.panelTitle);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'pi-wl-panel__close';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = svgClose();

    var title = document.createElement('p');
    title.className = 'pi-wl-panel__title';
    title.textContent = TEXT.panelTitle;

    var body = document.createElement('div');
    body.setAttribute('data-pi-wl-body', '');

    card.appendChild(close);
    card.appendChild(title);
    card.appendChild(body);
    el.appendChild(card);
    document.body.appendChild(el);

    close.addEventListener('click', closePanel);
    el.addEventListener('click', function (e) { if (e.target === el) closePanel(); });

    return el;
  }

  function shareRow() {
    var wrap = document.createElement('div');
    wrap.className = 'pi-wl-panel__share';

    var label = document.createElement('span');
    label.className = 'pi-wl-panel__share-label';
    label.textContent = 'Share on:';
    wrap.appendChild(label);

    var url = window.location.origin + '/pages/wishlist';
    var enc = encodeURIComponent(url);

    var links = [
      { t: 'Copy link', copy: true, d: 'M9 15L15 9M10.5 6.5L12 5a3.5 3.5 0 015 5l-1.5 1.5M8.5 12.5L7 14a3.5 3.5 0 105 5l1.5-1.5' },
      { t: 'Email', href: 'mailto:?subject=My%20wishlist&body=' + enc, d: 'M2 5h16v11H2zM2 5l8 6 8-6' },
      { t: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + enc, d: 'M12 6h2V3h-2a4 4 0 00-4 4v2H6v3h2v6h3v-6h2l1-3h-3V7a1 1 0 011-1z' },
      { t: 'X', href: 'https://twitter.com/intent/tweet?url=' + enc, d: 'M3 3l14 14M17 3L3 17' },
      { t: 'WhatsApp', href: 'https://wa.me/?text=' + enc, d: 'M4 16l1-3a7 7 0 1110 3 7 7 0 01-8-1z' }
    ];

    links.forEach(function (l) {
      var node = document.createElement(l.copy ? 'button' : 'a');
      node.className = 'pi-wl-panel__share-btn';
      node.setAttribute('aria-label', l.t);
      node.setAttribute('title', l.t);
      if (l.copy) {
        node.type = 'button';
      } else {
        node.href = l.href;
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
      }
      node.innerHTML = '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<path d="' + l.d + '" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      if (l.copy) {
        node.addEventListener('click', function () {
          var done = function () {
            var note = wrap.querySelector('.pi-wl-panel__copied');
            if (!note) {
              note = document.createElement('span');
              note.className = 'pi-wl-panel__copied';
              wrap.appendChild(note);
            }
            note.textContent = 'Link copied';
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done, done);
          } else {
            done();
          }
        });
      }
      wrap.appendChild(node);
    });

    return wrap;
  }

  function panelRow(product) {
    var row = document.createElement('div');
    row.className = 'pi-wl-panel__row';
    row.setAttribute('data-handle', product.handle);

    var url = '/products/' + product.handle;
    var img = product.featured_image || (product.images && product.images[0]) || '';

    var prod = document.createElement('div');
    prod.className = 'pi-wl-panel__product';
    if (img) {
      var thumb = document.createElement('img');
      thumb.className = 'pi-wl-panel__thumb';
      thumb.src = img;
      thumb.alt = '';
      thumb.loading = 'lazy';
      prod.appendChild(thumb);
    }
    var name = document.createElement('a');
    name.className = 'pi-wl-panel__name';
    name.href = url;
    /* textContent, so an & or a quote in a product name cannot break markup. */
    name.textContent = product.title || product.handle;
    prod.appendChild(name);

    var price = document.createElement('div');
    price.className = 'pi-wl-panel__price';
    price.textContent = money(product.price);

    var stock = document.createElement('div');
    stock.className = 'pi-wl-panel__stock' + (product.available ? '' : ' pi-wl-panel__stock--out');
    stock.innerHTML = '<span class="pi-wl-panel__dot"></span>';
    stock.appendChild(document.createTextNode(product.available ? 'In stock' : 'Out of stock'));

    var actions = document.createElement('div');
    actions.className = 'pi-wl-panel__actions';

    var variant = null;
    if (product.variants && product.variants.length) {
      for (var i = 0; i < product.variants.length; i++) {
        if (product.variants[i].available) { variant = product.variants[i]; break; }
      }
    }

    var atc = document.createElement('button');
    atc.type = 'button';
    atc.className = 'pi-wl-panel__atc';
    atc.textContent = 'Add to cart';
    if (!product.available || !variant) {
      atc.textContent = 'Out of stock';
      atc.disabled = true;
    } else {
      atc.addEventListener('click', function () {
        atc.disabled = true;
        window.PICart.add(variant.id, 1).then(function () {
          atc.textContent = '✓ Added';
          toast(TEXT.addedToCart, img, '');
        }).catch(function () {
          atc.disabled = false;
          atc.textContent = 'Add to cart';
        });
      });
    }

    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'pi-wl-panel__remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', function () {
      api.set(product.handle, false);
      renderPanel();
    });

    actions.appendChild(atc);
    actions.appendChild(remove);

    row.appendChild(prod);
    row.appendChild(price);
    row.appendChild(stock);
    row.appendChild(actions);
    return row;
  }

  function renderPanel() {
    if (!panel) return;
    var body = panel.querySelector('[data-pi-wl-body]');
    body.innerHTML = '';

    var login = document.createElement('p');
    login.className = 'pi-wl-panel__login';
    login.innerHTML = TEXT.loginPrompt
      .replace('login', '<a href="/account/login">login</a>')
      .replace('register', '<a href="/account/register">register</a>');
    body.appendChild(login);
    body.appendChild(shareRow());

    var handles = read();
    if (!handles.length) {
      var empty = document.createElement('p');
      empty.className = 'pi-wl-panel__empty';
      empty.textContent = TEXT.empty;
      body.appendChild(empty);
      return;
    }

    var head = document.createElement('div');
    head.className = 'pi-wl-panel__head';
    ['Product name', 'Unit price', 'Stock status', ''].forEach(function (h) {
      var c = document.createElement('span');
      c.textContent = h;
      head.appendChild(c);
    });
    body.appendChild(head);

    var loading = document.createElement('p');
    loading.className = 'pi-wl-panel__loading';
    loading.textContent = 'Loading your wishlist…';
    body.appendChild(loading);

    Promise.all(handles.map(function (h) {
      return fetch('/products/' + encodeURIComponent(h) + '.js', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    })).then(function (results) {
      if (loading.parentNode) loading.parentNode.removeChild(loading);

      /* Handles that 404 (deleted or unpublished) are dropped so the list
         self-heals rather than showing gaps. */
      var alive = [];
      results.forEach(function (prod, i) {
        if (!prod || !prod.handle) return;
        alive.push(handles[i]);
        body.appendChild(panelRow(prod));
      });
      if (alive.length !== handles.length) { write(alive); api.refresh(); }

      if (!alive.length) {
        var e2 = document.createElement('p');
        e2.className = 'pi-wl-panel__empty';
        e2.textContent = TEXT.empty;
        body.appendChild(e2);
        return;
      }

      var footer = document.createElement('div');
      footer.className = 'pi-wl-panel__footer';
      footer.innerHTML = '<a href="/pages/wishlist">View full wishlist page</a>';
      body.appendChild(footer);
    });
  }

  var panelLastFocus = null;
  var panelScrollLock = '';

  function openPanel() {
    if (!panel) panel = buildPanel();
    panelLastFocus = document.activeElement;
    panelScrollLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.removeAttribute('hidden');
    renderPanel();
    var c = panel.querySelector('.pi-wl-panel__close');
    if (c) c.focus();
    document.addEventListener('keydown', onPanelKey);
  }

  function closePanel() {
    if (!panel) return;
    panel.setAttribute('hidden', '');
    document.body.style.overflow = panelScrollLock;
    document.removeEventListener('keydown', onPanelKey);
    if (panelLastFocus && panelLastFocus.focus) panelLastFocus.focus();
  }

  function onPanelKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') closePanel();
  }

  /* Delegated so it survives header re-renders, and so cmd/ctrl/middle-click
     still open the wishlist page in a new tab. */
  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var trigger = e.target.closest && e.target.closest('.pi-wishlist-action, [data-pi-wish-open]');
    if (!trigger) return;
    e.preventDefault();
    openPanel();
  });

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
