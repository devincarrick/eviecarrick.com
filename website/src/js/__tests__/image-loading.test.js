import "@testing-library/jest-dom";

describe("Image Loading", () => {
  beforeEach(() => {
    // Clear any existing preload links
    document.head.innerHTML = "";
    
    // Setup basic DOM structure with lazy-loaded images
    document.body.innerHTML = `
      <div>
        <img data-src="/images/test1.jpg" alt="Test 1">
        <img data-src="/images/test2.jpg" alt="Test 2">
        <img src="/images/test3.jpg" alt="Test 3">
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    jest.clearAllMocks();
  });

  test("handleImageLoading initializes IntersectionObserver for lazy-loaded images", async () => {
    const mockObserve = jest.fn();
    const mockUnobserve = jest.fn();

    // Mock IntersectionObserver
    window.IntersectionObserver = jest.fn(() => ({
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: jest.fn()
    }));

    const { handleImageLoading } = await import("../main.js");
    handleImageLoading();

    // Should observe all images with data-src
    const lazyImages = document.querySelectorAll("img[data-src]");
    expect(mockObserve).toHaveBeenCalledTimes(lazyImages.length);

    // All lazy images should have fade-in class
    lazyImages.forEach(img => {
      expect(img).toHaveClass("fade-in");
    });

    // Already loaded images should have both classes
    const loadedImages = document.querySelectorAll("img:not([data-src])");
    loadedImages.forEach(img => {
      expect(img).toHaveClass("fade-in");
      expect(img).toHaveClass("loaded");
    });
  });

  test("preloadNextSectionImages preloads images in the next section", async () => {
    document.body.innerHTML = `
      <section id="current">
        <img src="/images/current.jpg">
      </section>
      <section id="next">
        <img data-src="/images/next1.jpg">
        <img data-src="/images/next2.jpg">
      </section>
    `;

    const { preloadNextSectionImages } = await import("../main.js");
    const currentSection = document.querySelector("#current");
    preloadNextSectionImages(currentSection);

    // Check if preload links were added
    const preloadLinks = document.head.querySelectorAll("link[rel='preload']");
    expect(preloadLinks).toHaveLength(2);
    
    const hrefs = Array.from(preloadLinks).map(link => link.href);
    expect(hrefs).toEqual(expect.arrayContaining([
      expect.stringContaining("next1.jpg"),
      expect.stringContaining("next2.jpg")
    ]));
  });

  test("preloadAllImages preloads all images on the page", async () => {
    const { preloadAllImages } = await import("../main.js");
    
    // Clear any existing preload links before running test
    document.head.querySelectorAll("link[rel='preload']").forEach(link => link.remove());
    
    preloadAllImages();

    // Check if preload links were added for all images
    const preloadLinks = document.head.querySelectorAll("link[rel='preload']");
    const hrefs = Array.from(preloadLinks).map(link => link.href);
    
    expect(hrefs).toEqual(expect.arrayContaining([
      expect.stringContaining("test1.jpg"),
      expect.stringContaining("test2.jpg"),
      expect.stringContaining("test3.jpg")
    ]));
    
    // Each image should have exactly one preload link
    const uniqueHrefs = new Set(hrefs);
    expect(uniqueHrefs.size).toBe(3);
  });
}); 