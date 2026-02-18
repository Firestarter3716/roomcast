"use client";

import { Component, type ReactNode } from "react";
import { Monitor } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const RETRY_DELAY_MS = 30_000;

export class ViewErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "[ViewErrorBoundary] Display view crashed:",
      error.message,
      errorInfo.componentStack,
    );

    // Schedule auto-recovery after 30 seconds
    this.scheduleRetry();
  }

  componentWillUnmount() {
    this.clearRetryTimer();
  }

  private scheduleRetry() {
    this.clearRetryTimer();
    this.retryTimer = setTimeout(() => {
      this.setState({ hasError: false });
    }, RETRY_DELAY_MS);
  }

  private clearRetryTimer() {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            backgroundColor: "var(--display-background)",
            color: "var(--display-foreground)",
            fontFamily: "inherit",
            gap: "1.5rem",
            padding: "2rem",
          }}
        >
          <Monitor
            size={64}
            style={{ opacity: 0.5 }}
            aria-hidden="true"
          />
          <div
            style={{
              fontSize: "clamp(1.25rem, 3vw, 2rem)",
              fontWeight: 600,
              opacity: 0.9,
            }}
          >
            Display Error
          </div>
          <div
            style={{
              fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)",
              opacity: 0.5,
            }}
          >
            Attempting to recover...
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
