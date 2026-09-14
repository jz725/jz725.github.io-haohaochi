/* ==========================================================================
   Hao Hao Chi — site scripts (DEMO BUILD)
   Shared across home / menu / about / contact.

   This is the standalone demo: the menu comes from menu-data.js, which is
   generated from data/menu.json by build-menu.js. Nothing here talks to a
   server, so the pages open straight from disk.

   Each module bails out if its markup isn't on the page.
   ========================================================================== */
(function () {
    'use strict';

    /* --- small helpers ---------------------------------------------------- */
    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    };
    var money = function (n) { return '$' + n.toFixed(2); };

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) { node.className = className; }
        if (text !== undefined) { node.textContent = text; }
        return node;
    }

    /* --- opening hours ---------------------------------------------------- */
    /* index matches Date.getDay(): 0 = Sunday. null = closed. */
    var HOURS = [
        { label: 'Sunday', open: null, close: null },
        { label: 'Monday', open: 9, close: 20 },
        { label: 'Tuesday', open: 9, close: 20 },
        { label: 'Wednesday', open: 9, close: 20 },
        { label: 'Thursday', open: 9, close: 20 },
        { label: 'Friday', open: 9, close: 20 },
        { label: 'Saturday', open: null, close: null }
    ];

    function formatHour(h) {
        var suffix = h >= 12 ? 'PM' : 'AM';
        var hour = h % 12 === 0 ? 12 : h % 12;
        return hour + ':00' + suffix;
    }

    function hoursText(day) {
        return day.open === null ? 'Closed' : formatHour(day.open) + ' – ' + formatHour(day.close);
    }

    function isOpenNow(now) {
        var day = HOURS[now.getDay()];
        if (day.open === null) { return false; }
        var minutes = now.getHours() * 60 + now.getMinutes();
        return minutes >= day.open * 60 && minutes < day.close * 60;
    }

    function nextOpenDay(now) {
        for (var i = 1; i <= 7; i++) {
            var day = HOURS[(now.getDay() + i) % 7];
            if (day.open !== null) { return day; }
        }
        return null;
    }

    /* ---------------------------------------------------------------------- */
    /* 1. Header: shadow on scroll                                            */
    /* ---------------------------------------------------------------------- */
    function initHeader() {
        var header = $('.site-header');
        if (!header) { return; }
        var onScroll = function () {
            header.classList.toggle('is-scrolled', window.scrollY > 8);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ---------------------------------------------------------------------- */
    /* 2. Panels (mobile nav + cart drawer) share one scrim and one lock       */
    /* ---------------------------------------------------------------------- */
    var scrim = null;
    var openPanels = [];

    function ensureScrim() {
        if (scrim) { return scrim; }
        scrim = $('.scrim');
        if (!scrim) {
            scrim = document.createElement('div');
            scrim.className = 'scrim';
            document.body.appendChild(scrim);
        }
        scrim.addEventListener('click', function () { closeAllPanels(); });
        return scrim;
    }

    function syncScrim() {
        ensureScrim().classList.toggle('is-open', openPanels.length > 0);
        document.body.classList.toggle('is-locked', openPanels.length > 0);
    }

    function openPanel(panel) {
        if (openPanels.indexOf(panel) === -1) { openPanels.push(panel); }
        panel.el.classList.add('is-open');
        if (panel.trigger) { panel.trigger.setAttribute('aria-expanded', 'true'); }
        panel.el.setAttribute('aria-hidden', 'false');
        panel.lastFocused = document.activeElement;
        syncScrim();
        var focusable = $('button, [href], input, select, textarea', panel.el);
        if (focusable) { focusable.focus(); }
    }

    function closePanel(panel) {
        var i = openPanels.indexOf(panel);
        if (i > -1) { openPanels.splice(i, 1); }
        panel.el.classList.remove('is-open');
        if (panel.trigger) { panel.trigger.setAttribute('aria-expanded', 'false'); }
        panel.el.setAttribute('aria-hidden', 'true');
        syncScrim();
        if (panel.lastFocused && typeof panel.lastFocused.focus === 'function') {
            panel.lastFocused.focus();
        }
    }

    function closeAllPanels() {
        openPanels.slice().forEach(closePanel);
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && openPanels.length) {
            closePanel(openPanels[openPanels.length - 1]);
        }
    });

    /* ---------------------------------------------------------------------- */
    /* 3. Mobile navigation                                                    */
    /* ---------------------------------------------------------------------- */
    function initNav() {
        var nav = $('.site-nav');
        var toggle = $('.nav-toggle');
        if (!nav || !toggle) { return; }

        var panel = { el: nav, trigger: toggle };

        toggle.addEventListener('click', function () {
            if (nav.classList.contains('is-open')) { closePanel(panel); }
            else { openPanel(panel); }
        });

        $$('a', nav).forEach(function (link) {
            link.addEventListener('click', function () {
                if (nav.classList.contains('is-open')) { closePanel(panel); }
            });
        });

        var mq = window.matchMedia('(min-width: 821px)');
        var reset = function (e) {
            if (e.matches && nav.classList.contains('is-open')) { closePanel(panel); }
        };
        if (mq.addEventListener) { mq.addEventListener('change', reset); }
        else if (mq.addListener) { mq.addListener(reset); }
    }

    /* ---------------------------------------------------------------------- */
    /* 4. Toast                                                                */
    /* ---------------------------------------------------------------------- */
    var toastEl = null;
    var toastTimer = null;

    function toast(message) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'toast';
            toastEl.setAttribute('role', 'status');
            toastEl.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = '';
        toastEl.appendChild(el('span', 'dot'));
        toastEl.appendChild(el('span', 'toast-text', message));
        void toastEl.offsetWidth;
        toastEl.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.classList.remove('is-visible');
        }, 2600);
    }

    /* ---------------------------------------------------------------------- */
    /* 5. Reveal on scroll (shared observer — new nodes can join later)        */
    /* ---------------------------------------------------------------------- */
    var revealObserver = null;
    var revealDisabled = false;

    function initReveal() {
        revealDisabled = !('IntersectionObserver' in window) ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!revealDisabled) {
            revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-revealed');
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
        }
        observeReveals(document);
    }

    function observeReveals(root) {
        $$('[data-reveal]', root).forEach(function (node) {
            if (revealDisabled) { node.classList.add('is-revealed'); }
            else { revealObserver.observe(node); }
        });
    }

    /* ---------------------------------------------------------------------- */
    /* 6. Cart                                                                 */
    /* ---------------------------------------------------------------------- */
    var STORAGE_KEY = 'hhc-cart-v1';
    var TAX_RATE = 0.07;
    var refreshCart = function () {};

    var Cart = {
        items: [],

        load: function () {
            try {
                var raw = window.localStorage.getItem(STORAGE_KEY);
                var parsed = raw ? JSON.parse(raw) : [];
                this.items = Array.isArray(parsed) ? parsed.filter(function (it) {
                    return it && typeof it.name === 'string' && isFinite(it.price) && it.qty > 0;
                }) : [];
            } catch (err) {
                this.items = [];
            }
        },

        save: function () {
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
            } catch (err) { /* private mode / storage full — cart just won't persist */ }
        },

        find: function (id) {
            for (var i = 0; i < this.items.length; i++) {
                if (this.items[i].id === id) { return this.items[i]; }
            }
            return null;
        },

        add: function (item) {
            var existing = this.find(item.id);
            if (existing) {
                existing.qty += 1;
                /* Keep the snapshot fresh in case the admin changed the price. */
                existing.price = item.price;
                existing.name = item.name;
                existing.image = item.image;
            } else {
                this.items.push({
                    id: item.id, name: item.name, price: item.price,
                    image: item.image, qty: 1
                });
            }
            this.save();
        },

        setQty: function (id, qty) {
            var item = this.find(id);
            if (!item) { return; }
            if (qty <= 0) { this.remove(id); return; }
            item.qty = qty;
            this.save();
        },

        remove: function (id) {
            this.items = this.items.filter(function (it) { return it.id !== id; });
            this.save();
        },

        clear: function () {
            this.items = [];
            this.save();
        },

        count: function () {
            return this.items.reduce(function (sum, it) { return sum + it.qty; }, 0);
        },

        subtotal: function () {
            return this.items.reduce(function (sum, it) { return sum + it.price * it.qty; }, 0);
        }
    };

    function initCart() {
        var btn = $('.cart-btn');
        var drawer = $('.cart-drawer');
        if (!btn || !drawer) { return; }

        var countEl = $('.cart-count', btn);
        var body = $('.cart-body', drawer);
        var foot = $('.cart-foot', drawer);
        var list = $('.cart-items', drawer);
        var emptyState = $('.cart-empty', drawer);
        var closeBtn = $('.cart-close-btn', drawer);
        var checkoutBtn = $('.checkout-btn', drawer);
        var clearBtn = $('.cart-clear', drawer);
        var subtotalEl = $('[data-cart-subtotal]', drawer);
        var taxEl = $('[data-cart-tax]', drawer);
        var totalEl = $('[data-cart-total]', drawer);

        var panel = { el: drawer, trigger: btn };

        Cart.load();

        function bounce() {
            btn.classList.remove('cart-bounce-animation');
            void btn.offsetWidth;
            btn.classList.add('cart-bounce-animation');
        }

        function renderBadge() {
            var count = Cart.count();
            countEl.textContent = count;
            countEl.classList.toggle('is-visible', count > 0);
            btn.setAttribute('aria-label', count > 0
                ? 'Open cart, ' + count + (count === 1 ? ' item' : ' items')
                : 'Open cart, empty');
        }

        function renderMenuBadges() {
            $$('[data-item-id]').forEach(function (card) {
                var badge = $('.in-cart-badge', card);
                if (!badge) { return; }
                var item = Cart.find(card.getAttribute('data-item-id'));
                if (item) {
                    badge.textContent = item.qty + ' in cart';
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            });
        }

        function render() {
            renderBadge();
            renderMenuBadges();

            var success = $('.cart-success', body);
            if (success) { success.remove(); }

            list.textContent = '';
            var isEmpty = Cart.items.length === 0;
            emptyState.classList.toggle('hidden', !isEmpty);
            list.classList.toggle('hidden', isEmpty);
            foot.classList.toggle('hidden', isEmpty);

            Cart.items.forEach(function (item) {
                var li = document.createElement('li');

                var thumb = el('img', 'cart-item-thumb');
                thumb.src = item.image || './images/HHC5.jpg';
                thumb.alt = '';
                thumb.loading = 'lazy';

                var info = document.createElement('div');
                info.appendChild(el('p', 'cart-item-name', item.name));
                info.appendChild(el('span', 'cart-item-unit', money(item.price) + ' each'));

                var side = el('div', 'cart-item-side');
                side.appendChild(el('span', 'cart-item-line-total', money(item.price * item.qty)));

                var qty = el('div', 'qty');

                var minus = el('button', null, '−');
                minus.type = 'button';
                minus.setAttribute('aria-label',
                    item.qty === 1 ? 'Remove ' + item.name + ' from cart' : 'Decrease quantity of ' + item.name);
                minus.addEventListener('click', function () {
                    Cart.setQty(item.id, item.qty - 1);
                    render();
                });

                var out = el('output', null, String(item.qty));
                out.setAttribute('aria-label', 'Quantity of ' + item.name);

                var plus = el('button', null, '+');
                plus.type = 'button';
                plus.setAttribute('aria-label', 'Increase quantity of ' + item.name);
                plus.addEventListener('click', function () {
                    Cart.setQty(item.id, item.qty + 1);
                    render();
                });

                qty.appendChild(minus);
                qty.appendChild(out);
                qty.appendChild(plus);
                side.appendChild(qty);

                li.appendChild(thumb);
                li.appendChild(info);
                li.appendChild(side);
                list.appendChild(li);
            });

            var subtotal = Cart.subtotal();
            var tax = subtotal * TAX_RATE;
            if (subtotalEl) { subtotalEl.textContent = money(subtotal); }
            if (taxEl) { taxEl.textContent = money(tax); }
            if (totalEl) { totalEl.textContent = money(subtotal + tax); }
        }

        refreshCart = render;

        /* Delegated, so dishes rendered later from the API work too. */
        document.addEventListener('click', function (e) {
            var button = e.target.closest ? e.target.closest('.add-to-cart-btn') : null;
            if (!button || button.disabled) { return; }

            var card = button.closest('[data-item-id]');
            if (!card) { return; }
            var name = card.getAttribute('data-item-name');
            var price = parseFloat(card.getAttribute('data-item-price'));
            if (!name || !isFinite(price)) { return; }

            Cart.add({
                id: card.getAttribute('data-item-id'),
                name: name,
                price: price,
                image: card.getAttribute('data-item-image') || ''
            });

            render();
            bounce();
            toast(name + ' added to your cart');

            button.classList.add('is-added');
            setTimeout(function () { button.classList.remove('is-added'); }, 700);
        });

        btn.addEventListener('click', function () {
            if (drawer.classList.contains('is-open')) { closePanel(panel); }
            else { render(); openPanel(panel); }
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', function () { closePanel(panel); });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                Cart.clear();
                render();
                toast('Cart emptied');
            });
        }

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function () {
                if (!Cart.items.length) { return; }
                var count = Cart.count();
                var total = Cart.subtotal() * (1 + TAX_RATE);

                Cart.clear();
                render();

                emptyState.classList.add('hidden');
                var success = el('div', 'cart-success');
                success.setAttribute('role', 'status');
                success.appendChild(el('div', 'check', '✓'));
                success.appendChild(el('h3', null, 'Order sent to the kitchen'));
                success.appendChild(el('p', null,
                    count + (count === 1 ? ' item' : ' items') + ' · ' + money(total)));

                var note = el('p', 'cart-note', 'This is a demo checkout — nothing was charged. To place a real order, call ');
                var tel = el('a', null, '(555) 555-0100');
                tel.href = 'tel:+15555550100';
                note.appendChild(tel);
                note.appendChild(document.createTextNode('.'));
                success.appendChild(note);

                body.appendChild(success);
            });
        }

        render();
    }

    /* ---------------------------------------------------------------------- */
    /* 7. Menu rendering (from the API)                                        */
    /* ---------------------------------------------------------------------- */
    function dishCardMarkup(dish, variant) {
        var card = el('article', variant === 'featured' ? 'dish-card' : 'menu-item');
        card.setAttribute('data-reveal', '');
        card.setAttribute('data-item-id', dish.id);
        card.setAttribute('data-item-name', dish.name);
        card.setAttribute('data-item-price', dish.price);
        card.setAttribute('data-item-image', dish.image || '');
        card.setAttribute('data-search',
            (dish.name + ' ' + dish.description + ' ' + dish.category).toLowerCase());
        if (dish.soldOut) { card.classList.add('is-sold-out'); }

        var actions = el('div', 'menu-item-actions');
        if (dish.soldOut) {
            actions.appendChild(el('span', 'sold-out-flag', 'Sold out'));
        } else {
            var button = el('button', 'add-to-cart-btn');
            button.type = 'button';
            var icon = el('i', 'fa-solid fa-plus');
            icon.setAttribute('aria-hidden', 'true');
            button.appendChild(icon);
            button.appendChild(document.createTextNode(
                variant === 'featured' ? ' Add to order' : ' Add'));
            button.setAttribute('aria-label', 'Add ' + dish.name + ' to your order');
            actions.appendChild(button);
            actions.appendChild(el('span', 'in-cart-badge hidden'));
        }

        if (variant === 'featured') {
            var media = el('div', 'dish-card-media');
            if (dish.tag) { media.appendChild(el('span', 'tag', dish.tag)); }
            var heroImg = el('img');
            heroImg.src = dish.image || './images/HHC5.jpg';
            heroImg.alt = dish.name;
            heroImg.loading = 'lazy';
            media.appendChild(heroImg);

            var cardBody = el('div', 'dish-card-body');
            var heading = el('h3');
            heading.appendChild(document.createTextNode(dish.name + ' '));
            heading.appendChild(el('span', 'price', money(dish.price)));
            cardBody.appendChild(heading);
            cardBody.appendChild(el('p', null, dish.description));
            cardBody.appendChild(actions);

            card.appendChild(media);
            card.appendChild(cardBody);
            return card;
        }

        var img = el('img', 'menu-item-image');
        img.src = dish.image || './images/HHC5.jpg';
        img.alt = dish.name;
        img.loading = 'lazy';

        var text = el('div', 'menu-item-text');
        var h3 = el('h3', 'menu-item-heading');
        h3.appendChild(el('span', 'menu-item-name', dish.name));
        h3.appendChild(el('span', 'menu-item-price', money(dish.price)));
        text.appendChild(h3);
        text.appendChild(el('p', 'menu-item-description', dish.description));
        text.appendChild(actions);

        card.appendChild(img);
        card.appendChild(text);
        return card;
    }

    function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }

    /* DEMO BUILD — the menu is baked into menu-data.js by build-menu.js, so
       there is no server to call and this works from a file:// double-click.
       (The full version fetches /api/menu instead.) */
    function fetchMenu() {
        return new Promise(function (resolve, reject) {
            var menu = window.HHC_MENU;
            if (menu && Array.isArray(menu.categories) && Array.isArray(menu.dishes)) {
                resolve(menu);
            } else {
                reject(new Error('menu-data.js did not load'));
            }
        });
    }

    function renderLoadError(container, message) {
        container.textContent = '';
        var box = el('div', 'no-results');
        var icon = el('i', 'fa-solid fa-plug-circle-exclamation');
        icon.setAttribute('aria-hidden', 'true');
        box.appendChild(icon);
        box.appendChild(el('h2', null, "Couldn't load the menu"));
        box.appendChild(el('p', null, message));
        container.appendChild(box);
    }

    /* --- menu page -------------------------------------------------------- */
    function initMenuPage() {
        var root = $('#menu-root');
        if (!root) { return; }

        var chipRow = $('.filter-chips');
        var countEl = $('#result-count');

        fetchMenu().then(function (menu) {
            var categories = menu.categories.slice().sort(byOrder);
            var dishes = menu.dishes.slice().sort(byOrder);

            root.textContent = '';

            categories.forEach(function (category) {
                var inCategory = dishes.filter(function (d) { return d.category === category.id; });
                if (!inCategory.length) { return; }

                var section = el('section', 'menu-section');
                section.setAttribute('data-category', category.id);
                section.id = category.id;

                var head = el('div', 'menu-section-head');
                head.appendChild(el('h2', null, category.name));
                if (category.subheading) {
                    head.appendChild(el('p', null, category.subheading));
                }
                section.appendChild(head);

                var grid = el('div', 'menu-grid');
                inCategory.forEach(function (dish) {
                    grid.appendChild(dishCardMarkup(dish, 'menu'));
                });
                section.appendChild(grid);
                root.appendChild(section);
            });

            var empty = el('div', 'no-results hidden');
            var icon = el('i', 'fa-solid fa-utensils');
            icon.setAttribute('aria-hidden', 'true');
            empty.appendChild(icon);
            empty.appendChild(el('h2', null, 'Nothing on the menu matches that'));
            empty.appendChild(el('p', null, 'Try a different word, or clear the filters to see everything.'));
            root.appendChild(empty);

            /* Chips follow whatever categories exist. */
            if (chipRow) {
                chipRow.textContent = '';
                var all = el('button', 'chip', 'All');
                all.type = 'button';
                all.setAttribute('data-filter', 'all');
                all.setAttribute('aria-pressed', 'true');
                chipRow.appendChild(all);

                categories.forEach(function (category) {
                    if (!dishes.some(function (d) { return d.category === category.id; })) { return; }
                    var chip = el('button', 'chip', category.name);
                    chip.type = 'button';
                    chip.setAttribute('data-filter', category.id);
                    chip.setAttribute('aria-pressed', 'false');
                    chipRow.appendChild(chip);
                });
            }

            observeReveals(root);
            wireMenuFilter();
            refreshCart();
        }).catch(function () {
            renderLoadError(root,
                'menu-data.js is missing. Make sure it sits next to this page, ' +
                'or rebuild it with "node build-menu.js".');
            if (countEl) { countEl.textContent = ''; }
        });
    }

    function wireMenuFilter() {
        var toolbar = $('.menu-toolbar');
        if (!toolbar) { return; }

        var input = $('#menu-search', toolbar);
        var clearBtn = $('.search-clear', toolbar);
        var chips = $$('.chip', toolbar);
        var sections = $$('.menu-section');
        var items = $$('.menu-item');
        var countEl = $('#result-count');
        var noResults = $('.no-results');
        var activeCategory = 'all';

        function apply() {
            var query = (input ? input.value : '').trim().toLowerCase();
            var visible = 0;

            if (clearBtn) { clearBtn.classList.toggle('hidden', query === ''); }

            items.forEach(function (item) {
                var haystack = (item.getAttribute('data-search') || item.textContent).toLowerCase();
                var section = item.closest('.menu-section');
                var category = section ? section.getAttribute('data-category') : '';
                var show = (query === '' || haystack.indexOf(query) > -1) &&
                           (activeCategory === 'all' || activeCategory === category);
                item.classList.toggle('hidden', !show);
                if (show) { visible++; }
            });

            sections.forEach(function (section) {
                var anyVisible = $$('.menu-item', section).some(function (item) {
                    return !item.classList.contains('hidden');
                });
                section.classList.toggle('hidden', !anyVisible);
            });

            if (noResults) { noResults.classList.toggle('hidden', visible > 0); }
            if (countEl) {
                if (query === '' && activeCategory === 'all') {
                    countEl.textContent = 'Showing all ' + items.length + ' dishes';
                } else {
                    countEl.textContent = visible === 0
                        ? 'No dishes match'
                        : 'Showing ' + visible + ' of ' + items.length + ' dishes';
                }
            }
        }

        if (input && !input.dataset.wired) {
            input.dataset.wired = '1';
            input.addEventListener('input', apply);
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && input.value !== '') {
                    e.stopPropagation();
                    input.value = '';
                    apply();
                }
            });
        }

        if (clearBtn && !clearBtn.dataset.wired) {
            clearBtn.dataset.wired = '1';
            clearBtn.addEventListener('click', function () {
                input.value = '';
                apply();
                input.focus();
            });
        }

        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                activeCategory = chip.getAttribute('data-filter');
                chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
                apply();
            });
        });

        apply();
    }

    /* --- home page favourites --------------------------------------------- */
    function initFeatured() {
        var root = $('#featured-root');
        if (!root) { return; }

        fetchMenu().then(function (menu) {
            /* Order featured dishes the way they appear on the menu:
               by category position first, then by position within it. */
            var categoryRank = {};
            menu.categories.slice().sort(byOrder).forEach(function (c, i) {
                categoryRank[c.id] = i;
            });
            var inMenuOrder = function (a, b) {
                var rank = (categoryRank[a.category] || 0) - (categoryRank[b.category] || 0);
                return rank !== 0 ? rank : byOrder(a, b);
            };

            /* Sold-out dishes shouldn't be advertised as favourites. */
            var available = menu.dishes.filter(function (d) { return !d.soldOut; });
            var featured = available
                .filter(function (d) { return d.featured; })
                .sort(inMenuOrder)
                .slice(0, 3);

            /* Nothing flagged? Fall back to the first few dishes. */
            if (!featured.length) {
                featured = available.slice().sort(inMenuOrder).slice(0, 3);
            }

            root.textContent = '';
            featured.forEach(function (dish) {
                root.appendChild(dishCardMarkup(dish, 'featured'));
            });

            observeReveals(root);
            refreshCart();
        }).catch(function () {
            renderLoadError(root,
                'menu-data.js is missing. Make sure it sits next to this page, ' +
                'or rebuild it with "node build-menu.js".');
        });
    }

    /* ---------------------------------------------------------------------- */
    /* 8. Open / closed status + hours list                                    */
    /* ---------------------------------------------------------------------- */
    function initHours() {
        var now = new Date();

        var pill = $('[data-open-status]');
        if (pill) {
            var open = isOpenNow(now);
            var label = $('.status-text', pill);
            pill.classList.toggle('is-closed', !open);
            if (label) {
                if (open) {
                    label.textContent = 'Open now · until ' + formatHour(HOURS[now.getDay()].close);
                } else {
                    var next = nextOpenDay(now);
                    var today = HOURS[now.getDay()];
                    var opensLater = today.open !== null && now.getHours() < today.open;
                    label.textContent = opensLater
                        ? 'Closed · opens ' + formatHour(today.open) + ' today'
                        : 'Closed · opens ' + (next ? next.label + ' ' + formatHour(next.open) : 'soon');
                }
            }
        }

        $$('[data-hours-list]').forEach(function (list) {
            list.textContent = '';
            /* Start the week on Monday — reads more naturally than Sunday first. */
            [1, 2, 3, 4, 5, 6, 0].forEach(function (index) {
                var day = HOURS[index];
                var li = document.createElement('li');
                if (index === now.getDay()) { li.className = 'is-today'; }
                li.appendChild(el('span', 'day', day.label));
                li.appendChild(el('span', 'time', hoursText(day)));
                list.appendChild(li);
            });
        });
    }

    /* ---------------------------------------------------------------------- */
    /* 9. Hero slideshow                                                       */
    /* ---------------------------------------------------------------------- */
    function initHero() {
        var slides = $$('.hero-slide');
        if (slides.length < 2) { return; }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            slides[0].classList.add('is-active');
            return;
        }
        var index = 0;
        slides[0].classList.add('is-active');
        setInterval(function () {
            slides[index].classList.remove('is-active');
            index = (index + 1) % slides.length;
            slides[index].classList.add('is-active');
        }, 6000);
    }

    /* ---------------------------------------------------------------------- */
    /* 10. Contact form (front-end validation only — no backend)               */
    /* ---------------------------------------------------------------------- */
    function initContactForm() {
        var form = $('#contact-form');
        if (!form) { return; }
        var success = $('.form-success', form);

        function setError(field, message) {
            var input = $('[name="' + field + '"]', form);
            var error = $('#error-' + field, form);
            if (!input || !error) { return; }
            error.textContent = message || '';
            input.setAttribute('aria-invalid', message ? 'true' : 'false');
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var data = new FormData(form);
            var name = (data.get('name') || '').toString().trim();
            var email = (data.get('email') || '').toString().trim();
            var message = (data.get('message') || '').toString().trim();
            var firstInvalid = null;

            setError('name', name ? '' : 'Please tell us your name.');
            if (!name) { firstInvalid = firstInvalid || 'name'; }

            var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            setError('email', emailOk ? '' : 'Please enter a valid email address.');
            if (!emailOk) { firstInvalid = firstInvalid || 'email'; }

            setError('message', message.length >= 10 ? '' : 'Please write at least 10 characters.');
            if (message.length < 10) { firstInvalid = firstInvalid || 'message'; }

            if (firstInvalid) {
                if (success) { success.classList.add('hidden'); }
                var el2 = $('[name="' + firstInvalid + '"]', form);
                if (el2) { el2.focus(); }
                return;
            }

            form.reset();
            if (success) {
                success.classList.remove('hidden');
                success.focus();
            }
        });

        $$('input, textarea', form).forEach(function (input) {
            input.addEventListener('input', function () {
                if (input.getAttribute('aria-invalid') === 'true') {
                    setError(input.name, '');
                }
            });
        });
    }

    /* ---------------------------------------------------------------------- */
    /* 11. Footer year                                                         */
    /* ---------------------------------------------------------------------- */
    function initYear() {
        $$('[data-year]').forEach(function (node) {
            node.textContent = new Date().getFullYear();
        });
    }

    /* --- boot -------------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', function () {
        initHeader();
        initNav();
        initReveal();
        initCart();
        initMenuPage();
        initFeatured();
        initHours();
        initHero();
        initContactForm();
        initYear();
    });
}());
