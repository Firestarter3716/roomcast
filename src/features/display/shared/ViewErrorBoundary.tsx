"use client";

import { Component, type ReactNode } from "react";
import { Monitor } from "lucide-react";

const ERROR_TEXT: Record<string, { title: string; recovering: string }> = {
  de: { title: "Anzeigefehler", recovering: "Wiederherstellung läuft..." },
  en: { title: "Display Error", recovering: "Attempting to recover..." },
  fr: { title: "Erreur d'affichage", recovering: "Tentative de récupération..." },
};

function getErrorText(): { title: string; recovering: string } {
  if (typeof navigator === "undefined") return ERROR_TEXT.en;
  const lang = navigator.language?.split("-")[0]?.toLowerCase() ?? "en";
  return ERROR_TEXT[lang] ?? ERROR_TEXT.en;
}

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
      const text = getErrorText();
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            backgroundColor: "var(--display-bg)",
            color: "var(--display-fg)",
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
            {text.title}
          </div>
          <div
            style={{
              fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)",
              opacity: 0.5,
            }}
          >
            {text.recovering}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
