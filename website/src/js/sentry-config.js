import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/browser";

export function initSentry() {
  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: "YOUR_SENTRY_DSN", // Replace with your actual DSN
      integrations: [
        new BrowserTracing(),
      ],
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