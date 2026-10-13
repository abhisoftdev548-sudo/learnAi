import { api } from '../lib/api.js';

export const achievementService = {
  /** Catalogue with the caller's progress when a session cookie is present. */
  catalogue: () => api.get('/achievements'),
};

export default achievementService;
