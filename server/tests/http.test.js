import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { User } from '../models/index.js';
const origin = 'http://localhost:5173';
const id = 'a'.repeat(24);
const token = (options = {}) => jwt.sign({ version: 0 }, process.env.JWT_SECRET, { subject: id, issuer: 'learnai', audience: 'learnai-api', expiresIn: '1h', ...options });
const withUser = (role = 'user', version = 0) => vi.spyOn(User, 'findById').mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: id, role, tokenVersion: version }) });
afterEach(() => vi.restoreAllMocks());
describe('HTTP security and authentication (database calls mocked)', () => {
  it('reports liveness and database readiness separately', async () => { expect((await request(app).get('/health/live')).status).toBe(200); expect((await request(app).get('/health/ready')).status).toBe(503); });
  it('rejects unauthenticated private APIs', async () => {
    for (const url of ['/api/auth/me', '/api/users/me', '/api/challenges', '/api/submissions/me', '/api/leaderboard', '/api/admin/dashboard', '/api/teams/me']) expect((await request(app).get(url)).status).toBe(401);
  });
  it('rejects missing/untrusted origins and allows credentialed preflight', async () => {
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(403);
    expect((await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({})).status).toBe(403);
    const res = await request(app).options('/api/auth/login').set('Origin', origin).set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204); expect(res.headers['access-control-allow-credentials']).toBe('true'); expect(res.headers['access-control-allow-origin']).toBe(origin);
  });
  it('rejects forged and expired JWTs', async () => {
    for (const value of ['fake', token({ expiresIn: -1 })]) expect((await request(app).get('/api/users/me').set('Cookie', `session=${value}`)).status).toBe(401);
  });
  it('blocks regular users from admin and challenge mutations', async () => {
    withUser();
    expect((await request(app).get('/api/admin/dashboard').set('Cookie', `session=${token()}`)).status).toBe(403);
    expect((await request(app).post('/api/challenges').set('Cookie', `session=${token()}`).set('Origin', origin).send({})).status).toBe(403);
  });
  it('allows admins through authorization and validates mutation bodies', async () => {
    withUser('admin');
    const res = await request(app).post('/api/challenges').set('Cookie', `session=${token()}`).set('Origin', origin).send({});
    expect(res.status).toBe(400); expect(res.body.success).toBe(false);
  });
  it('returns 400 for malformed JSON, invalid IDs, and oversized code', async () => {
    expect((await request(app).post('/api/auth/login').set('Origin', origin).set('Content-Type', 'application/json').send('{')).status).toBe(400);
    withUser();
    expect((await request(app).get('/api/challenges/nope').set('Cookie', `session=${token()}`)).status).toBe(400);
    expect((await request(app).post('/api/submissions').set('Origin', origin).set('Cookie', `session=${token()}`).send({ challengeId: id, htmlCode: 'x'.repeat(50001) })).status).toBe(400);
  });
  it('creates an HTTP-only session and never returns a password on login', async () => {
    const password = await bcrypt.hash('correct-password', 4);
    vi.spyOn(User, 'findOne').mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: id, email: 'a@example.com', password, tokenVersion: 0, role: 'user' }) });
    const res = await request(app).post('/api/auth/login').set('Origin', origin).send({ email: 'a@example.com', password: 'correct-password' });
    expect(res.status).toBe(200); expect(res.headers['set-cookie'][0]).toContain('HttpOnly'); expect(res.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(res.body.data.password).toBeUndefined(); expect(res.body.data.tokenVersion).toBeUndefined();
  });
  it('uses generic credentials errors', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    const res = await request(app).post('/api/auth/login').set('Origin', origin).send({ email: 'missing@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401); expect(res.body.message).toBe('Invalid email or password');
  });
  it('clears cookies and revokes existing tokens on logout', async () => {
    withUser(); const update = vi.spyOn(User, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    const res = await request(app).post('/api/auth/logout').set('Origin', origin).set('Cookie', `session=${token()}`);
    expect(res.status).toBe(200); expect(update).toHaveBeenCalledWith({ _id: id }, { $inc: { tokenVersion: 1 } });
    expect(res.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
    vi.restoreAllMocks(); withUser('user', 1);
    expect((await request(app).get('/api/users/me').set('Cookie', `session=${token()}`)).status).toBe(401);
  });
  it('rejects mass assignment at registration', async () => {
    const res = await request(app).post('/api/auth/register').set('Origin', origin).send({ name: 'A', username: 'alice', email: 'a@example.com', password: 'valid-password', role: 'admin' });
    expect(res.status).toBe(400);
  });
  it('returns a consistent JSON 404', async () => { const res = await request(app).get('/api/missing'); expect(res.status).toBe(404); expect(res.body).toMatchObject({ success: false, message: 'Route not found' }); });
});
