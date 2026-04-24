export function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeDev } = require('./instrumentation.node');
  return initializeDev();
}
