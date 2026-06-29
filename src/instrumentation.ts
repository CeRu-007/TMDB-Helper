export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  const { initializeDev } = await import('./instrumentation.node');
  return initializeDev();
}
