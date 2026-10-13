import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Catches render-time errors so a broken page shows a recoverable message
 * instead of a blank screen (which is impossible to diagnose from a preview).
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the details in the console for debugging without leaking them into the UI.
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card w-full max-w-lg p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-ink-900">Something went wrong on this page</h1>
          <p className="mt-2 text-sm text-ink-600">
            The interface hit an unexpected error. Reloading usually fixes it — if it keeps happening, the API may be unavailable.
          </p>
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-left font-mono text-xs text-ink-500">{String(error?.message ?? error)}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" /> Reload the app
            </button>
            <a className="btn-secondary" href="/">
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
