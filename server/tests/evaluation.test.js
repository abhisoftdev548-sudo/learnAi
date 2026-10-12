import { describe, it, expect } from 'vitest';
import { evaluateSubmission } from '../services/evaluationService.js';
import { challenge, submission, register } from '../utils/validation.js';
import { challenges } from '../seed/data.js';
const code = (htmlCode = '', cssCode = '', jsCode = '') => ({ htmlCode, cssCode, jsCode });
const run = (title, input) => evaluateSubmission(challenges.find(c => c.title === title), input);
describe('static evaluation', () => {
  it('validates HTML structure and accessible attributes', async () => {
    const result = await run('Profile Card', code('<article class="profile"><h1>A</h1><p>Bio</p><img alt="Portrait" src="a.jpg"><a href="mailto:a@b.com">Contact</a></article>'));
    expect(result).toMatchObject({ score: 100, status: 'passed', totalTests: 5 });
  });
  it('does not accept HTML in comments', async () => { expect((await run('Product Card', code('<!-- <article class="product"><h2>A</h2></article> -->'))).score).toBe(0); });
  it('checks CSS declarations and media context', async () => {
    const valid = '.products {display:grid;grid-template-columns:repeat(3, 1fr);gap:1rem;} @media (max-width: 600px) {.products {grid-template-columns:1fr;}}';
    expect((await run('Responsive Product Grid', code('', valid))).score).toBe(100);
    expect((await run('Responsive Product Grid', code('', '.products {grid-template-columns:1fr}'))).score).toBe(0);
  });
  it('rejects malformed CSS and JS without crashing', async () => {
    expect((await run('Center the Card', code('', '.stage{'))).status).toBe('failed');
    expect((await run('Counter', code('', '', 'const ='))).testsPassed).toBe(0);
  });
  it('does not treat JS comments and strings as executed syntax', async () => {
    const result = await run('Modal', code('', '', '// x.showModal(); x.close();\n"addEventListener()";'));
    expect(result.testsPassed).toBe(0);
  });
  it('never executes submitted JavaScript', async () => {
    delete globalThis.submittedCodeExecuted;
    await run('Counter', code('', '', 'globalThis.submittedCodeExecuted = true; while(true) {}'));
    expect(globalThis.submittedCodeExecuted).toBeUndefined();
  });
  it('accepts AST calls but makes no behavioral claim', async () => {
    const result = await run('Counter', code('<button id="increment"></button><output id="count"></output>', '', 'let count=0; button.addEventListener("click",()=>{count++; output.textContent=count;});'));
    expect(result.status).toBe('passed'); expect(result.evaluationMode).toBe('static-v1');
  });
});
describe('input and seed validation', () => {
  it('contains 12 complete valid seed challenges', () => {
    expect(challenges).toHaveLength(12);
    for (const { slug, ...data } of challenges) { expect(slug).toBeTruthy(); expect(challenge.safeParse(data).success).toBe(true); }
    for (const category of ['HTML', 'CSS', 'JavaScript']) expect(challenges.filter(c => c.category === category)).toHaveLength(4);
  });
  it('rejects client scores, XP and forged test results', () => {
    const base = { challengeId: 'a'.repeat(24), htmlCode: '<p>A</p>' };
    expect(submission.safeParse(base).success).toBe(true);
    for (const key of ['score', 'xpEarned', 'testsPassed', 'testResults', 'userId']) expect(submission.safeParse({ ...base, [key]: 100 }).success).toBe(false);
  });
  it('rejects empty and oversized submissions', () => {
    expect(submission.safeParse({ challengeId: 'a'.repeat(24) }).success).toBe(false);
    expect(submission.safeParse({ challengeId: 'a'.repeat(24), jsCode: 'a'.repeat(50001) }).success).toBe(false);
  });
  it('rejects privilege injection and bcrypt-truncated passwords', () => {
    const input = { name: 'A', username: 'alice', email: 'a@example.com', password: 'correct-horse-battery' };
    expect(register.safeParse({ ...input, role: 'admin' }).success).toBe(false);
    expect(register.safeParse({ ...input, password: '😀'.repeat(20) }).success).toBe(false);
  });
});

describe('every seeded challenge has a passing reference solution', () => {
  const fixtures = [
    ['Profile Card', code('<article class="profile"><h1>A</h1><p>Bio</p><img alt="Portrait"><a href="mailto:a@b.com">Email</a></article>')],
    ['Registration Form', code('<form id="registration"><label for="email">Email</label><input id="email" type="email" required><label for="password">Password</label><input id="password" type="password" required><button type="submit">Join</button></form>')],
    ['Navigation Bar', code('<nav aria-label="Main"><ul><li><a href="/" aria-current="page">Home</a></li><li><a href="/a">A</a></li><li><a href="/b">B</a></li></ul></nav>')],
    ['Product Card', code('<article class="product"><h2>A</h2><img alt="Product"><p class="price">10</p><button type="button">Buy</button></article>')],
    ['Center the Card', code('', '.stage {display:flex;justify-content:center;align-items:center;min-height:100vh}')],
    ['Flexbox Layout', code('', '.panels {display:flex;gap:1rem;flex-wrap:wrap}.panel {flex:1}')],
    ['Responsive Product Grid', code('', '.products {display:grid;grid-template-columns:repeat(3, 1fr);gap:1rem}@media (max-width: 600px){.products {grid-template-columns:1fr}}')],
    ['Hover Animation', code('', '.action {transition:transform 200ms ease}.action:hover {transform:scale(1.05)}@media (prefers-reduced-motion: reduce){.action {transition:none}}')],
    ['Counter', code('<button id="increment"></button><output id="count"></output>', '', 'let count=0; button.addEventListener("click",()=>{count++; output.textContent=count;});')],
    ['Todo List', code('<input id="todo-input"><button id="add"></button><ul id="todos"></ul>', '', 'button.addEventListener("click",()=>{const li=document.createElement("li"); list.appendChild(li);});')],
    ['Modal', code('<button id="open"></button><dialog id="modal"><button id="close"></button></dialog>', '', 'open.addEventListener("click",()=>dialog.showModal()); close.addEventListener("click",()=>dialog.close());')],
    ['Form Validation', code('<form id="signup"><input type="email" required><p role="alert"></p></form>', '', 'form.addEventListener("submit",event=>{event.preventDefault(); if(!form.checkValidity()){error.textContent="Invalid";}});')],
  ];
  it.each(fixtures)('%s', async (title, input) => { expect(await run(title, input)).toMatchObject({ score: 100, status: 'passed' }); });
});
