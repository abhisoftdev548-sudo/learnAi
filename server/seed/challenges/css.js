/** CSS challenge seed data. */

export const cssChallenges = [
  {
    title: 'Center the Card',
    slug: 'center-the-card',
    category: 'CSS',
    difficulty: 'Easy',
    order: 5,
    xp: 50,
    maxAttempts: 3,
    timeLimit: 20,
    passingScore: 70,
    tags: ['flexbox', 'centering', 'layout'],
    description: 'Centre a card perfectly in the viewport using modern layout — no margin hacks, no absolute positioning.',
    instructions: [
      'Make the page stage fill at least the full viewport height.',
      'Centre the card horizontally and vertically with flexbox (or grid).',
      'The card must stay centred at any viewport size and never overflow.',
      'Give the card a max-width of 420px, padding, rounded corners and a soft shadow.',
      'Add a media query that reduces the card padding below 480px.',
      'Do not use position: absolute or fixed values for centring.',
    ],
    hints: [
      'min-height: 100vh on the container plus display: flex is the classic centring recipe.',
      'justify-content centres on the main axis, align-items on the cross axis.',
      'place-items: center does both at once when you use display: grid.',
      'Prefer max-width + width: 100% over a hard width so the card shrinks on phones.',
    ],
    starterHTML: `<main class="stage">
  <section class="card">
    <h1>Perfectly centred</h1>
    <p>Flexbox makes this trivial.</p>
  </section>
</main>`,
    starterCSS: `.stage {
  /* TODO: full height + centring */
}

.card {
  /* TODO: surface styling */
}`,
    starterJS: '',
    testCases: [
      {
        id: 'center-stage-height',
        name: 'Stage fills the viewport height',
        group: 'css',
        type: 'css-declaration',
        selector: '.stage',
        property: 'min-height',
        operator: 'regex',
        pattern: '(100vh|100dvh|100svh|100lvh)',
        weight: 4,
        failureMessage: 'Set min-height: 100vh on .stage.',
      },
      {
        id: 'center-stage-display',
        name: 'Stage uses flex (or grid) layout',
        group: 'css',
        type: 'css-declaration',
        selector: '.stage',
        property: 'display',
        operator: 'one-of',
        value: ['flex', 'grid', 'inline-flex'],
        weight: 4,
      },
      {
        id: 'center-justify',
        name: 'Horizontal centring declared',
        group: 'css',
        type: 'css-declaration',
        selector: '.stage',
        property: 'justify-content',
        operator: 'one-of',
        value: ['center', 'space-around', 'space-evenly'],
        weight: 4,
        failureMessage: 'Use justify-content: center to centre horizontally.',
      },
      {
        id: 'center-align',
        name: 'Vertical centring declared',
        group: 'css',
        type: 'css-declaration',
        selector: '.stage',
        property: 'align-items',
        operator: 'equals',
        value: 'center',
        weight: 4,
        failureMessage: 'Use align-items: center to centre vertically.',
      },
      {
        id: 'center-card-width',
        name: 'Card is capped at 420px and fluid',
        group: 'css',
        type: 'css-declaration',
        selector: '.card',
        property: 'max-width',
        operator: 'regex',
        pattern: '420px',
        weight: 3,
      },
      {
        id: 'center-card-surface',
        name: 'Card has padding, radius and shadow',
        group: 'css',
        type: 'css-declaration',
        selector: '.card',
        property: 'box-shadow',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'center-card-radius',
        name: 'Card uses rounded corners',
        group: 'css',
        type: 'css-declaration',
        selector: '.card',
        property: 'border-radius',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'center-no-absolute',
        name: 'No absolute positioning',
        group: 'css',
        type: 'css-declaration',
        selector: '.card',
        property: 'position',
        operator: 'not-exists',
        weight: 3,
        failureMessage: 'Centre with layout, not with position: absolute.',
      },
      {
        id: 'center-responsive-media',
        name: 'Padding adapts on small screens',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.card',
        property: 'padding',
        operator: 'exists',
        value: 480,
        weight: 4,
        failureMessage: 'Add @media (max-width: 480px) { .card { padding: ... } }.',
      },
      {
        id: 'center-responsive-fluid',
        name: 'Card never overflows on small screens',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: '.card',
        property: 'width',
        operator: 'regex',
        pattern: '(100%|\\d+vw|min\\(|clamp\\()',
        weight: 3,
      },
      {
        id: 'center-measure-desktop',
        name: 'Card is geometrically centred (desktop)',
        group: 'functionality',
        kind: 'measure',
        type: 'viewport',
        weight: 6,
        viewport: { width: 1280, height: 800 },
        failureMessage: 'The rendered card must be centred within 2px on both axes.',
        script: `const card = document.querySelector('.card');
if (!card) return { cardFound: false };
const rect = card.getBoundingClientRect();
const centreX = rect.left + rect.width / 2;
const centreY = rect.top + rect.height / 2;
return {
  cardFound: true,
  cardWidth: Math.round(rect.width),
  cardHeight: Math.round(rect.height),
  offsetX: Math.round(Math.abs(centreX - window.innerWidth / 2)),
  offsetY: Math.round(Math.abs(centreY - window.innerHeight / 2)),
};`,
        checks: [
          { path: 'cardFound', op: 'truthy', message: 'The .card element was not found.' },
          { path: 'cardWidth', op: 'gt', value: 0, message: 'The card has no width.' },
          { path: 'offsetX', op: 'lte', value: 2, tolerance: 2, message: 'The card is not horizontally centred.' },
          { path: 'offsetY', op: 'lte', value: 2, tolerance: 2, message: 'The card is not vertically centred.' },
        ],
        requires: ['center-stage-display'],
      },
      {
        id: 'center-measure-mobile',
        name: 'Card stays centred and fits on mobile',
        group: 'responsiveness',
        kind: 'measure',
        type: 'viewport',
        weight: 4,
        viewport: { width: 360, height: 640 },
        failureMessage: 'On a 360px screen the card must fit and stay centred.',
        script: `const card = document.querySelector('.card');
if (!card) return { cardFound: false };
const rect = card.getBoundingClientRect();
return {
  cardFound: true,
  cardWidth: Math.round(rect.width),
  viewportWidth: window.innerWidth,
  offsetX: Math.round(Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2)),
  overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
};`,
        checks: [
          { path: 'cardFound', op: 'truthy' },
          { path: 'cardWidth', op: 'lt', value: 360, message: 'The card is wider than the mobile viewport.' },
          { path: 'offsetX', op: 'lte', value: 2, tolerance: 2, message: 'The card is not centred on mobile.' },
          { path: 'overflow', op: 'lte', value: 2, message: 'The page scrolls horizontally on mobile.' },
        ],
      },
      {
        id: 'center-quality-important',
        name: 'No !important declarations',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'css-no-important',
        weight: 2,
      },
      {
        id: 'center-quality-transition',
        name: 'Interactive polish: transition present',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'css-transitions',
        weight: 2,
        failureMessage: 'Add a transition (e.g. on .card:hover) for interactive polish.',
      },
    ],
  },

  {
    title: 'Flexbox Layout',
    slug: 'flexbox-layout',
    category: 'CSS',
    difficulty: 'Medium',
    order: 6,
    xp: 100,
    maxAttempts: 3,
    timeLimit: 30,
    passingScore: 70,
    tags: ['flexbox', 'cards', 'responsive'],
    description: 'Build a three-column feature row with flexbox that wraps gracefully and stacks on mobile.',
    instructions: [
      'Lay the three features out in a row with display: flex on .features.',
      'Allow the row to wrap (flex-wrap: wrap) and space the cards with gap.',
      'Each card should grow: flex: 1 1 260px (or an equivalent flex-basis + grow).',
      'Cards must be equal height — use align-items: stretch (the default) or flex on the card.',
      'Inside each card, stack the content vertically with flex-direction: column.',
      'Below 768px the cards must take the full width and stack vertically.',
      'Push the card footer to the bottom with margin-top: auto.',
      'Add a visible border and subtle shadow to each card.',
    ],
    hints: [
      'flex: 1 1 260px reads as "grow, shrink, base size 260px" — the base size drives wrapping.',
      'gap replaces margins between flex items and does not add outer spacing.',
      'margin-top: auto inside a column flex container pins an element to the bottom.',
      'align-items: stretch is what makes cards in a row share the tallest height.',
    ],
    starterHTML: `<section class="features">
  <article class="feature-card">
    <h3 class="feature-title">Fast</h3>
    <p class="feature-text">Ship in minutes, not days.</p>
    <footer class="feature-footer"><a class="feature-link" href="/docs">Read more</a></footer>
  </article>
  <article class="feature-card">
    <h3 class="feature-title">Flexible</h3>
    <p class="feature-text">Compose layouts that adapt.</p>
    <footer class="feature-footer"><a class="feature-link" href="/docs">Read more</a></footer>
  </article>
  <article class="feature-card">
    <h3 class="feature-title">Friendly</h3>
    <p class="feature-text">Accessible by default.</p>
    <footer class="feature-footer"><a class="feature-link" href="/docs">Read more</a></footer>
  </article>
</section>`,
    starterCSS: `.features {
  /* TODO: flex row with wrap and gap */
}

.feature-card {
  /* TODO: surface + column layout */
}

.feature-footer {
  /* TODO: pin to the bottom */
}`,
    starterJS: '',
    testCases: [
      {
        id: 'flex-display',
        name: 'Features use flexbox',
        group: 'css',
        type: 'css-declaration',
        selector: '.features',
        property: 'display',
        operator: 'equals',
        value: 'flex',
        weight: 5,
      },
      {
        id: 'flex-wrap',
        name: 'Row wraps',
        group: 'css',
        type: 'css-declaration',
        selector: '.features',
        property: 'flex-wrap',
        operator: 'equals',
        value: 'wrap',
        weight: 4,
      },
      {
        id: 'flex-gap',
        name: 'Gap between cards',
        group: 'css',
        type: 'css-declaration',
        selector: '.features',
        property: 'gap',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'flex-card-basis',
        name: 'Cards grow from a 260px basis',
        group: 'css',
        type: 'css-declaration',
        selector: '.feature-card',
        property: 'flex',
        operator: 'regex',
        pattern: '(260px|260px\\))',
        weight: 4,
        failureMessage: 'Use flex: 1 1 260px on .feature-card.',
      },
      {
        id: 'flex-card-column',
        name: 'Card content stacks vertically',
        group: 'css',
        type: 'css-declaration',
        selector: '.feature-card',
        property: 'display',
        operator: 'equals',
        value: 'flex',
        weight: 3,
      },
      {
        id: 'flex-card-direction',
        name: 'Card is a column flex container',
        group: 'css',
        type: 'css-declaration',
        selector: '.feature-card',
        property: 'flex-direction',
        operator: 'equals',
        value: 'column',
        weight: 3,
      },
      {
        id: 'flex-footer-margin',
        name: 'Footer pinned with margin-top: auto',
        group: 'css',
        type: 'css-declaration',
        selector: '.feature-footer',
        property: 'margin-top',
        operator: 'equals',
        value: 'auto',
        weight: 4,
        failureMessage: 'Use margin-top: auto on .feature-footer.',
      },
      {
        id: 'flex-card-surface',
        name: 'Cards have a border and shadow',
        group: 'css',
        type: 'css-declaration',
        selector: '.feature-card',
        property: 'box-shadow',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'flex-card-padding',
        name: 'Cards have comfortable padding',
        group: 'css',
        type: 'css-declaration',
        selector: '.feature-card',
        property: 'padding',
        operator: 'exists',
        weight: 2,
      },
      {
        id: 'flex-responsive-stack',
        name: 'Cards stack below 768px',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.feature-card',
        property: 'flex',
        operator: 'exists',
        value: 768,
        weight: 5,
        failureMessage: 'Inside @media (max-width: 768px) set .feature-card { flex: 1 1 100% }.',
      },
      {
        id: 'flex-responsive-title',
        name: 'Typography scales responsively',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: '.feature-title',
        property: 'font-size',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'flex-measure-desktop',
        name: 'Three cards share one row on desktop',
        group: 'functionality',
        kind: 'measure',
        type: 'viewport',
        weight: 6,
        viewport: { width: 1280, height: 800 },
        failureMessage: 'On desktop all three cards should sit on the same row with equal heights.',
        script: `const cards = [...document.querySelectorAll('.feature-card')];
const rects = cards.map((card) => card.getBoundingClientRect());
const heights = rects.map((rect) => Math.round(rect.height));
return {
  cardCount: cards.length,
  rows: new Set(rects.map((rect) => Math.round(rect.top))).size,
  equalHeights: heights.length > 1 ? new Set(heights).size === 1 : false,
  firstWidth: rects[0] ? Math.round(rects[0].width) : 0,
  gap: rects.length > 1 ? Math.round(rects[1].left - rects[0].right) : 0,
  overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
};`,
        checks: [
          { path: 'cardCount', op: 'gte', value: 3, message: 'Three feature cards are required.' },
          { path: 'rows', op: 'eq', value: 1, message: 'Cards did not sit on a single row on desktop.' },
          { path: 'equalHeights', op: 'truthy', message: 'Cards must share the same height.' },
          { path: 'gap', op: 'gt', value: 0, message: 'Cards are touching — add a gap.' },
          { path: 'overflow', op: 'lte', value: 2, message: 'The layout overflows horizontally.' },
        ],
        requires: ['flex-display', 'flex-wrap'],
      },
      {
        id: 'flex-measure-mobile',
        name: 'Cards stack vertically on mobile',
        group: 'responsiveness',
        kind: 'measure',
        type: 'viewport',
        weight: 4,
        viewport: { width: 375, height: 780 },
        failureMessage: 'On a 375px screen the cards must stack into three rows.',
        script: `const cards = [...document.querySelectorAll('.feature-card')];
const rects = cards.map((card) => card.getBoundingClientRect());
return {
  rows: new Set(rects.map((rect) => Math.round(rect.top))).size,
  maxWidth: rects.length ? Math.round(Math.max(...rects.map((rect) => rect.width))) : 0,
  viewportWidth: window.innerWidth,
  overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
};`,
        checks: [
          { path: 'rows', op: 'eq', value: 3, message: 'Cards must stack into three rows on mobile.' },
          { path: 'overflow', op: 'lte', value: 2, message: 'The layout overflows on mobile.' },
        ],
        requires: ['flex-responsive-stack'],
      },
      {
        id: 'flex-quality-important',
        name: 'No !important declarations',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'css-no-important',
        weight: 2,
      },
      {
        id: 'flex-quality-responsive-techniques',
        name: 'Uses responsive techniques',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'responsive-techniques',
        value: 1,
        weight: 3,
      },
    ],
  },

  {
    title: 'Responsive Product Grid',
    slug: 'responsive-product-grid',
    category: 'CSS',
    difficulty: 'Medium',
    order: 7,
    xp: 100,
    maxAttempts: 3,
    timeLimit: 30,
    passingScore: 70,
    tags: ['css-grid', 'responsive', 'auto-fit'],
    description: 'Create a product grid that flows from one column on phones to auto-fit columns on wide screens.',
    instructions: [
      'Use display: grid on .product-grid.',
      'Use grid-template-columns with repeat(auto-fit, minmax(240px, 1fr)).',
      'Add a gap of at least 1rem between cards.',
      'Each card should be a flex column with the image at a fixed aspect ratio.',
      'Images must be width: 100% with object-fit: cover.',
      'Below 600px the grid must collapse to a single column.',
      'Give the price row a flex layout with the price and a button aligned.',
      'Add a hover transition on the card.',
    ],
    hints: [
      'repeat(auto-fit, minmax(240px, 1fr)) creates as many columns as fit.',
      'grid-template-columns: 1fr inside a media query gives you one column.',
      'aspect-ratio: 4 / 3 plus object-fit: cover keeps product photos tidy.',
      'gap: 1.5rem keeps a consistent rhythm between rows and columns.',
    ],
    starterHTML: `<section class="product-grid">
  <article class="product-card">
    <img class="product-image" src="https://placehold.co/400x300/eee/31343c?text=Coffee" alt="Coffee beans pack" />
    <h3 class="product-title">House blend</h3>
    <p class="product-price">€12.50</p>
    <button class="product-button" type="button">Add to cart</button>
  </article>
  <article class="product-card">
    <img class="product-image" src="https://placehold.co/400x300/eee/31343c?text=Grinder" alt="Manual coffee grinder" />
    <h3 class="product-title">Hand grinder</h3>
    <p class="product-price">€48.00</p>
    <button class="product-button" type="button">Add to cart</button>
  </article>
  <article class="product-card">
    <img class="product-image" src="https://placehold.co/400x300/eee/31343c?text=Mug" alt="Ceramic mug" />
    <h3 class="product-title">Ceramic mug</h3>
    <p class="product-price">€9.00</p>
    <button class="product-button" type="button">Add to cart</button>
  </article>
</section>`,
    starterCSS: `.product-grid {
  /* TODO: responsive grid */
}

.product-card {
  /* TODO: column card with hover transition */
}

.product-image {
  /* TODO: fluid image with aspect ratio */
}`,
    starterJS: '',
    testCases: [
      {
        id: 'grid-display',
        name: 'Grid layout enabled',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-grid',
        property: 'display',
        operator: 'equals',
        value: 'grid',
        weight: 5,
      },
      {
        id: 'grid-template',
        name: 'Auto-fit columns with minmax',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-grid',
        property: 'grid-template-columns',
        operator: 'regex',
        pattern: 'auto-(fit|fill)[\\s\\S]*minmax\\(\\s*240px',
        weight: 5,
        failureMessage: 'Use repeat(auto-fit, minmax(240px, 1fr)) for .product-grid.',
      },
      {
        id: 'grid-gap',
        name: 'Grid gap is at least 1rem',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-grid',
        property: 'gap',
        operator: 'regex',
        pattern: '(1\\.?[5-9]?rem|2[0-9]px|[2-9][0-9]px)',
        weight: 3,
        failureMessage: 'Add gap: 1.5rem to .product-grid.',
      },
      {
        id: 'grid-card-column',
        name: 'Cards stack content vertically',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-card',
        property: 'display',
        operator: 'equals',
        value: 'flex',
        weight: 3,
      },
      {
        id: 'grid-card-surface',
        name: 'Cards have padding and radius',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-card',
        property: 'padding',
        operator: 'exists',
        weight: 2,
      },
      {
        id: 'grid-image-width',
        name: 'Images fill the card width',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-image',
        property: 'width',
        operator: 'equals',
        value: '100%',
        weight: 4,
      },
      {
        id: 'grid-image-fit',
        name: 'Images use object-fit: cover',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-image',
        property: 'object-fit',
        operator: 'equals',
        value: 'cover',
        weight: 3,
      },
      {
        id: 'grid-image-ratio',
        name: 'Images keep a 4/3 aspect ratio',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-image',
        property: 'aspect-ratio',
        operator: 'regex',
        pattern: '4\\s*/\\s*3',
        weight: 3,
      },
      {
        id: 'grid-price-row',
        name: 'Price row uses flex',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-card',
        property: 'gap',
        operator: 'exists',
        weight: 2,
      },
      {
        id: 'grid-responsive-single',
        name: 'Single column below 600px',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.product-grid',
        property: 'grid-template-columns',
        operator: 'exists',
        value: 600,
        weight: 5,
        failureMessage: 'Add @media (max-width: 600px) { .product-grid { grid-template-columns: 1fr } }.',
      },
      {
        id: 'grid-responsive-transition',
        name: 'Card hover transition defined',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: '.product-card',
        property: 'transition',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'grid-measure-desktop',
        name: 'At least three columns on desktop',
        group: 'functionality',
        kind: 'measure',
        type: 'viewport',
        weight: 6,
        viewport: { width: 1280, height: 900 },
        failureMessage: 'At 1280px the grid should show three or more columns.',
        script: `const grid = document.querySelector('.product-grid');
if (!grid) return { gridFound: false };
const style = getComputedStyle(grid);
const cards = [...document.querySelectorAll('.product-card')];
const rects = cards.map((card) => card.getBoundingClientRect());
const columnCount = style.gridTemplateColumns.trim().split(/\\s+/).filter(Boolean).length;
return {
  gridFound: true,
  columnCount,
  cardCount: cards.length,
  firstRowCards: new Set(rects.map((rect) => Math.round(rect.top))).size,
  gap: rects.length > 1 ? Math.round(rects[1].left - rects[0].right) : 0,
  imageHeight: (() => { const img = document.querySelector('.product-image'); return img ? Math.round(img.getBoundingClientRect().height) : 0; })(),
};`,
        checks: [
          { path: 'gridFound', op: 'truthy', message: 'The product grid was not found.' },
          { path: 'cardCount', op: 'gte', value: 3 },
          { path: 'columnCount', op: 'gte', value: 3, message: 'Fewer than three columns were rendered at 1280px.' },
          { path: 'gap', op: 'gt', value: 8, message: 'Columns are too close together — increase the gap.' },
          { path: 'imageHeight', op: 'gt', value: 0, message: 'Product images have no rendered height.' },
        ],
        requires: ['grid-display', 'grid-template'],
      },
      {
        id: 'grid-measure-mobile',
        name: 'Single column on mobile',
        group: 'responsiveness',
        kind: 'measure',
        type: 'viewport',
        weight: 4,
        viewport: { width: 375, height: 800 },
        failureMessage: 'On a 375px viewport the grid must be a single column.',
        script: `const grid = document.querySelector('.product-grid');
if (!grid) return { gridFound: false };
const style = getComputedStyle(grid);
const rects = [...document.querySelectorAll('.product-card')].map((card) => card.getBoundingClientRect());
return {
  gridFound: true,
  columnCount: style.gridTemplateColumns.trim().split(/\\s+/).filter(Boolean).length,
  rows: new Set(rects.map((rect) => Math.round(rect.top))).size,
  overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
};`,
        checks: [
          { path: 'columnCount', op: 'lte', value: 1, message: 'More than one column is rendered on a 375px screen.' },
          { path: 'rows', op: 'eq', value: 3, message: 'Each product should occupy its own row on mobile.' },
          { path: 'overflow', op: 'lte', value: 2, message: 'The grid overflows horizontally on mobile.' },
        ],
        requires: ['grid-responsive-single'],
      },
      {
        id: 'grid-quality-important',
        name: 'No !important declarations',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'css-no-important',
        weight: 2,
      },
      {
        id: 'grid-quality-techniques',
        name: 'Fluid layout techniques used',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'responsive-techniques',
        value: 1,
        weight: 3,
      },
    ],
  },

  {
    title: 'Hover Animation',
    slug: 'hover-animation',
    category: 'CSS',
    difficulty: 'Easy',
    order: 8,
    xp: 50,
    maxAttempts: 3,
    timeLimit: 20,
    passingScore: 70,
    tags: ['transitions', 'animation', 'micro-interactions'],
    description: 'Add tasteful motion: a card that lifts on hover and a badge that pulses with keyframes.',
    instructions: [
      'Give .card a transition for transform and box-shadow of about 0.3s ease.',
      'On .card:hover lift the card with translateY(-6px) and deepen the box-shadow.',
      'Add a @keyframes float (or pulse) animation that animates transform or opacity.',
      'Apply the animation to .badge with a duration between 1s and 4s.',
      'Magnify the card image slightly on hover using scale(1.05) and a transition.',
      'Keep motion subtle and under 400ms for hover feedback.',
      'Never remove focus visibility: keep :focus-visible outlines on the card link.',
    ],
    hints: [
      'transition: transform 0.3s ease, box-shadow 0.3s ease animates only what you need.',
      'transform creates a new stacking context — combine it with box-shadow for depth.',
      'Set animation-iteration-count: infinite for a looping badge.',
      'prefers-reduced-motion lets you respect users who disable animation.',
    ],
    starterHTML: `<div class="card" tabindex="0">
  <span class="badge">New</span>
  <img class="card-image" src="https://placehold.co/480x320/6366f1/ffffff?text=Hover+me" alt="Sample artwork" />
  <div class="card-body">
    <h3 class="card-title">Motion study</h3>
    <p class="card-text">Hover, focus and watch the transition.</p>
  </div>
</div>`,
    starterCSS: `.card {
  /* TODO: transition + hover state */
}

.card-image {
  /* TODO: scale on hover */
}

.badge {
  /* TODO: keyframes animation */
}`,
    starterJS: '',
    testCases: [
      {
        id: 'hover-transition',
        name: 'Card has a transition',
        group: 'css',
        type: 'css-declaration',
        selector: '.card',
        property: 'transition',
        operator: 'regex',
        pattern: '0?\\.?[2-5]s|(200|250|300|350|400)ms',
        weight: 5,
        failureMessage: 'Add transition: transform 0.3s ease, box-shadow 0.3s ease on .card.',
      },
      {
        id: 'hover-transform',
        name: 'Card lifts on hover',
        group: 'css',
        type: 'css-declaration',
        selector: '.card:hover',
        property: 'transform',
        operator: 'regex',
        pattern: 'translateY\\(-?\\d',
        weight: 5,
        failureMessage: 'Use transform: translateY(-6px) in .card:hover.',
      },
      {
        id: 'hover-shadow',
        name: 'Hover deepens the shadow',
        group: 'css',
        type: 'css-declaration',
        selector: '.card:hover',
        property: 'box-shadow',
        operator: 'exists',
        weight: 4,
      },
      {
        id: 'hover-keyframes',
        name: 'A keyframes animation is defined',
        group: 'css',
        type: 'css-keyframes',
        operator: 'exists',
        value: '*',
        weight: 5,
        failureMessage: 'Define an @keyframes animation (for example @keyframes float).',
      },
      {
        id: 'hover-badge-animation',
        name: 'Badge uses the animation',
        group: 'css',
        type: 'css-declaration',
        selector: '.badge',
        property: 'animation',
        operator: 'exists',
        weight: 5,
        failureMessage: 'Apply the animation to .badge, e.g. animation: float 2.4s ease-in-out infinite.',
      },
      {
        id: 'hover-badge-radius',
        name: 'Badge is a pill',
        group: 'css',
        type: 'css-declaration',
        selector: '.badge',
        property: 'border-radius',
        operator: 'exists',
        weight: 2,
      },
      {
        id: 'hover-card-surface',
        name: 'Card has a surface and radius',
        group: 'css',
        type: 'css-declaration',
        selector: '.card',
        property: 'border-radius',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'hover-card-overflow',
        name: 'Image zoom is clipped',
        group: 'css',
        type: 'css-declaration',
        selector: '.card',
        property: 'overflow',
        operator: 'equals',
        value: 'hidden',
        weight: 4,
        failureMessage: 'Set overflow: hidden on .card so the scaled image stays inside the card.',
      },
      {
        id: 'hover-image-transition',
        name: 'Image has its own transition',
        group: 'css',
        type: 'css-declaration',
        selector: '.card-image',
        property: 'transition',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'hover-image-scale',
        name: 'Image scales on card hover',
        group: 'css',
        type: 'css-declaration',
        selector: '.card:hover .card-image',
        property: 'transform',
        operator: 'regex',
        pattern: 'scale\\(\\s*1\\.0[1-9]',
        weight: 4,
        failureMessage: 'Add .card:hover .card-image { transform: scale(1.05) }.',
      },
      {
        id: 'hover-focus-visible',
        name: 'Focus styles preserved',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: ':focus-visible',
        property: 'outline',
        operator: 'exists',
        weight: 3,
        failureMessage: 'Keep keyboard focus visible with :focus-visible { outline: ... }.',
      },
      {
        id: 'hover-body-padding',
        name: 'Card body has padding',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: '.card-body',
        property: 'padding',
        operator: 'exists',
        weight: 2,
      },
      {
        id: 'hover-measure-transition',
        name: 'Transition and animation are live in the preview',
        group: 'functionality',
        kind: 'measure',
        type: 'measure',
        weight: 6,
        viewport: { width: 1024, height: 900 },
        failureMessage: 'The rendered card must have a transition duration and the badge an animation.',
        script: `const card = document.querySelector('.card');
const badge = document.querySelector('.badge');
const image = document.querySelector('.card-image');
const parseMs = (value) => String(value || '').split(',').map((part) => {
  const trimmed = part.trim();
  if (trimmed.endsWith('ms')) return parseFloat(trimmed);
  if (trimmed.endsWith('s')) return parseFloat(trimmed) * 1000;
  return parseFloat(trimmed) || 0;
}).reduce((max, current) => Math.max(max, current), 0);
const cardStyle = card ? getComputedStyle(card) : null;
const badgeStyle = badge ? getComputedStyle(badge) : null;
const imageStyle = image ? getComputedStyle(image) : null;
return {
  cardFound: Boolean(card),
  cardTransitionMs: cardStyle ? parseMs(cardStyle.transitionDuration) : 0,
  imageTransitionMs: imageStyle ? parseMs(imageStyle.transitionDuration) : 0,
  badgeAnimationName: badgeStyle ? badgeStyle.animationName : 'none',
  badgeAnimationMs: badgeStyle ? parseMs(badgeStyle.animationDuration) : 0,
  cardOverflow: cardStyle ? cardStyle.overflow : '',
};`,
        checks: [
          { path: 'cardFound', op: 'truthy', message: 'The card was not found in the preview.' },
          { path: 'cardTransitionMs', op: 'gt', value: 0, message: 'The card has no transition duration.' },
          { path: 'badgeAnimationName', op: 'ne', value: 'none', message: 'The badge is not animated.' },
          { path: 'badgeAnimationMs', op: 'gte', value: 500, message: 'The badge animation is too fast to notice.' },
          { path: 'cardOverflow', op: 'eq', value: 'hidden', message: 'The card must clip the image zoom (overflow: hidden).' },
        ],
        requires: ['hover-transition', 'hover-keyframes', 'hover-badge-animation'],
      },
      {
        id: 'hover-measure-image-zoom',
        name: 'Image transition is smooth (not instant)',
        group: 'responsiveness',
        kind: 'measure',
        type: 'measure',
        weight: 3,
        viewport: { width: 1024, height: 900 },
        failureMessage: 'The image needs its own transition so the zoom feels smooth.',
        script: `const image = document.querySelector('.card-image');
if (!image) return { imageFound: false };
const style = getComputedStyle(image);
const duration = String(style.transitionDuration || '').trim();
return {
  imageFound: true,
  transitionProperty: style.transitionProperty,
  transitionDuration: duration,
};`,
        checks: [
          { path: 'imageFound', op: 'truthy' },
          { path: 'transitionDuration', op: 'ne', value: '0s', message: 'The image zoom happens instantly — add a transition.' },
        ],
      },
      {
        id: 'hover-quality-important',
        name: 'No !important declarations',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'css-no-important',
        weight: 2,
      },
      {
        id: 'hover-quality-transitions',
        name: 'Motion defined with transitions/animations',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'css-transitions',
        weight: 3,
      },
    ],
  },
];

export default cssChallenges;
