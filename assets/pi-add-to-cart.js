/*
 * PI Add to cart — AJAX submit for the PI product cards.
 *
 * The cards ship a real <form action="/cart/add">, which works without JS. This
 * intercepts the submit so the page does not reload, swaps the button to its
 * "Added" state, and repaints the header cart bubble.
 *
 * Exposes window.PICart.add(variantId, qty) so other PI scripts (the wishlist
 * panel) share one code path and one bubble refresh.
 */
(function () {
  var ADDED_LABEL = '✓ Added';
  /* How long the button stays in its Added state before offering again. 0 keeps
     it permanent for the life of the page. */
  var REVERT_MS = 0;

  /* Card submit buttons across the PI sections. */
  var BTN_SELECTOR = [
    '.pi-bs__card-atc-btn',
    '.pi-jg__card-atc-btn',
    '.pyml__card-atc-btn',
    '.pi-pdp__atc'
  ].join(',');

  function bubbleRefresh(count) {
    /* Horizon renders the bubble from Liquid; with no page load we update the
       same nodes it would have. `visually-hidden`/`hidden` are what the snippet
       uses to hide a zero count. */
    var bubbles = document.querySelectorAll('.cart-bubble');
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      if (count > 0) b.classList.remove('visually-hidden');
      var countEl = b.querySelector('.cart-bubble__text-count');
      if (!countEl) continue;
      countEl.textContent = count > 99 ? '' : String(count);
      if (count > 0) countEl.classList.remove('hidden');
    }
  }

  /* Horizon's own cart components — and cart-drawer apps that hook them —
     listen for `cart:update` (ThemeEvents.cartUpdate in events.js), never our
     pi:cart:added. Without this an add made here is invisible to them: the
     drawer never opens and the app never refreshes. Shape mirrors
     CartUpdateEvent, which sets `detail` on a plain bubbling Event. */
  function announceCartUpdate(cart) {
    var ev = new Event('cart:update', { bubbles: true });
    ev.detail = {
      resource: cart,
      sourceId: 'pi-add-to-cart',
      data: { source: 'pi-add-to-cart', itemCount: cart.item_count }
    };
    document.dispatchEvent(ev);
  }

  var api = {
    /* Resolves on a successful add, rejects otherwise, so callers can restore
       their own button state on failure. */
    add: function (variantId, qty) {
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: qty || 1 })
      }).then(function (r) {
        if (!r.ok) throw new Error('cart/add failed: ' + r.status);
        return r.json();
      }).then(function (line) {
        /* /cart/add.js returns the line item, not the cart, so the new total
           needs a second read. A failure here must not fail the add. */
        return fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (cart) {
            if (cart && typeof cart.item_count === 'number') {
              bubbleRefresh(cart.item_count);
              announceCartUpdate(cart);
            }
            document.dispatchEvent(new CustomEvent('pi:cart:added', {
              detail: { line: line, cart: cart }
            }));
            return line;
          })
          .catch(function () { return line; });
      });
    }
  };

  window.PICart = api;

  function markAdded(btn) {
    if (btn.dataset.piAdded === '1') return;
    btn.dataset.piAdded = '1';
    btn.dataset.piLabel = btn.textContent;
    btn.textContent = ADDED_LABEL;
    btn.classList.add('is-added');
    if (REVERT_MS > 0) {
      setTimeout(function () {
        btn.textContent = btn.dataset.piLabel || 'Add to Cart';
        btn.classList.remove('is-added');
        btn.disabled = false;
        delete btn.dataset.piAdded;
      }, REVERT_MS);
    }
  }

  /* Delegated, so cards injected or reordered later (the jewelry grid re-sorts
     its cards in place) are covered without re-binding. */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;

    var action = form.getAttribute('action') || '';
    if (action.indexOf('/cart/add') === -1) return;

    var btn = form.querySelector(BTN_SELECTOR);
    if (!btn) return;

    var idInput = form.querySelector('[name="id"]');
    if (!idInput || !idInput.value) return;

    e.preventDefault();

    var qtyInput = form.querySelector('[name="quantity"]');
    var qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

    btn.disabled = true;

    api.add(idInput.value, qty).then(function () {
      btn.disabled = false;
      markAdded(btn);
    }).catch(function () {
      /* Fall back to the native POST so a failed fetch still adds the item
         rather than silently doing nothing. */
      btn.disabled = false;
      form.submit();
    });
  });
})();
