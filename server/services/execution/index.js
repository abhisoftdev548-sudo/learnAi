/**
 * Execution layer.
 *
 * Hard rule: untrusted user JavaScript is NEVER executed inside this Node.js
 * process. The default provider collects *measurements* from the sandboxed
 * client iframe; `remote-runner` can point at a dedicated isolated execution
 * service. Either way the server judges the results (see scoring.service.js).
 */
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import clientSandboxProvider from './clientSandbox.provider.js';
import remoteRunnerProvider from './remoteRunner.provider.js';

const PROVIDERS = new Map([
  [clientSandboxProvider.name, clientSandboxProvider],
  [remoteRunnerProvider.name, remoteRunnerProvider],
]);

export function getExecutionProvider(name = env.execution.provider) {
  const provider = PROVIDERS.get(name);
  if (!provider) {
    logger.warn(`[execution] unknown provider "${name}", falling back to client-sandbox`);
    return clientSandboxProvider;
  }
  return provider;
}

export function listExecutionProviders() {
  return [...PROVIDERS.values()].map((provider) => ({
    name: provider.name,
    kind: provider.kind,
    active: provider.name === env.execution.provider,
  }));
}

/** Resolve measurements for a submission using the configured provider. */
export async function resolveMeasurements({ challenge, code, analysis, observations, userId }) {
  const provider = getExecutionProvider();
  if (!provider.resolveMeasurements) {
    return { measurements: new Map(), provider: provider.name, note: 'provider does not collect measurements' };
  }
  const result = await provider.resolveMeasurements({ challenge, code, analysis, observations, userId });
  return { provider: provider.name, missing: [], unexpected: [], ...result };
}

export { clientSandboxProvider, remoteRunnerProvider };
export default { getExecutionProvider, resolveMeasurements, listExecutionProviders };
