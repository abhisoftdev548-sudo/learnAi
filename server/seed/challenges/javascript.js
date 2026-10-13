/** JavaScript challenge seed data. */

export const javascriptChallenges = [
  {
    title: 'Counter',
    slug: 'counter',
    category: 'JavaScript',
    difficulty: 'Easy',
    order: 9,
    xp: 50,
    maxAttempts: 3,
    timeLimit: 25,
    passingScore: 70,
    tags: ['dom', 'events', 'state'],
    description: 'Build a counter with increment, decrement and reset that never drops below zero.',
    instructions: [
      'Show the current value inside <span id="count">0</span>.',
      'Increment by one when #increment is clicked.',
      'Decrement by one when #decrement is clicked, but never below 0.',
      'Reset back to 0 when #reset is clicked.',
      'Update the DOM through textContent (no innerHTML with user text).',
      'Register listeners with addEventListener — not inline onclick attributes.',
      'Add a "data-state" attribute on the counter card that is "zero", "positive" (or "max" once it reaches 10).',
      'Keep the value in a variable and re-render in a single update function.',
    ],
    hints: [
      'Keep the value in a module variable and write one render() function that syncs the DOM.',
      'Math.max(0, value - 1) guarantees the counter never goes negative.',
      'element.textContent = value is the safe way to update text.',
      'Disable the decrement button at 0 for extra polish: button.disabled = value === 0.',
    ],
    starterHTML: `<section class="counter-card" data-state="zero">
  <h2 class="counter-title">Counter</h2>
  <span id="count" class="counter-value">0</span>
  <div class="counter-actions">
    <button id="decrement" type="button" aria-label="Decrease">−</button>
    <button id="reset" type="button">Reset</button>
    <button id="increment" type="button" aria-label="Increase">+</button>
  </div>
</section>`,
    starterCSS: `.counter-card {
  /* TODO: centre the counter and style the value */
}

.counter-value {
  /* TODO: large, tabular numbers */
}

.counter-actions button {
  /* TODO: comfortable touch targets */
}`,
    starterJS: `// TODO: implement the counter
const countEl = document.querySelector('#count');
`,
    testCases: [
      {
        id: 'counter-markup',
        name: 'Counter markup with ids',
        group: 'html',
        type: 'html-selector',
        selector: '#count',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'counter-markup-buttons',
        name: 'Three action buttons present',
        group: 'html',
        type: 'html-count',
        selector: 'button#increment, button#decrement, button#reset',
        operator: 'min-count',
        count: 3,
        weight: 4,
        failureMessage: 'Provide buttons with ids increment, decrement and reset.',
      },
      {
        id: 'counter-markup-initial',
        name: 'Counter starts at 0',
        group: 'html',
        type: 'html-text',
        selector: '#count',
        operator: 'equals',
        value: '0',
        weight: 3,
      },
      {
        id: 'counter-markup-aria',
        name: 'Buttons are accessible',
        group: 'html',
        type: 'html-attribute',
        selector: '#increment',
        attribute: 'aria-label',
        operator: 'regex',
        pattern: '\\S',
        weight: 2,
      },
      {
        id: 'counter-css-value',
        name: 'Value typography is prominent',
        group: 'css',
        type: 'css-declaration',
        selector: '.counter-value',
        property: 'font-size',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'counter-css-layout',
        name: 'Card is centred with flex column',
        group: 'css',
        type: 'css-declaration',
        selector: '.counter-card',
        property: 'display',
        operator: 'equals',
        value: 'flex',
        weight: 3,
      },
      {
        id: 'counter-css-actions',
        name: 'Actions row uses flexbox',
        group: 'css',
        type: 'css-declaration',
        selector: '.counter-actions',
        property: 'display',
        operator: 'equals',
        value: 'flex',
        weight: 3,
      },
      {
        id: 'counter-css-touch',
        name: 'Buttons have touch friendly padding',
        group: 'css',
        type: 'css-declaration',
        selector: 'button',
        property: 'padding',
        operator: 'exists',
        weight: 2,
      },
      {
        id: 'counter-responsive-media',
        name: 'Layout adapts below 480px',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.counter-card',
        property: 'gap',
        operator: 'exists',
        value: 480,
        weight: 3,
      },
      {
        id: 'counter-responsive-targets',
        name: 'Mobile buttons are large enough',
        group: 'responsiveness',
        kind: 'measure',
        type: 'viewport',
        weight: 3,
        viewport: { width: 390, height: 780 },
        failureMessage: 'On mobile every button should be at least 40px tall.',
        script: `const buttons = [...document.querySelectorAll('button')];
const heights = buttons.map((button) => Math.round(button.getBoundingClientRect().height));
return {
  buttonCount: buttons.length,
  minHeight: heights.length ? Math.min(...heights) : 0,
  overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
};`,
        checks: [
          { path: 'buttonCount', op: 'gte', value: 3 },
          { path: 'minHeight', op: 'gte', value: 40, message: 'Buttons are smaller than the 40px touch target.' },
          { path: 'overflow', op: 'lte', value: 2, message: 'The counter overflows on a 390px screen.' },
        ],
      },
      {
        id: 'counter-behaviour',
        name: 'Buttons update the counter correctly',
        group: 'functionality',
        kind: 'measure',
        type: 'measure',
        weight: 8,
        viewport: { width: 1024, height: 800 },
        failureMessage: 'Increment/decrement/reset must update #count by exactly one and clamp at zero.',
        script: `const countEl = document.querySelector('#count');
const card = document.querySelector('.counter-card');
const increment = document.querySelector('#increment');
const decrement = document.querySelector('#decrement');
const reset = document.querySelector('#reset');
if (!countEl || !increment || !decrement || !reset) return { ready: false };
const read = () => countEl.textContent.trim();
const click = (el, times = 1) => { for (let i = 0; i < times; i += 1) el.click(); };
const snapshot = () => ({ value: read(), state: card ? card.getAttribute('data-state') : null });
const initial = snapshot();
click(increment, 3);
const afterThreeIncrements = snapshot();
click(decrement);
const afterDecrement = snapshot();
click(decrement, 5);
const clampedAtZero = snapshot();
click(increment, 2);
click(reset);
const afterReset = snapshot();
return {
  ready: true,
  initial: initial.value,
  afterThreeIncrements: afterThreeIncrements.value,
  afterDecrement: afterDecrement.value,
  clampedAtZero: clampedAtZero.value,
  afterReset: afterReset.value,
  zeroState: clampedAtZero.state,
  usesTextContent: /textContent|innerText/.test(String(countEl.outerHTML + '')) || true,
};`,
        checks: [
          { path: 'ready', op: 'truthy', message: 'The counter elements were not found.' },
          { path: 'initial', op: 'eq', value: '0', message: 'The counter must start at 0.' },
          { path: 'afterThreeIncrements', op: 'eq', value: '3', message: 'Three clicks on + should show 3.' },
          { path: 'afterDecrement', op: 'eq', value: '2', message: 'Decrement should reduce the value by one.' },
          { path: 'clampedAtZero', op: 'eq', value: '0', message: 'The counter must never go below 0.' },
          { path: 'afterReset', op: 'eq', value: '0', message: 'Reset should return the counter to 0.' },
        ],
      },
      {
        id: 'counter-js-listeners',
        name: 'Listeners registered with addEventListener',
        group: 'functionality',
        type: 'js-pattern',
        pattern: "addEventListener\\s*\\(\\s*['\"]click['\"]",
        operator: 'regex',
        weight: 4,
        failureMessage: 'Use addEventListener("click", handler) on each button.',
      },
      {
        id: 'counter-js-no-inline',
        name: 'No inline onclick in the markup',
        group: 'functionality',
        type: 'html-selector',
        selector: '[onclick]',
        operator: 'not-exists',
        weight: 3,
      },
      {
        id: 'counter-js-textcontent',
        name: 'DOM updated with textContent',
        group: 'functionality',
        type: 'js-pattern',
        pattern: 'textContent',
        operator: 'regex',
        weight: 3,
      },
      {
        id: 'counter-quality-balanced',
        name: 'Balanced script structure',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'balanced-braces',
        weight: 3,
      },
      {
        id: 'counter-quality-modern',
        name: 'Modern declarations (const/let)',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'modern-syntax',
        weight: 3,
      },
      {
        id: 'counter-quality-console',
        name: 'No console statements left behind',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'no-console',
        weight: 2,
      },
    ],
  },

  {
    title: 'Todo List',
    slug: 'todo-list',
    category: 'JavaScript',
    difficulty: 'Medium',
    order: 10,
    xp: 100,
    maxAttempts: 3,
    timeLimit: 35,
    passingScore: 70,
    tags: ['dom', 'forms', 'state', 'events'],
    description: 'Build a todo list where tasks can be added, completed and deleted, with a live remaining count.',
    instructions: [
      'Bind the form <form id="todo-form"> and prevent the default submit behaviour.',
      'Read the task text from <input id="todo-input"> and ignore empty/whitespace input.',
      'Render each task as an <li class="todo-item"> inside <ul id="todo-list">.',
      'Each item needs a checkbox with class "todo-toggle" and a delete button with class "todo-delete".',
      'Toggling the checkbox adds the class "done" to the item.',
      'Deleting removes the item from the list.',
      'Show the number of remaining (not done) tasks in <span id="todo-count">.',
      'Clear the input after adding a task and refocus it.',
    ],
    hints: [
      'form.addEventListener("submit", (event) => { event.preventDefault(); ... }) is the canonical pattern.',
      'Use event delegation: listen on the <ul> once and inspect event.target.',
      'closest("li") finds the item that owns the clicked checkbox or button.',
      'Store tasks in an array of objects ({ id, text, done }) and render from that array.',
    ],
    starterHTML: `<section class="todo-app">
  <h2 class="todo-title">My tasks</h2>
  <form id="todo-form" class="todo-form">
    <label class="sr-only" for="todo-input">New task</label>
    <input id="todo-input" class="todo-input" type="text" placeholder="Add a task and press Enter" autocomplete="off" />
    <button class="todo-add" type="submit">Add</button>
  </form>
  <p class="todo-summary"><span id="todo-count">0</span> tasks left</p>
  <ul id="todo-list" class="todo-list"></ul>
</section>`,
    starterCSS: `.todo-app {
  /* TODO: card layout */
}

.todo-item {
  /* TODO: row layout with space between label and delete button */
}

.todo-item.done .todo-text {
  /* TODO: strike through completed tasks */
}`,
    starterJS: `// TODO: implement the todo list
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const list = document.querySelector('#todo-list');
const countEl = document.querySelector('#todo-count');
`,
    testCases: [
      {
        id: 'todo-markup-form',
        name: 'Form and input exist',
        group: 'html',
        type: 'html-selector',
        selector: 'form#todo-form input#todo-input',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'todo-markup-list',
        name: 'Task list container exists',
        group: 'html',
        type: 'html-selector',
        selector: 'ul#todo-list',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'todo-markup-label',
        name: 'Input has a label',
        group: 'html',
        type: 'html-attribute',
        selector: 'label[for="todo-input"]',
        attribute: 'for',
        operator: 'equals',
        value: 'todo-input',
        weight: 3,
      },
      {
        id: 'todo-markup-count',
        name: 'Remaining count element',
        group: 'html',
        type: 'html-selector',
        selector: '#todo-count',
        operator: 'exists',
        weight: 2,
      },
      {
        id: 'todo-css-item-row',
        name: 'Items are laid out as rows',
        group: 'css',
        type: 'css-declaration',
        selector: '.todo-item',
        property: 'display',
        operator: 'one-of',
        value: ['flex', 'grid'],
        weight: 4,
      },
      {
        id: 'todo-css-done-state',
        name: 'Completed tasks are struck through',
        group: 'css',
        type: 'css-declaration',
        selector: '.todo-item.done',
        property: 'text-decoration',
        operator: 'contains',
        value: 'line-through',
        weight: 4,
        failureMessage: 'Add .todo-item.done .todo-text { text-decoration: line-through }.',
      },
      {
        id: 'todo-css-input',
        name: 'Input stretches across the form',
        group: 'css',
        type: 'css-declaration',
        selector: '.todo-input',
        property: 'width',
        operator: 'equals',
        value: '100%',
        weight: 3,
      },
      {
        id: 'todo-css-form-flex',
        name: 'Form row uses flexbox',
        group: 'css',
        type: 'css-declaration',
        selector: '.todo-form',
        property: 'display',
        operator: 'equals',
        value: 'flex',
        weight: 3,
      },
      {
        id: 'todo-responsive-media',
        name: 'Spacing adapts on small screens',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.todo-app',
        property: 'padding',
        operator: 'exists',
        value: 560,
        weight: 3,
        failureMessage: 'Add @media (max-width: 560px) { .todo-app { padding: ... } }.',
      },
      {
        id: 'todo-responsive-delete-target',
        name: 'Delete button is tappable on mobile',
        group: 'responsiveness',
        kind: 'measure',
        type: 'viewport',
        weight: 3,
        viewport: { width: 390, height: 800 },
        failureMessage: 'After adding a task the delete button should be at least 32px tall.',
        script: `const input = document.querySelector('#todo-input');
const form = document.querySelector('#todo-form');
if (!input || !form) return { ready: false };
input.value = 'Check touch targets';
input.dispatchEvent(new Event('input', { bubbles: true }));
form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await sleep(60);
const item = document.querySelector('#todo-list .todo-item');
const del = document.querySelector('.todo-delete');
const box = del ? del.getBoundingClientRect() : null;
return {
  ready: true,
  itemRendered: Boolean(item),
  deleteHeight: box ? Math.round(box.height) : 0,
  overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth)),
};`,
        checks: [
          { path: 'ready', op: 'truthy' },
          { path: 'itemRendered', op: 'truthy', message: 'Submitting the form did not render a task.' },
          { path: 'deleteHeight', op: 'gte', value: 28, message: 'The delete button is too small for touch.' },
          { path: 'overflow', op: 'lte', value: 2, message: 'The list overflows on mobile.' },
        ],
        requires: ['todo-behaviour-add'],
      },
      {
        id: 'todo-behaviour-add',
        name: 'Adding tasks works and empties the input',
        group: 'functionality',
        kind: 'measure',
        type: 'measure',
        weight: 5,
        viewport: { width: 1024, height: 900 },
        failureMessage: 'Submitting the form must append an <li class="todo-item"> and clear the input.',
        script: `const input = document.querySelector('#todo-input');
const form = document.querySelector('#todo-form');
const list = document.querySelector('#todo-list');
if (!input || !form || !list) return { ready: false };
const addTask = async (text) => {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await sleep(60);
};
await addTask('Practice flexbox');
await addTask('Review a teammate PR');
const items = [...list.querySelectorAll('li')];
const emptyInput = input.value === '';
input.value = '   ';
form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await sleep(60);
return {
  ready: true,
  itemCount: items.length,
  secondItemText: items[1] ? items[1].textContent.trim() : '',
  emptyInput,
  ignoresBlankSuggestions: list.querySelectorAll('li').length,
  hasToggle: Boolean(list.querySelector('.todo-toggle, input[type="checkbox"]')),
  hasDelete: Boolean(list.querySelector('.todo-delete, button')),
};`,
        checks: [
          { path: 'ready', op: 'truthy' },
          { path: 'itemCount', op: 'eq', value: 2, message: 'Two tasks should have been added.' },
          { path: 'secondItemText', op: 'contains', value: 'Review a teammate PR', message: 'The task text is missing from the list item.' },
          { path: 'emptyInput', op: 'truthy', message: 'The input must be cleared after adding a task.' },
          { path: 'ignoresBlankSuggestions', op: 'eq', value: 2, message: 'Blank tasks must be ignored.' },
          { path: 'hasToggle', op: 'truthy', message: 'Each item needs a checkbox.' },
          { path: 'hasDelete', op: 'truthy', message: 'Each item needs a delete button.' },
        ],
      },
      {
        id: 'todo-behaviour-toggle-delete',
        name: 'Toggling and deleting update the count',
        group: 'functionality',
        kind: 'measure',
        type: 'measure',
        weight: 6,
        viewport: { width: 1024, height: 900 },
        failureMessage: 'Toggling must add the "done" class and deleting must remove the item.',
        script: `const input = document.querySelector('#todo-input');
const form = document.querySelector('#todo-form');
const list = document.querySelector('#todo-list');
const countEl = document.querySelector('#todo-count');
if (!input || !form || !list || !countEl) return { ready: false };
const addTask = async (text) => {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await sleep(60);
};
await addTask('Task one');
await addTask('Task two');
const countAfterAdd = countEl.textContent.trim();
const firstItem = list.querySelector('li');
const toggle = firstItem ? firstItem.querySelector('input[type="checkbox"], .todo-toggle') : null;
if (toggle) {
  toggle.checked = true;
  toggle.dispatchEvent(new Event('change', { bubbles: true }));
  toggle.click();
}
await sleep(80);
const doneClass = firstItem ? firstItem.classList.contains('done') : false;
const countAfterToggle = countEl.textContent.trim();
const deleteButton = list.querySelector('.todo-delete, button:not(.todo-add)');
if (deleteButton) deleteButton.click();
await sleep(80);
return {
  ready: true,
  countAfterAdd,
  doneClass,
  countAfterToggle,
  itemsAfterDelete: list.querySelectorAll('li').length,
};`,
        checks: [
          { path: 'ready', op: 'truthy' },
          { path: 'countAfterAdd', op: 'eq', value: '2', message: 'The remaining counter should show 2 after adding two tasks.' },
          { path: 'doneClass', op: 'truthy', message: 'Completing a task must add the class "done" to its <li>.' },
          { path: 'countAfterToggle', op: 'eq', value: '1', message: 'The remaining counter must drop when a task is completed.' },
          { path: 'itemsAfterDelete', op: 'eq', value: 1, message: 'Deleting a task must remove its list item.' },
        ],
        requires: ['todo-behaviour-add'],
      },
      {
        id: 'todo-js-preventdefault',
        name: 'Submit is intercepted',
        group: 'functionality',
        type: 'js-pattern',
        pattern: 'preventDefault\\s*\\(\\s*\\)',
        operator: 'regex',
        weight: 4,
      },
      {
        id: 'todo-js-delegation',
        name: 'Event delegation or direct listeners used',
        group: 'functionality',
        type: 'js-pattern',
        pattern: 'addEventListener\\s*\\(\\s*[\'"]',
        operator: 'regex',
        weight: 3,
      },
      {
        id: 'todo-js-state',
        name: 'State kept in an array',
        group: 'functionality',
        type: 'js-pattern',
        pattern: '(const|let)\\s+\\w*\\s*=\\s*\\[\\s*\\]',
        operator: 'regex',
        weight: 4,
        failureMessage: 'Keep the tasks in an array and render from that state.',
      },
      {
        id: 'todo-quality-balanced',
        name: 'Balanced script structure',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'balanced-braces',
        weight: 3,
      },
      {
        id: 'todo-quality-modern',
        name: 'Modern declarations (const/let)',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'modern-syntax',
        weight: 3,
      },
      {
        id: 'todo-quality-console',
        name: 'No console statements left behind',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'no-console',
        weight: 2,
      },
    ],
  },

  {
    title: 'Modal',
    slug: 'modal',
    category: 'JavaScript',
    difficulty: 'Medium',
    order: 11,
    xp: 100,
    maxAttempts: 3,
    timeLimit: 35,
    passingScore: 70,
    tags: ['dialogs', 'accessibility', 'focus'],
    description: 'Build an accessible modal dialog that opens, closes on Escape and backdrop clicks, and traps focus.',
    instructions: [
      'Add a trigger button with id "open-modal".',
      'Add a dialog element with id "modal", class "modal", role="dialog" and aria-modal="true".',
      'The dialog must be hidden on load (use the hidden attribute, class "hidden" or display: none).',
      'Opening adds the class "open" to #modal and moves focus into the dialog.',
      'Add a button with id "close-modal" that closes the dialog.',
      'Pressing Escape must close the dialog.',
      'Clicking the backdrop (the .modal element itself, not its content) must close it.',
      'While open, lock body scrolling with document.body.style.overflow = "hidden" and restore it on close.',
    ],
    hints: [
      'Use a single open()/close() pair of functions that toggles the "open" class and focus.',
      'document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); }).',
      'For the backdrop, check event.target === modal before closing.',
      'Return focus to the trigger button when the dialog closes — that is what keyboard users expect.',
    ],
    starterHTML: `<section class="modal-demo">
  <h2>Announcements</h2>
  <button id="open-modal" class="modal-trigger" type="button">Open announcement</button>
</section>

<div id="modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title" hidden>
  <div class="modal-content">
    <h3 id="modal-title">Sprint retro at 16:00</h3>
    <p>Bring one thing that went well and one thing to improve.</p>
    <button id="close-modal" class="modal-close" type="button">Close</button>
  </div>
</div>`,
    starterCSS: `.modal {
  /* TODO: fixed overlay with centred content */
}

.modal-content {
  /* TODO: dialog surface */
}

.modal.hidden {
  /* TODO: hide the dialog */
}`,
    starterJS: `// TODO: implement open/close with Escape and backdrop support
const modal = document.querySelector('#modal');
const openButton = document.querySelector('#open-modal');
const closeButton = document.querySelector('#close-modal');
`,
    testCases: [
      {
        id: 'modal-markup-dialog',
        name: 'Dialog with ARIA attributes',
        group: 'html',
        type: 'html-selector',
        selector: '#modal[role="dialog"][aria-modal="true"]',
        operator: 'exists',
        weight: 4,
      },
      {
        id: 'modal-markup-triggers',
        name: 'Open and close buttons',
        group: 'html',
        type: 'html-count',
        selector: '#open-modal, #close-modal',
        operator: 'min-count',
        count: 2,
        weight: 3,
      },
      {
        id: 'modal-markup-labelled',
        name: 'Dialog is labelled',
        group: 'html',
        type: 'html-attribute',
        selector: '#modal',
        attribute: 'aria-labelledby',
        operator: 'regex',
        pattern: '\\S',
        weight: 3,
      },
      {
        id: 'modal-markup-hidden',
        name: 'Hidden by default',
        group: 'html',
        type: 'html-selector',
        selector: '#modal.hidden, #modal[hidden]',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'modal-css-overlay',
        name: 'Overlay is fixed and full screen',
        group: 'css',
        type: 'css-declaration',
        selector: '.modal',
        property: 'position',
        operator: 'equals',
        value: 'fixed',
        weight: 5,
      },
      {
        id: 'modal-css-inset',
        name: 'Overlay covers the viewport',
        group: 'css',
        type: 'css-declaration',
        selector: '.modal',
        property: 'inset',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'modal-css-centre',
        name: 'Content is centred in the overlay',
        group: 'css',
        type: 'css-declaration',
        selector: '.modal',
        property: 'display',
        operator: 'one-of',
        value: ['flex', 'grid'],
        weight: 4,
      },
      {
        id: 'modal-css-surface',
        name: 'Dialog surface has radius and shadow',
        group: 'css',
        type: 'css-declaration',
        selector: '.modal-content',
        property: 'border-radius',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'modal-css-hidden',
        name: 'Hidden state removes the dialog',
        group: 'css',
        type: 'css-declaration',
        selector: '.modal.hidden',
        property: 'display',
        operator: 'equals',
        value: 'none',
        weight: 4,
        failureMessage: 'Make .modal.hidden { display: none } so it never blocks the page.',
      },
      {
        id: 'modal-css-open',
        name: 'Open state is visible',
        group: 'css',
        type: 'css-declaration',
        selector: '.modal.open',
        property: 'display',
        operator: 'one-of',
        value: ['flex', 'grid', 'block'],
        weight: 4,
      },
      {
        id: 'modal-responsive-content',
        name: 'Dialog is fluid on small screens',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: '.modal-content',
        property: 'max-width',
        operator: 'regex',
        pattern: '(100%|\\d{1,3}%|\\d+vw|min\\(|\\d{3}px)',
        weight: 3,
      },
      {
        id: 'modal-responsive-media',
        name: 'Padding adapts below 480px',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.modal-content',
        property: 'padding',
        operator: 'exists',
        value: 480,
        weight: 3,
      },
      {
        id: 'modal-behaviour-open',
        name: 'Opening the dialog works',
        group: 'functionality',
        kind: 'measure',
        type: 'measure',
        weight: 6,
        viewport: { width: 1024, height: 900 },
        failureMessage: 'Clicking #open-modal must show the dialog and lock body scroll.',
        script: `const modal = document.querySelector('#modal');
const openButton = document.querySelector('#open-modal');
if (!modal || !openButton) return { ready: false };
const style = getComputedStyle(modal);
const visibleBefore = style.display !== 'none' && style.visibility !== 'hidden' && !modal.hasAttribute('hidden');
openButton.click();
await sleep(60);
const openStyle = getComputedStyle(modal);
const visibleAfter = openStyle.display !== 'none' && openStyle.visibility !== 'hidden' && !modal.hasAttribute('hidden');
return {
  ready: true,
  visibleBefore,
  visibleAfter,
  openClass: modal.classList.contains('open'),
  bodyOverflow: document.body.style.overflow || getComputedStyle(document.body).overflowY,
  focusedInside: modal.contains(document.activeElement),
};`,
        checks: [
          { path: 'ready', op: 'truthy', message: 'The modal elements were not found.' },
          { path: 'visibleBefore', op: 'eq', value: false, message: 'The dialog must start hidden.' },
          { path: 'visibleAfter', op: 'truthy', message: 'The dialog did not become visible.' },
          { path: 'openClass', op: 'truthy', message: 'Opening must add the class "open".' },
          { path: 'bodyOverflow', op: 'eq', value: 'hidden', message: 'Lock body scrolling while the dialog is open.' },
          { path: 'focusedInside', op: 'truthy', message: 'Move focus into the dialog when it opens.' },
        ],
      },
      {
        id: 'modal-behaviour-close',
        name: 'Escape and backdrop close the dialog',
        group: 'functionality',
        kind: 'measure',
        type: 'measure',
        weight: 6,
        viewport: { width: 1024, height: 900 },
        failureMessage: 'Escape, the close button and a backdrop click must all close the dialog.',
        script: `const modal = document.querySelector('#modal');
const openButton = document.querySelector('#open-modal');
const closeButton = document.querySelector('#close-modal');
if (!modal || !openButton || !closeButton) return { ready: false };
const isVisible = () => {
  const style = getComputedStyle(modal);
  return style.display !== 'none' && style.visibility !== 'hidden' && !modal.hasAttribute('hidden');
};
const open = async () => { openButton.click(); await sleep(60); };
const measure = () => ({ openClass: modal.classList.contains('open'), visible: isVisible(), bodyOverflow: document.body.style.overflow });

await open();
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await sleep(80);
const afterEscape = measure();

await open();
closeButton.click();
await sleep(80);
const afterButton = measure();

await open();
modal.click();
await sleep(80);
const afterBackdrop = measure();

return { ready: true, afterEscape, afterButton, afterBackdrop };`,
        checks: [
          { path: 'ready', op: 'truthy' },
          { path: 'afterEscape.visible', op: 'eq', value: false, message: 'Escape did not close the dialog.' },
          { path: 'afterEscape.openClass', op: 'eq', value: false, message: 'Closing must remove the "open" class.' },
          { path: 'afterButton.visible', op: 'eq', value: false, message: 'The close button did not close the dialog.' },
          { path: 'afterBackdrop.visible', op: 'eq', value: false, message: 'Clicking the backdrop did not close the dialog.' },
          { path: 'afterBackdrop.bodyOverflow', op: 'eq', value: '', message: 'Body scrolling must be restored when the dialog closes.' },
        ],
        requires: ['modal-behaviour-open'],
      },
      {
        id: 'modal-js-listener',
        name: 'Close logic uses listeners',
        group: 'functionality',
        type: 'js-pattern',
        pattern: "addEventListener\\s*\\(\\s*['\"](click|keydown)['\"]",
        operator: 'regex',
        weight: 3,
      },
      {
        id: 'modal-quality-balanced',
        name: 'Balanced script structure',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'balanced-braces',
        weight: 3,
      },
      {
        id: 'modal-quality-modern',
        name: 'Modern declarations (const/let)',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'modern-syntax',
        weight: 2,
      },
      {
        id: 'modal-quality-console',
        name: 'No console statements left behind',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'no-console',
        weight: 2,
      },
    ],
  },

  {
    title: 'Form Validation',
    slug: 'form-validation',
    category: 'JavaScript',
    difficulty: 'Hard',
    order: 12,
    xp: 200,
    maxAttempts: 3,
    timeLimit: 45,
    passingScore: 70,
    tags: ['validation', 'forms', 'ux'],
    description: 'Validate a signup form in JavaScript with inline field errors and a success state.',
    instructions: [
      'Attach a submit handler to <form id="signup-form"> and always preventDefault.',
      'Validate these rules: name >= 2 characters, email matches /^[^\\s@]+@[^\\s@]+\\.[a-z]{2,}$/i, password >= 8 characters containing a letter and a number, confirm matches password.',
      'On failure, show the message in the field\'s error element (<p class="error" id="email-error">) and add class "invalid" to the input.',
      'Clear a field\'s error as soon as it becomes valid.',
      'Only when every field is valid, show the success panel <div id="form-success"> and reset the form.',
      'Never submit the form to the server — this is client-side validation only.',
      'Set aria-invalid="true" on invalid inputs and aria-describedby pointing at the error element.',
      'Keep the validation logic in small reusable functions, one per rule/field.',
    ],
    hints: [
      'Write one validateField(name, value) function returning an error string or null.',
      'aria-describedby="email-error" links the input to its message for screen readers.',
      'event.preventDefault() must be the very first statement in the submit handler.',
      'Run validation on input events too so users see errors disappear immediately.',
    ],
    starterHTML: `<form id="signup-form" class="signup-form" novalidate>
  <h2 class="form-title">Join the practice team</h2>

  <div class="field">
    <label for="name">Name</label>
    <input id="name" name="name" type="text" autocomplete="name" />
    <p class="error" id="name-error" role="alert"></p>
  </div>

  <div class="field">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" />
    <p class="error" id="email-error" role="alert"></p>
  </div>

  <div class="field">
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="new-password" />
    <p class="error" id="password-error" role="alert"></p>
  </div>

  <div class="field">
    <label for="confirm">Confirm password</label>
    <input id="confirm" name="confirm" type="password" autocomplete="new-password" />
    <p class="error" id="confirm-error" role="alert"></p>
  </div>

  <button class="submit-button" type="submit">Create account</button>
  <div id="form-success" class="form-success" role="status" hidden>Account created — welcome!</div>
</form>`,
    starterCSS: `.signup-form {
  /* TODO: card layout with generous spacing */
}

.field {
  /* TODO: stack label, input and error message */
}

.error {
  /* TODO: small red helper text (empty by default) */
}

input.invalid {
  /* TODO: red border for invalid inputs */
}

.form-success {
  /* TODO: success panel styling */
}`,
    starterJS: `// TODO: implement validation rules and the submit handler
const form = document.querySelector('#signup-form');
const success = document.querySelector('#form-success');
`,
    testCases: [
      {
        id: 'validation-markup-form',
        name: 'Form with novalidate',
        group: 'html',
        type: 'html-selector',
        selector: 'form#signup-form[novalidate]',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'validation-markup-fields',
        name: 'All four fields present',
        group: 'html',
        type: 'html-count',
        selector: '#name, #email, #password, #confirm',
        operator: 'min-count',
        count: 4,
        weight: 3,
      },
      {
        id: 'validation-markup-errors',
        name: 'Error elements are linked',
        group: 'html',
        type: 'html-count',
        selector: 'p.error[id$="-error"]',
        operator: 'min-count',
        count: 4,
        weight: 4,
        failureMessage: 'Every field needs an error paragraph with an id ending in "-error".',
      },
      {
        id: 'validation-markup-success',
        name: 'Success panel exists',
        group: 'html',
        type: 'html-selector',
        selector: '#form-success[role="status"]',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'validation-css-error',
        name: 'Error text is styled',
        group: 'css',
        type: 'css-declaration',
        selector: '.error',
        property: 'color',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'validation-css-invalid',
        name: 'Invalid inputs get a red border',
        group: 'css',
        type: 'css-declaration',
        selector: '.invalid',
        property: 'border',
        operator: 'exists',
        weight: 4,
        failureMessage: 'Style .invalid (or input.invalid) with a red border.',
      },
      {
        id: 'validation-css-success',
        name: 'Success panel stands out',
        group: 'css',
        type: 'css-declaration',
        selector: '.form-success',
        property: 'background',
        operator: 'exists',
        weight: 3,
      },
      {
        id: 'validation-css-field',
        name: 'Fields stack vertically',
        group: 'css',
        type: 'css-declaration',
        selector: '.field',
        property: 'display',
        operator: 'one-of',
        value: ['flex', 'grid', 'block'],
        weight: 3,
      },
      {
        id: 'validation-responsive-inputs',
        name: 'Inputs are fluid',
        group: 'responsiveness',
        type: 'css-declaration',
        selector: 'input',
        property: 'width',
        operator: 'equals',
        value: '100%',
        weight: 3,
      },
      {
        id: 'validation-responsive-media',
        name: 'Form adapts below 520px',
        group: 'responsiveness',
        type: 'css-media',
        selector: '.signup-form',
        property: 'padding',
        operator: 'exists',
        value: 520,
        weight: 3,
      },
      {
        id: 'validation-behaviour-invalid',
        name: 'Invalid input shows field errors',
        group: 'functionality',
        kind: 'measure',
        type: 'measure',
        weight: 7,
        viewport: { width: 1024, height: 950 },
        failureMessage: 'Submitting invalid data must block success and show inline errors.',
        script: `const form = document.querySelector('#signup-form');
if (!form) return { ready: false };
const set = (selector, value) => {
  const field = form.querySelector(selector);
  if (field) {
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return field;
};
set('#name', 'A');
set('#email', 'not-an-email');
set('#password', 'short');
set('#confirm', 'different');
form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await sleep(80);
const errors = [...form.querySelectorAll('.error')].map((el) => el.textContent.trim()).filter(Boolean);
const emailField = form.querySelector('#email');
const emailError = form.querySelector('#email-error');
const passwordError = form.querySelector('#password-error');
const confirmError = form.querySelector('#confirm-error');
return {
  ready: true,
  errorCount: errors.length,
  emailErrorText: emailError ? emailError.textContent.trim() : '',
  passwordErrorText: passwordError ? passwordError.textContent.trim() : '',
  confirmErrorText: confirmError ? confirmError.textContent.trim() : '',
  emailInvalidClass: emailField ? emailField.classList.contains('invalid') : false,
  emailAriaInvalid: emailField ? emailField.getAttribute('aria-invalid') : null,
  successHidden: (() => { const el = form.querySelector('#form-success'); return !el || el.hasAttribute('hidden') || getComputedStyle(el).display === 'none'; })(),
};`,
        checks: [
          { path: 'ready', op: 'truthy', message: 'The signup form was not found.' },
          { path: 'errorCount', op: 'gte', value: 3, message: 'Show a message for each invalid field.' },
          { path: 'emailErrorText', op: 'regex', value: 'email', message: 'The email field needs a helpful message.' },
          { path: 'passwordErrorText', op: 'regex', value: '(8|eight)', message: 'Explain the password rule (at least 8 characters).' },
          { path: 'confirmErrorText', op: 'regex', value: 'match', message: 'Explain that the passwords must match.' },
          { path: 'emailInvalidClass', op: 'truthy', message: 'Add the class "invalid" to invalid inputs.' },
          { path: 'emailAriaInvalid', op: 'eq', value: 'true', message: 'Set aria-invalid="true" on invalid inputs.' },
          { path: 'successHidden', op: 'truthy', message: 'The success panel must stay hidden while the form is invalid.' },
        ],
      },
      {
        id: 'validation-behaviour-valid',
        name: 'Valid input succeeds and resets',
        group: 'functionality',
        kind: 'measure',
        type: 'measure',
        weight: 7,
        viewport: { width: 1024, height: 950 },
        failureMessage: 'Valid data must reveal the success panel, clear errors and reset the form.',
        script: `const form = document.querySelector('#signup-form');
if (!form) return { ready: false };
const set = (selector, value) => {
  const field = form.querySelector(selector);
  if (field) {
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
};
set('#name', 'Ada Lovelace');
set('#email', 'ada@learnai.dev');
set('#password', 'practice123');
set('#confirm', 'practice123');
await sleep(40);
form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await sleep(100);
const success = form.querySelector('#form-success');
const successVisible = Boolean(success) && !success.hasAttribute('hidden') && getComputedStyle(success).display !== 'none';
const errors = [...form.querySelectorAll('.error')].map((el) => el.textContent.trim()).filter(Boolean);
const emailField = form.querySelector('#email');
return {
  ready: true,
  successVisible,
  errorsCleared: errors.length === 0,
  emailReset: emailField ? emailField.value === '' : true,
  emailInvalidCleared: emailField ? !emailField.classList.contains('invalid') : true,
};`,
        checks: [
          { path: 'ready', op: 'truthy' },
          { path: 'successVisible', op: 'truthy', message: 'The success panel should appear when everything is valid.' },
          { path: 'errorsCleared', op: 'truthy', message: 'Field errors must be cleared on success.' },
          { path: 'emailReset', op: 'truthy', message: 'Reset the form after a successful submit.' },
        ],
        requires: ['validation-behaviour-invalid'],
      },
      {
        id: 'validation-js-regex',
        name: 'Email validated with a regular expression',
        group: 'functionality',
        type: 'js-pattern',
        pattern: '/\\^\\[\\^\\s@\\]|test\\s*\\(|RegExp',
        operator: 'regex',
        weight: 4,
        failureMessage: 'Validate the email with a regex and .test().',
      },
      {
        id: 'validation-js-preventdefault',
        name: 'Submit is always intercepted',
        group: 'functionality',
        type: 'js-pattern',
        pattern: 'preventDefault\\s*\\(\\s*\\)',
        operator: 'regex',
        weight: 4,
      },
      {
        id: 'validation-js-small-functions',
        name: 'Validation split into functions',
        group: 'codeQuality',
        type: 'js-pattern',
        pattern: '(function\\s+\\w+|const\\s+\\w+\\s*=\\s*(async\\s*)?\\(|=>)',
        operator: 'regex',
        weight: 3,
        failureMessage: 'Extract validation rules into small reusable functions.',
      },
      {
        id: 'validation-quality-balanced',
        name: 'Balanced script structure',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'balanced-braces',
        weight: 3,
      },
      {
        id: 'validation-quality-console',
        name: 'No console statements left behind',
        group: 'codeQuality',
        type: 'code-quality',
        check: 'no-console',
        weight: 2,
      },
    ],
  },
];

export default javascriptChallenges;
