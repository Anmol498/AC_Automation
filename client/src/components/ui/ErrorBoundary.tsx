import React, { ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md mx-auto my-12 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
            <i className="fa-solid fa-circle-exclamation text-xl" />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-950 dark:text-slate-50">Something went wrong</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
            An unexpected error occurred. Please try refreshing the section or page.
          </p>
          <Button onClick={this.handleReset}>
            <i className="fa-solid fa-rotate-right mr-1" />
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
