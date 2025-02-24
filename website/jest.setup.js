require("@testing-library/jest-dom");

// Add custom jest matchers
expect.extend({});

// Mock window properties that are not available in jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Setup Intersection Observer mock
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation(callback => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
}));
window.IntersectionObserver = mockIntersectionObserver; 