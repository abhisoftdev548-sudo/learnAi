/**
 * HTML challenge seed data.
 *
 * Test case reference (see server/config/constants.js for the full list):
 *  - kind is derived: `measure` / `viewport` need a live preview, everything
 *    else is `static` and verified on the server without executing any code.
 *  - Static tests: html-selector | html-attribute | html-text | html-count |
 *    css-declaration | css-media | css-selector | css-keyframes | js-pattern |
 *    code-quality
 *  - Measured tests run `script` inside the sandboxed preview iframe and return
 *    raw values which the server judges with `checks`.
 */

export const htmlChallenges = [
  {
    title: 'Profile Card',
    slug: 'profile-card',
    category: 'HTML',
    difficulty: 'Easy',
    order: 1,
    xp: 50,
    maxAttempts: 3,
    timeLimit: 25,
    passingScore: 70,
    tags: ['semantic-html', 'layout', 'accessibility'],
    description:
      'Build a semantic profile card for a team member using proper HTML structure and accessible attributes.',
    instructions: [
      'Wrap the card in an <article class="profile-card"> element.',
      'Add an <img class="avatar"> with a descriptive alt attribute and an https:// image URL.',
      'Show the member name inside a single <h2 class="profile-name">.',
      'Add a role line with class "profile-role" and a bio with class "profile-bio" (at least 40 characters).',
      'List at least three skills inside a <ul class="skills">.',
      'Add a contact link with class "profile-link" whose href starts with https://.',
      'Use at least two semantic sectioning elements (article, header, footer, section, nav...).',
      'Add a media query below 640px that tightens the card padding.',
    ],
    hints: [
      'Semantic HTML describes meaning: <article> for a self-contained card, <header>/<footer> inside it.',
      'Every <img> needs an alt attribute — describe the image, do not leave it empty.',
      'A single <h2> keeps the document outline valid; do not use <h2> for the role line.',
      'Skills read best as a list: <ul class="skills"><li>...</li></ul>.',
    ],
    starterHTML: `<div class="profile-card">
  <!-- TODO: turn this into semantic markup -->
  <div class="avatar"></div>
  <h2 class="profile-name">Your name</h2>
  <p class="profile-role"></p>
  <p class="profile-bio"></p>
  <ul class="skills">
    <li>HTML</li>
  </ul>
</div>`,
    starterCSS: `.profile-card {
  /* TODO: card surface, radius and comfortable padding */
}

.avatar {
  /* TODO: size the avatar and make it round */
}

.skills {
  /* TODO: lay the skills out in a row */
}`,
    starterJS: '',
    testCases: [
      {
        id: 'profile-card-article',
        name: 'Card uses <article class="profile-card">',
        group: 'html',
        type: 'html-selector',
        selector: 'article.profile-card',
        operator: 'exists',
        weight: 3,
        failureMessage: 'Wrap the card in <article class="profile-card"> so it describes a self-contained item.',
      },
      {
        id: 'profile-avatar-alt',
        name: 'Avatar has a descriptive alt attribute',
        group: 'html',
        type: 'html-attribute',
        selector: 'img.avatar',
        attribute: 'alt',
        operator: 'regex',
        pattern: '\\S',
        weight: 3,
        failureMessage: 'The avatar <img> must have a non-empty alt attribute.',
      },
      {
        id: 'profile-avatar-src',
        name: 'Avatar loads an https image',
        group: 'html',
        type: 'html-attribute',
        selector: 'img.avatar',
        attribute: 'src',
        operator: 'regex',
        pattern: '^https?://',
        weight: 2,
        failureMessage: 'Point the avatar src at an https:// image URL.',
      },
      {
        id: 'profile-name',
        name: 'Exactly one <h2 class="profile-name"> with a name',
        group: 'html',
        type: 'html-selector',
        selector: 'h2.profile-name',
        operator: 'regex',
        pattern: '\\S',
        count: 1,
        weight: 3,
        failureMessage: 'Use a single <h2 class="profile-name"> that contains the member name.',
      },
      {
        id: 'profile-role',
        name: 'Role line is present',
        group: 'html',
        type: 'html-text',
        selector: '.profile-role',
        operator: 'regex',
        pattern: '\\S',
        weight: 2,
        failureMessage: 'Add a short role or job title in .profile-role.',
      },
      {
        id: 'profile-bio',
        name: 'Bio paragraph has at least 40 characters',
        group: 'html',
        type: 'html-text',
        selector: '.profile-bio',
        operator: 'regex',
        pattern: '^[\\s\\S]{40,}$',
        weight: 2,
        failureMessage: 'The bio should be at least 40 characters of real text.',
      },
      {
        id: 'profile-skills',
        name: 'At least three skills in a list',
        group: 'html',
        type: 'html-count',
        selector: '.skills li',
        operator: 'min-count',
        count: 3,
        weight: 3,
        failureMessage: 'List at least three <li> skills inside <ul class="skills">.',
      },
      {
        id: 'profile-link',
        name: 'Contact link points at an https URL',
        group: 'html',
        type: 'html-attribute',
        selector: '.profile-link',
        attribute: 'href',
        operator: 'regex',
        pattern: '^https?://',
        weight: 2,
        failureMessage: 'Add <a class="profile-link" href="https://...">.',
      },
      {
        id: 'profile-css-surface',
        name: 'Card surface: padding, radius and shadow',
        group: 'css',
        type: 'css-declaration',
        selector: '.profile-card',
        property: 'padding',
        operator: 'exists',
        weight: 3,
        failureMessage: 'Give .profile-card comfortable padding.',
      },
      {
        id: 'profile-css-radius',
        name: 'Card uses rounded corners',
        group: 'css',
        type: 'css-declaration',
        selector: '.profile-card',
        property: 'border-radius',
        operator: 'exists',
        weight: 3,
        failureMessage: 'Round the card with border-radius.',
      },
      {
        id: 'profile-css-avatar-round',
        name: 'Avatar is circular and sized',
        group: 'css',
        type: 'css-declaration',
        selector: '.avatar',
        property: 'border-radius',
        operator: 'regex',
        pattern: '(50%|9999px|9rem|100px)',
        weight: 3,
        failureMessage: 'Make the avatar circular with border-radius: 50%.',
      },
      {
        id: 'profile-css-skills-flex',
        name: 'Skills laid out with flexbox',
        group: 'css',
        type: 'css-declaration',
        selector: '.skills',
        property: 'display',
        operator: 'equals',
        value: 'flex',
        weight: 2,
        failureMessage: 'Use display: flex on .skills so the tags sit in a row.',
      },
      {
        id: 'profile-responsive-maxwidth',
        name: 'Card is fluid on small screens',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: '.profile-card',
        property: 'max-width',
        operator: 'regex',
        pattern: '(100%|\\d+vw|min\\(|clamp\\()',
        weight: 3,
        failureMessage: 'Cap the card with max-width: 100% (or a clamp()) so it never overflows.',
      },
      {
        id: 'profile-responsive-media',
        name: 'Card adapts on small screens',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.profile-card',
        property: 'padding',
        operator: 'exists',
        value: 640,
        weight: 2,
        failureMessage: 'Add @media (max-width: 640px) { .profile-card { padding: ... } }.',
      },
      {
        id: 'profile-measure-layout',
        name: 'Rendered card fits the viewport',
        group: 'responsiveness',
        kind: 'measure',
        type: 'viewport',
        weight: 3,
        viewport: { width: 375, height: 720 },
        failureMessage: 'At 375px wide the card must not cause horizontal scrolling.',
        script: `const card = document.querySelector('article.profile-card') || document.querySelector('.profile-card');
const rect = card ? card.getBoundingClientRect() : null;
return {
  cardWidth: rect ? Math.round(rect.width) : 0,
  overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
  avatarRendered: (() => {
    const img = document.querySelector('img.avatar');
    if (!img) return false;
    const box = img.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  })(),
};`,
        checks: [
          { path: 'cardWidth', op: 'gt', value: 0, message: 'The profile card did not render.' },
          { path: 'overflow', op: 'lte', value: 2, message: 'The layout overflows horizontally on a 375px screen.' },
          { path: 'avatarRendered', op: 'truthy', message: 'The avatar image has no rendered size — check the src/alt attributes.' },
        ],
      },
      {
        id: 'profile-quality-semantic',
        name: 'Uses semantic sectioning elements',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'uses-semantic-tags',
        weight: 2,
      },
      {
        id: 'profile-quality-inline',
        name: 'No inline style attributes',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'no-inline-style',
        weight: 2,
      },
    ],
  },

  {
    title: 'Registration Form',
    slug: 'registration-form',
    category: 'HTML',
    difficulty: 'Medium',
    order: 2,
    xp: 100,
    maxAttempts: 3,
    timeLimit: 30,
    passingScore: 70,
    tags: ['forms', 'validation', 'accessibility'],
    description:
      'Create an accessible registration form with correct input types, labels and native validation.',
    instructions: [
      'Create a <form class="signup-form"> with a <legend> or heading describing the form.',
      'Add a text input for the full name with id "full-name" and a matching <label>.',
      'Add an email input (type="email") with id "email", required and a matching label.',
      'Add a password input with id "password", minlength="8" and a matching label.',
      'Add a checkbox input with id "terms" that is required.',
      'Add a submit button with class "submit-btn" and type="submit".',
      'Every input must have a label, a name attribute and a placeholder where it helps.',
      'Show a hint element with class "form-hint" using <small> or <p>.',
    ],
    hints: [
      'Use <label for="id"> to associate labels with inputs — clicking the label then focuses the field.',
      'type="email" gives you free browser validation plus the right mobile keyboard.',
      'required and minlength work without any JavaScript.',
      'Group related fields with <fieldset> and describe the group with <legend>.',
    ],
    starterHTML: `<form class="signup-form">
  <h2>Create your account</h2>
  <!-- TODO: add labelled fields -->
  <input type="text" placeholder="Full name" />
  <input type="email" placeholder="Email" />
  <button class="submit-btn">Sign up</button>
</form>`,
    starterCSS: `.signup-form {
  /* TODO: card layout with spacing */
}

.signup-form label {
  /* TODO: block labels with a small font weight */
}

.submit-btn {
  /* TODO: primary button styling */
}`,
    starterJS: '',
    testCases: [
      {
        id: 'form-element',
        name: 'Form with class signup-form exists',
        group: 'html',
        type: 'html-selector',
        selector: 'form.signup-form',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'form-name-field',
        name: 'Full name field with label',
        group: 'html',
        type: 'html-attribute',
        selector: 'label[for="full-name"]',
        attribute: 'for',
        operator: 'equals',
        value: 'full-name',
        weight: 3,
        failureMessage: 'Add <label for="full-name"> and an input with id="full-name".',
      },
      {
        id: 'form-email-type',
        name: 'Email input uses type="email" and required',
        group: 'html',
        type: 'html-selector',
        selector: 'input[type="email"]#email[required]',
        operator: 'exists',
        weight: 4,
        failureMessage: 'The email field needs type="email", id="email" and the required attribute.',
      },
      {
        id: 'form-password-minlength',
        name: 'Password field has minlength="8"',
        group: 'html',
        type: 'html-attribute',
        selector: 'input#password',
        attribute: 'minlength',
        operator: 'equals',
        value: '8',
        weight: 3,
        failureMessage: 'Set minlength="8" on the password input.',
      },
      {
        id: 'form-terms-checkbox',
        name: 'Required terms checkbox',
        group: 'html',
        type: 'html-selector',
        selector: 'input[type="checkbox"]#terms[required]',
        operator: 'exists',
        weight: 3,
        failureMessage: 'Add <input type="checkbox" id="terms" required>.',
      },
      {
        id: 'form-submit-button',
        name: 'Submit button with class and type',
        group: 'html',
        type: 'html-selector',
        selector: 'button.submit-btn[type="submit"]',
        operator: 'exists',
        weight: 3,
        failureMessage: 'Use <button class="submit-btn" type="submit">.',
      },
      {
        id: 'form-name-attributes',
        name: 'Inputs have name attributes',
        group: 'html',
        type: 'html-count',
        selector: 'input[name]',
        operator: 'min-count',
        count: 4,
        weight: 2,
        failureMessage: 'Give every input a name attribute so the form can submit data.',
      },
      {
        id: 'form-hint',
        name: 'Form hint element is present',
        group: 'html',
        type: 'html-text',
        selector: '.form-hint',
        operator: 'regex',
        pattern: '\\S',
        weight: 2,
        failureMessage: 'Add a helpful <small class="form-hint">.',
      },
      {
        id: 'form-css-card',
        name: 'Form styled as a card',
        group: 'css',
        type: 'css-declaration',
        selector: '.signup-form',
        property: 'padding',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'form-css-label-block',
        name: 'Labels are block level and readable',
        group: 'css',
        type: 'css-declaration',
        selector: 'label',
        property: 'display',
        operator: 'one-of',
        value: ['block', 'flex', 'grid', 'inline-block'],
        weight: 3,
        failureMessage: 'Set label { display: block } (or flex/grid) so each field starts on its own line.',
      },
      {
        id: 'form-css-button',
        name: 'Primary button styling',
        group: 'css',
        type: 'css-declaration',
        selector: '.submit-btn',
        property: 'background',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'form-css-width',
        name: 'Inputs stretch to the card width',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: 'input',
        property: 'width',
        operator: 'regex',
        pattern: '(100%|100%)',
        weight: 3,
        failureMessage: 'Give inputs width: 100% so the form is fluid.',
      },
      {
        id: 'form-responsive-media',
        name: 'Layout adapts on small screens',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.signup-form',
        property: 'padding',
        operator: 'exists',
        value: 900,
        weight: 3,
        failureMessage: 'Add a media query (max-width: 900px) that tightens the form padding.',
      },
      {
        id: 'form-measure-validation',
        name: 'Native validation blocks an empty submit',
        group: 'functionality',
        kind: 'measure',
        type: 'measure',
        weight: 5,
        viewport: { width: 1024, height: 900 },
        failureMessage: 'An empty form must be invalid and a filled form must be valid.',
        script: `const form = document.querySelector('form.signup-form');
if (!form) return { formFound: false };
const set = (el, value) => { if (el) { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); } };
const invalidWhenEmpty = !form.checkValidity();
set(form.querySelector('#email'), 'dev@team.io');
set(form.querySelector('#password'), 'practice123');
set(form.querySelector('#full-name'), 'Ada Lovelace');
const terms = form.querySelector('#terms');
if (terms) { terms.checked = true; }
const validWhenFilled = form.checkValidity();
return { formFound: true, invalidWhenEmpty, validWhenFilled, emailValid: (() => { const email = form.querySelector('#email'); return email ? email.checkValidity() === false || email.validity.valid : false; })() };`,
        checks: [
          { path: 'formFound', op: 'truthy', message: 'The signup form was not found in the preview.' },
          { path: 'invalidWhenEmpty', op: 'truthy', message: 'Empty submissions must be blocked (use required / type="email").' },
          { path: 'validWhenFilled', op: 'truthy', message: 'A correctly filled form must pass native validation.' },
        ],
        requires: ['form-email-type'],
      },
      {
        id: 'form-quality-labels',
        name: 'Every field has a label',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'form-labels',
        weight: 3,
      },
      {
        id: 'form-quality-inline-handlers',
        name: 'No inline event handlers',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'no-inline-event-handlers',
        weight: 2,
      },
    ],
  },

  {
    title: 'Navigation Bar',
    slug: 'navigation-bar',
    category: 'HTML',
    difficulty: 'Medium',
    order: 3,
    xp: 100,
    maxAttempts: 3,
    timeLimit: 30,
    passingScore: 70,
    tags: ['navigation', 'semantics', 'responsive'],
    description:
      'Build a responsive site navigation bar with a brand, primary links, an active state and a call to action.',
    instructions: [
      'Create a <header class="site-header"> containing a <nav class="main-nav">.',
      'Add a brand link with class "brand" and href="/".',
      'Provide a <ul class="nav-links"> with at least four <li><a> links.',
      'Mark the current page with class "active" on one link and aria-current="page".',
      'Add a call to action link with class "nav-cta" and href="/register".',
      'Lay the bar out with flexbox and space between brand and links.',
      'Collapse the navigation into a column inside a (max-width: 640px) media query.',
      'Keep all links accessible with visible text (no empty anchors).',
    ],
    hints: [
      'display: flex with justify-content: space-between puts the brand and links on opposite sides.',
      'gap is the modern way to space flex children — no margin hacks needed.',
      'flex-direction: column inside a media query turns the row into a stacked menu.',
      'aria-current="page" tells screen readers which link is the current page.',
    ],
    starterHTML: `<header class="site-header">
  <nav class="main-nav">
    <a class="brand" href="/">LearnAI</a>
    <!-- TODO: add the primary links -->
  </nav>
</header>`,
    starterCSS: `.site-header {
  /* TODO: sticky/plain header surface */
}

.main-nav {
  /* TODO: flex row with space between */
}

.nav-links {
  /* TODO: horizontal list */
}`,
    starterJS: '',
    testCases: [
      {
        id: 'nav-structure',
        name: 'nav inside a header',
        group: 'html',
        type: 'html-selector',
        selector: 'header.site-header nav.main-nav',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'nav-brand',
        name: 'Brand link points home',
        group: 'html',
        type: 'html-attribute',
        selector: '.brand',
        attribute: 'href',
        operator: 'equals',
        value: '/',
        weight: 2,
      },
      {
        id: 'nav-link-count',
        name: 'At least four navigation links',
        group: 'html',
        type: 'html-count',
        selector: 'ul.nav-links li a',
        operator: 'min-count',
        count: 4,
        weight: 4,
        failureMessage: 'Add at least four <a> links inside <ul class="nav-links">.',
      },
      {
        id: 'nav-active-state',
        name: 'Current page marked with aria-current',
        group: 'html',
        type: 'html-attribute',
        selector: '.nav-links a.active',
        attribute: 'aria-current',
        operator: 'equals',
        value: 'page',
        weight: 3,
        failureMessage: 'Mark the active link with class="active" and aria-current="page".',
      },
      {
        id: 'nav-link-text',
        name: 'Links have visible text',
        group: 'html',
        type: 'html-text',
        selector: '.nav-links a',
        operator: 'contains',
        value: '',
        weight: 2,
      },
      {
        id: 'nav-cta',
        name: 'CTA link is present',
        group: 'html',
        type: 'html-selector',
        selector: 'a.nav-cta[href="/register"]',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'nav-css-flex',
        name: 'Bar uses flexbox with space-between',
        group: 'css',
        type: 'css-declaration',
        selector: '.main-nav',
        property: 'display',
        operator: 'equals',
        value: 'flex',
        weight: 4,
      },
      {
        id: 'nav-css-justify',
        name: 'Brand and links are pushed apart',
        group: 'css',
        type: 'css-declaration',
        selector: '.main-nav',
        property: 'justify-content',
        operator: 'equals',
        value: 'space-between',
        weight: 3,
      },
      {
        id: 'nav-css-list',
        name: 'Nav list has no bullets',
        group: 'css',
        type: 'css-declaration',
        selector: '.nav-links',
        property: 'list-style',
        operator: 'contains',
        value: 'none',
        weight: 2,
      },
      {
        id: 'nav-css-links-flex',
        name: 'Links row uses flexbox and gap',
        group: 'css',
        type: 'css-declaration',
        selector: '.nav-links',
        property: 'display',
        operator: 'equals',
        value: 'flex',
        weight: 3,
      },
      {
        id: 'nav-css-active',
        name: 'Active link is visually distinct',
        group: 'css',
        type: 'css-declaration',
        selector: '.active',
        property: 'color',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'nav-css-cta',
        name: 'CTA is a button-like pill',
        group: 'css',
        type: 'css-declaration',
        selector: '.nav-cta',
        property: 'border-radius',
        operator: 'exists',
        weight: 2,
      },
      {
        id: 'nav-responsive-media',
        name: 'Stacked layout on small screens',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.main-nav',
        property: 'flex-direction',
        operator: 'exists',
        value: 640,
        weight: 4,
        failureMessage: 'Inside @media (max-width: 640px) set .main-nav { flex-direction: column }.',
      },
      {
        id: 'nav-responsive-wrap',
        name: 'Nav links wrap instead of overflowing',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: '.nav-links',
        property: 'flex-wrap',
        operator: 'equals',
        value: 'wrap',
        weight: 3,
        failureMessage: 'Add flex-wrap: wrap to .nav-links.',
      },
      {
        id: 'nav-measure-mobile',
        name: 'Mobile layout stacks without overflow',
        group: 'functionality',
        kind: 'measure',
        type: 'viewport',
        weight: 4,
        viewport: { width: 390, height: 780 },
        failureMessage: 'At 390px the nav must stack vertically and stay inside the viewport.',
        script: `const nav = document.querySelector('.main-nav');
const links = document.querySelector('.nav-links');
const items = document.querySelectorAll('.nav-links li');
const rect = (el) => (el ? el.getBoundingClientRect() : null);
const tops = [...items].map((item) => Math.round(rect(item).top));
const distinctRows = new Set(tops).size;
return {
  navFound: Boolean(nav),
  navHeight: nav ? Math.round(rect(nav).height) : 0,
  linkRows: distinctRows,
  overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
  firstLinkVisible: items.length ? rect(items[0]).width > 0 : false,
};`,
        checks: [
          { path: 'navFound', op: 'truthy', message: 'The navigation was not found.' },
          { path: 'linkRows', op: 'gte', value: 2, message: 'Links should stack on their own rows on mobile.' },
          { path: 'overflow', op: 'lte', value: 2, message: 'The header overflows horizontally on mobile.' },
          { path: 'firstLinkVisible', op: 'truthy', message: 'Navigation links are not visible.' },
        ],
        requires: ['nav-responsive-media'],
      },
      {
        id: 'nav-quality-semantic',
        name: 'Semantic header + nav structure',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'uses-semantic-tags',
        weight: 3,
      },
      {
        id: 'nav-quality-inline',
        name: 'No inline style attributes',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'no-inline-style',
        weight: 2,
      },
    ],
  },

  {
    title: 'Product Card',
    slug: 'product-card',
    category: 'HTML',
    difficulty: 'Easy',
    order: 4,
    xp: 50,
    maxAttempts: 3,
    timeLimit: 25,
    passingScore: 70,
    tags: ['markup', 'e-commerce', 'images'],
    description:
      'Compose a product card with imagery, pricing, ratings and a call to action, using correct HTML elements.',
    instructions: [
      'Wrap everything in <article class="product-card"> with a data-sku attribute.',
      'Add a product image with class "product-image" and a meaningful alt text.',
      'Use a heading with class "product-title" for the name.',
      'Show the price inside class "product-price" using a <data> element or a <span> with the currency.',
      'Render the rating with class "product-rating" and a numeric aria-label.',
      'Add a short description paragraph with class "product-description".',
      'Add a "Add to cart" button with class "add-to-cart" and type="button".',
      'Include at least three feature points inside a <ul class="product-features">.',
    ],
    hints: [
      'data-sku="SKU-1042" keeps machine readable product data in the markup.',
      'aria-label="Rated 4.5 out of 5" makes the star rating meaningful to assistive tech.',
      'Use <data value="49.99">€49.99</data> so the price is machine readable.',
      'A card usually needs a footer for the CTA: <footer class="product-footer">.',
    ],
    starterHTML: `<div class="product-card">
  <img class="product-image" src="" alt="" />
  <h3 class="product-title">Product name</h3>
  <p class="product-price">0.00</p>
  <button>Add to cart</button>
</div>`,
    starterCSS: `.product-card {
  /* TODO: card surface */
}

.product-image {
  /* TODO: fluid image */
}

.product-footer {
  /* TODO: align price and CTA */
}`,
    starterJS: '',
    testCases: [
      {
        id: 'product-article',
        name: 'Semantic article with SKU',
        group: 'html',
        type: 'html-selector',
        selector: 'article.product-card[data-sku]',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'product-image-alt',
        name: 'Product image has descriptive alt text',
        group: 'html',
        type: 'html-attribute',
        selector: 'img.product-image',
        attribute: 'alt',
        operator: 'regex',
        pattern: '\\S{5,}',
        weight: 4,
        failureMessage: 'Describe the product in the image alt text (at least 5 characters).',
      },
      {
        id: 'product-image-src',
        name: 'Product image has a source',
        group: 'html',
        type: 'html-attribute',
        selector: 'img.product-image',
        attribute: 'src',
        operator: 'regex',
        pattern: '^(https?://|data:image/)',
        weight: 2,
      },
      {
        id: 'product-title',
        name: 'Product title heading',
        group: 'html',
        type: 'html-text',
        selector: '.product-title',
        operator: 'regex',
        pattern: '\\S',
        weight: 3,
      },
      {
        id: 'product-price',
        name: 'Price uses a data element with a numeric value',
        group: 'html',
        type: 'html-attribute',
        selector: '.product-price data',
        attribute: 'value',
        operator: 'regex',
        pattern: '^\\d+(\\.\\d+)?$',
        weight: 4,
        failureMessage: 'Wrap the price in <data value="49.99">49.99 €</data>.',
      },
      {
        id: 'product-rating',
        name: 'Rating exposes an accessible label',
        group: 'html',
        type: 'html-attribute',
        selector: '.product-rating',
        attribute: 'aria-label',
        operator: 'regex',
        pattern: '\\d',
        weight: 3,
        failureMessage: 'Add aria-label="Rated 4.5 out of 5" to .product-rating.',
      },
      {
        id: 'product-description',
        name: 'Description paragraph present',
        group: 'html',
        type: 'html-text',
        selector: '.product-description',
        operator: 'regex',
        pattern: '^[\\s\\S]{30,}$',
        weight: 2,
      },
      {
        id: 'product-cta',
        name: 'Add to cart button',
        group: 'html',
        type: 'html-selector',
        selector: 'button.add-to-cart[type="button"]',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'product-features',
        name: 'At least three feature bullets',
        group: 'html',
        type: 'html-count',
        selector: 'ul.product-features li',
        operator: 'min-count',
        count: 3,
        weight: 3,
      },
      {
        id: 'product-css-surface',
        name: 'Card surface with radius',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-card',
        property: 'border-radius',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'product-css-image',
        name: 'Image fills the card width',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-image',
        property: 'width',
        operator: 'equals',
        value: '100%',
        weight: 3,
      },
      {
        id: 'product-css-footer',
        name: 'Footer aligns price and CTA',
        group: 'css',
        type: 'css-declaration',
        selector: '.product-footer',
        property: 'display',
        operator: 'one-of',
        value: ['flex', 'grid'],
        weight: 3,
      },
      {
        id: 'product-css-cta',
        name: 'CTA has a background colour',
        group: 'css',
        type: 'css-declaration',
        selector: '.add-to-cart',
        property: 'background',
        operator: 'exists',
        weight: 2,
      },
      {
        id: 'product-responsive-image',
        name: 'Image keeps a stable aspect ratio',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: '.product-image',
        property: 'aspect-ratio',
        operator: 'exists',
        weight: 3,
        failureMessage: 'Give the image aspect-ratio: 4 / 3 (and object-fit: cover) so cards align.',
      },
      {
        id: 'product-responsive-hover',
        name: 'Card lifts on hover',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: '.product-card:hover',
        property: 'transform',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'product-measure-layout',
        name: 'Card renders correctly at desktop and mobile',
        group: 'functionality',
        kind: 'measure',
        type: 'viewport',
        weight: 4,
        viewport: { width: 1024, height: 900 },
        failureMessage: 'The image must render at its natural aspect ratio and the CTA must be clickable.',
        script: `const card = document.querySelector('article.product-card');
const image = document.querySelector('img.product-image');
const cta = document.querySelector('button.add-to-cart');
const rect = (el) => (el ? el.getBoundingClientRect() : null);
return {
  cardWidth: card ? Math.round(rect(card).width) : 0,
  imageHeight: image ? Math.round(rect(image).height) : 0,
  imageWidth: image ? Math.round(rect(image).width) : 0,
  ctaHeight: cta ? Math.round(rect(cta).height) : 0,
  imageLoaded: image ? image.complete && image.naturalWidth > 0 : false,
  overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
};`,
        checks: [
          { path: 'cardWidth', op: 'gt', value: 0, message: 'The product card did not render.' },
          { path: 'imageWidth', op: 'gt', value: 0, message: 'The product image has no width.' },
          { path: 'imageHeight', op: 'gt', value: 0, message: 'The product image has no height.' },
          { path: 'ctaHeight', op: 'gte', value: 32, message: 'The add-to-cart button is too small to tap comfortably.' },
          { path: 'overflow', op: 'lte', value: 2, message: 'The card overflows the viewport.' },
        ],
        requires: ['product-css-image'],
      },
      {
        id: 'product-quality-inline',
        name: 'No inline styles',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'no-inline-style',
        weight: 2,
      },
      {
        id: 'product-quality-semantic',
        name: 'Semantic markup used',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'uses-semantic-tags',
        weight: 3,
      },
    ],
  },
];

export default htmlChallenges;
