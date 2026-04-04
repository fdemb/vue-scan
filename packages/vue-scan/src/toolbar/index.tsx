/** @jsxImportSource preact */
import { Component, render, type ComponentChildren } from "preact";
import { Widget } from "./widget";
import TOOLBAR_STYLES from "./assets/styles.css?inline";

let rootContainer: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;

function initRootContainer(): ShadowRoot {
  if (rootContainer && shadowRoot) return shadowRoot;

  rootContainer = document.createElement("div");
  rootContainer.id = "vue-scan-root";

  shadowRoot = rootContainer.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = TOOLBAR_STYLES;
  shadowRoot.appendChild(style);

  document.documentElement.appendChild(rootContainer);

  return shadowRoot;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ToolbarErrorBoundary extends Component<{ children: ComponentChildren }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div class="fixed bottom-4 right-4 z-[2147483647] bg-[#1a1a1a] text-red-400 p-3 rounded-lg font-mono text-xs max-w-[280px] shadow-lg border border-white/10">
          <div>vue-scan error</div>
          <div class="mt-1 break-words">{this.state.error?.message}</div>
          <button
            onClick={this.handleReset}
            class="mt-2 bg-red-500 text-white px-2.5 py-1 rounded cursor-pointer hover:bg-red-600 transition-colors"
          >
            Restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function createToolbar(): HTMLDivElement {
  const shadow = initRootContainer();

  const container = document.createElement("div");
  container.id = "vue-scan-toolbar-root";
  shadow.appendChild(container);

  render(
    <ToolbarErrorBoundary>
      <Widget />
    </ToolbarErrorBoundary>,
    container,
  );

  // Double render(null) required for full Preact cleanup — same as react-scan toolbar.tsx:71-73
  const originalRemove = container.remove.bind(container);
  container.remove = () => {
    if (container.hasChildNodes()) {
      render(null, container);
      render(null, container);
    }
    originalRemove();
  };

  return container;
}
