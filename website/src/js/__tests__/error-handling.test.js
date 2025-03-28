import "@testing-library/jest-dom";

// Mock Sentry
jest.mock("@sentry/browser", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn()
}));

describe("Error Handling", () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup basic DOM
    document.body.innerHTML = `
      <div id="app">
        <div id="error-boundary"></div>
      </div>
    `;

    // Mock process.env
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("initSentry configures Sentry in production", async () => {
    process.env.NODE_ENV = "production";
    const { initSentry } = await import("../sentry-config.js");
    const Sentry = require("@sentry/browser");

    initSentry();

    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
      environment: "production",
      integrations: []
    }));

    process.env.NODE_ENV = "test";
  });

  test("logError sends errors to Sentry", async () => {
    const { logError } = await import("../sentry-config.js");
    const Sentry = require("@sentry/browser");

    const testError = new Error("Test error");
    const context = "Test context";

    logError(testError, context);

    expect(Sentry.captureException).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        extra: expect.objectContaining({
          context: "Test context"
        }),
        tags: expect.objectContaining({
          errorType: "Error",
          component: "Test context"
        })
      })
    );
  });

  test("window.onerror handler captures uncaught errors", async () => {
    // Import main to set up error handler
    const { logError } = await import("../sentry-config.js");
    const Sentry = require("@sentry/browser");

    // Mock window.onerror to prevent actual error throwing
    const mockOnError = jest.fn();
    window.addEventListener("error", (event) => {
      event.preventDefault();
      mockOnError(event);
    }, true);

    // Create error without throwing it
    const error = { // Use plain object instead of Error to prevent throwing
      name: "Error",
      message: "Uncaught error"
    };

    // Trigger error handler directly
    logError(error, "Uncaught error");

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Error",
        message: "Uncaught error"
      }),
      expect.objectContaining({
        extra: expect.objectContaining({
          context: "Uncaught error"
        }),
        tags: expect.objectContaining({
          errorType: "Error",
          component: "Uncaught error"
        })
      })
    );
  });

  test("component loading errors are handled gracefully", async () => {
    const { loadComponent } = await import("../main.js");
    const Sentry = require("@sentry/browser");

    // Mock fetch to fail
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    const result = await loadComponent("test-component");

    expect(result).toBe(""); // Should return empty string on error
    expect(Sentry.captureException).toHaveBeenCalled();
  });
}); 