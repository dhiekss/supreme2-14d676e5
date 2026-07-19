import { Component, type ReactNode } from "react";

/**
 * Some React 19 + TanStack Router hydration paths surface an "undefined"
 * thrown value that TanStack's built-in CatchBoundary can't handle
 * (it treats `state.error === undefined` as "no error caught"), causing
 * an infinite re-render → "Uncaught undefined" and a blank page on hard
 * reload of authenticated routes.
 *
 * This boundary sits above the route tree and, when it catches such an
 * undefined error, schedules a one-tick reset so the subtree remounts
 * after hydration completes. Real Error instances are re-thrown so the
 * normal TanStack route error components still handle them.
 */
type State = { key: number };

export class UndefinedErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { key: 0 };
  private retried = false;

  static getDerivedStateFromError(error: unknown) {
    if (error == null || typeof error === "undefined") {
      // Force subtree remount by bumping key
      return {};
    }
    return null;
  }

  componentDidCatch(error: unknown) {
    if (error != null) {
      // Real errors propagate so TanStack's per-route errorComponent handles them
      throw error;
    }
    if (this.retried) return;
    this.retried = true;
    // Schedule remount after hydration finishes
    setTimeout(() => {
      this.setState((s) => ({ key: s.key + 1 }));
      this.retried = false;
    }, 0);
  }

  render() {
    return <div key={this.state.key}>{this.props.children}</div>;
  }
}
