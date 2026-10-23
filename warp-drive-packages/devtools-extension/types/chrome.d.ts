// The few `chrome.*` APIs the panel uses. Declared locally so the repo does not
// take on `@types/chrome` for a handful of calls.

interface ChromeEvent<Callback> {
  addListener(callback: Callback): void;
}

interface ChromePort {
  readonly name: string;
  postMessage(message: unknown): void;
  disconnect(): void;
  readonly onMessage: ChromeEvent<(message: unknown) => void>;
  readonly onDisconnect: ChromeEvent<() => void>;
}

declare const chrome:
  | {
      runtime: {
        connect(connectInfo: { name: string }): ChromePort;
        readonly lastError?: unknown;
      };
      devtools?: {
        inspectedWindow?: {
          readonly tabId: number;
        };
      };
    }
  | undefined;
