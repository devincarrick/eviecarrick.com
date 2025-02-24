import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/browser";

export function initSentry() {
  // Don't initialize Sentry in test environment
  if (process.env.NODE_ENV === "test") return;
  
  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: "https://5ef0f5e07c4bc6aca3a842984b76b7b2@o4508868990730240.ingest.us.sentry.io/4508868996104192",
      integrations: [],  // Remove BrowserTracing in tests
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV,
      
      // Customize error filtering
      beforeSend(event) {
        // Don't send errors from localhost or development
        if (window.location.hostname === "localhost" || 
            window.location.hostname === "127.0.0.1") {
          return null;
        }
        return event;
      },
    });
  }
}

export function logError(error, context) {
  const errorDetails = {
    message: error.message,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
  
  if (process.env.NODE_ENV === "development") {
    console.error(errorDetails);
  } else {
    Sentry.captureException(error, {
      extra: errorDetails,
      tags: {
        errorType: error.name,
        component: context,
      },
    });
  }
} 