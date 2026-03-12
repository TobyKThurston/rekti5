'use client';

import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#0d0e11] text-[#e8e8e8]">
          <div className="text-center">
            <div className="mb-2 text-[#e04f4f] text-lg font-bold">Something went wrong</div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-[2px] bg-[#1a1c20] border border-[#22242a] px-4 py-2 text-sm hover:border-[#f09000] hover:text-[#f09000]"
            >
              Reload the page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
