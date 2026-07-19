import { Component, type ReactNode } from "react";

/**
 * React 19 + TanStack Router hydration on `ssr: false` subtrees can surface
 * a thrown `undefined` value. TanStack's built-in CatchBoundary treats
 * `state.error === undefined` as "no error caught" and re-renders the same
 * children, so the throw repeats → React reports "Uncaught undefined" and
 * the page renders blank on hard reload.
 *
 * This boundary sits above the authenticated Outlet: when it catches an
 * undefined-ish error, it schedules a one-tick remount so the subtree
 * hydrates cleanly. Any real Error instance is left alone (state stays as
 * `caught: false`), so React continues bubbling to TanStack's per-route
 * `errorComponent`.
 */
type State = { key: number; caught: boolean };

export class UndefinedErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { key: 0, caught: false };

  static getDerivedStateFromError(error: unknown): Partial<State> | null {
    if (error == null) {
      // Handle the undefined-throw case — mark caught, remount happens in componentDidCatch.
      return { caught: true };
    }
    // Real error: bubble to TanStack's route error boundaries.
    return null;
  }

  componentDidCatch(error: unknown) {
    if (error != null) return;
    // Schedule remount after current tick so hydration finishes.
    setTimeout(() => {
      this.setState((s) => ({ key: s.key + 1, caught: false }));
    }, 0);
  }

  render() {
    if (this.state.caught) return null;
    return <div key={this.state.key} className="contents">{this.props.children}</div>;
  }
}
