/* ==========================================================================
   Hao Hao Chi (demo) — menu bundler

   The demo has no server, so the menu can't be fetched at runtime. This
   script bakes data/menu.json into menu-data.js, which the pages load with
   a plain <script> tag. That works from a file:// double-click and from
   any static host.

   Edit data/menu.json, then run:

       node build-menu.js

   This is a build-time tool only — the demo site itself needs no Node.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, 'data', 'menu.json');
const OUTPUT = path.join(__dirname, 'menu-data.js');

function build() {
    const raw = fs.readFileSync(SOURCE, 'utf8');
    const menu = JSON.parse(raw);

    if (!Array.isArray(menu.categories) || !Array.isArray(menu.dishes)) {
        throw new Error('data/menu.json must have "categories" and "dishes" arrays.');
    }

    const banner = [
        '/* ------------------------------------------------------------------',
        '   GENERATED FILE — do not edit by hand.',
        '   Source: data/menu.json   Rebuild: node build-menu.js',
        '   ------------------------------------------------------------------ */',
        ''
    ].join('\n');

    fs.writeFileSync(OUTPUT, banner + 'window.HHC_MENU = ' + JSON.stringify(menu, null, 2) + ';\n');

    console.log('Wrote menu-data.js — ' + menu.dishes.length + ' dishes, ' +
        menu.categories.length + ' categories.');
}

try {
    build();
} catch (err) {
    console.error('Could not build the menu: ' + err.message);
    process.exit(1);
}
