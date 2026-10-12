export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const ok = (res, data = {}, message = 'Success', status = 200) => res.status(status).json({ success: true, message, data });
export const pageOptions = q => ({ skip: (q.page - 1) * q.limit, limit: q.limit });
export const publicUser = user => {
  const u = user.toObject ? user.toObject() : { ...user };
  for (const key of ['password', 'tokenVersion', '__v', 'submissionLock']) delete u[key];
  return u;
};
