import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";

describe("Navigation", () => {
  beforeEach(() => {
    // Setup DOM with navigation elements
    document.body.innerHTML = `
      <header>
        <button id="menuBtn" aria-label="Toggle menu">Menu</button>
        <nav id="mobileMenu" class="hidden">
          <a href="#hero">Home</a>
          <a href="#editorial">Editorial</a>
          <a href="#portfolio">Portfolio</a>
        </nav>
      </header>
      <main>
        <section id="hero">Hero Section</section>
        <section id="editorial">Editorial Section</section>
        <section id="portfolio">Portfolio Section</section>
      </main>
    `;

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("mobile menu toggle works correctly", async () => {
    const { initComponents } = await import("../main.js");
    await initComponents();

    const menuBtn = document.querySelector("#menuBtn");
    const mobileMenu = document.querySelector("#mobileMenu");

    // Initial state
    expect(mobileMenu).toHaveClass("hidden");

    // Click menu button
    menuBtn.click();
    expect(mobileMenu).not.toHaveClass("hidden");

    // Click again to hide
    menuBtn.click();
    expect(mobileMenu).toHaveClass("hidden");
  });

  test("smooth scroll is triggered on anchor click", async () => {
    const { handleSmoothScroll } = await import("../main.js");
    handleSmoothScroll();

    const editorialLink = document.querySelector('a[href="#editorial"]');
    const editorialSection = document.querySelector("#editorial");
    
    // Mock preventDefault
    const mockPreventDefault = jest.fn();
    
    // Click the link
    editorialLink.dispatchEvent(new MouseEvent("click", {
      preventDefault: mockPreventDefault
    }));

    expect(mockPreventDefault).toHaveBeenCalled();
    expect(editorialSection.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start"
    });
  });

  test("preloads images in target section before scrolling", async () => {
    document.body.innerHTML = `
      <a href="#target">Go to Target</a>
      <section id="target">
        <img data-src="/images/target1.jpg">
        <img data-src="/images/target2.jpg">
      </section>
    `;

    const { handleSmoothScroll } = await import("../main.js");
    handleSmoothScroll();

    const link = document.querySelector('a[href="#target"]');
    link.click();

    // Check if preload links were added
    const preloadLinks = document.head.querySelectorAll("link[rel='preload']");
    expect(preloadLinks).toHaveLength(2);
    expect(preloadLinks[0].href).toContain("target1.jpg");
    expect(preloadLinks[1].href).toContain("target2.jpg");
  });
}); 