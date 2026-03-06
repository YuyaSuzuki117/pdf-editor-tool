'use client';

import React from 'react';
import { DqSlime } from './dq-slime';
import { YuunamaSkeleton } from './dq-characters';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, #1a1008 0%, #0d0804 100%)',
          }}
        >
          <div className="dq-window p-6 max-w-[380px] w-[90vw]">
            {/* Characters with message */}
            <div className="flex items-end justify-center gap-3 mb-4">
              <YuunamaSkeleton size={48} bounce={false} />
              <DqSlime size={56} bounce={true}>
                <span style={{ color: 'var(--ynk-bone)', fontSize: 13 }}>
                  {'\u304F\u3063...\u30D0\u30B0\u306B \u3084\u3089\u308C\u305F...\uFF01'}
                </span>
              </DqSlime>
            </div>

            {/* Error title */}
            <h2
              className="dq-title text-lg text-center mb-2"
              style={{ color: 'var(--ynk-magma)' }}
            >
              {'\u30A8\u30E9\u30FC\u304C \u306F\u3063\u305B\u3044\u3057\u305F'}
            </h2>

            <p className="dq-text text-sm text-center mb-4" style={{ opacity: 0.8 }}>
              {'\u4E88\u671F\u305B\u306C\u30C8\u30E9\u30C3\u30D7\u306B\u304B\u304B\u3063\u305F\uFF01\n\u300C\u3082\u3046\u3044\u3061\u3069\u300D\u3067\u518D\u8A66\u884C\u3067\u304D\u307E\u3059\u3002'}
            </p>

            {/* Retry button */}
            <button
              onClick={this.handleReset}
              className="dq-btn w-full mb-3"
              style={{ fontSize: 14 }}
            >
              {'\u2694\uFE0F \u3082\u3046\u3044\u3061\u3069'}
            </button>

            {/* Collapsible error details */}
            <div>
              <button
                onClick={this.toggleDetails}
                className="dq-btn-small w-full"
                style={{
                  background: 'linear-gradient(180deg, #4a4a4a 0%, #333 100%)',
                  color: 'var(--ynk-bone)',
                  fontSize: 12,
                }}
              >
                {this.state.showDetails ? '\u25B2 \u30A8\u30E9\u30FC\u8A73\u7D30\u3092\u3068\u3058\u308B' : '\u25BC \u30A8\u30E9\u30FC\u8A73\u7D30\u3092\u307F\u308B'}
              </button>

              {this.state.showDetails && this.state.error && (
                <div
                  className="mt-2 p-3 overflow-auto"
                  style={{
                    maxHeight: 200,
                    background: 'rgba(0,0,0,0.6)',
                    border: '2px solid var(--ynk-stone)',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: 'var(--ynk-magma)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ color: 'var(--ynk-gold)', marginBottom: 4, fontWeight: 'bold' }}>
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div style={{ opacity: 0.7 }}>
                      {this.state.error.stack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
