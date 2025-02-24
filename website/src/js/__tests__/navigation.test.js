import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";

describe("Navigation", () => {
  beforeEach(() => {
    // Setup DOM with navigation elements
    document.body.innerHTML = `
      <header>
        <nav>
          <button id="menuBtn" aria-label="Toggle menu">Menu</button>
          <div id="mobileMenu" class="hidden">
            <a href="#hero">Home</a>
            <a href="#editorial">Editorial</a>
            <a href="#portfolio">Portfolio</a>
          </div>
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

    expect(menuBtn).not.toBeNull();
    expect(mobileMenu).not.toBeNull();
    expect(mobileMenu).toHaveClass("hidden");

    // Click menu button
    await userEvent.click(menuBtn);
    expect(mobileMenu).not.toHaveClass("hidden");

    // Click again to hide
    await userEvent.click(menuBtn);
    expect(mobileMenu).toHaveClass("hidden");
  });

  test("smooth scroll is triggered on anchor click", async () => {
    const { handleSmoothScroll } = await import("../main.js");
    handleSmoothScroll();

    const editorialLink = document.querySelector('a[href="#editorial"]');
    const editorialSection = document.querySelector("#editorial");
    
    expect(editorialLink).not.toBeNull();
    expect(editorialSection).not.toBeNull();

    // Create and dispatch a click event
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true
    });
    
    editorialLink.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
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

    const link = document.querySelector("a[href=\"#target\"]");
    link.click();

    // Check if preload links were added
    const preloadLinks = document.head.querySelectorAll("link[rel=\"preload\"]");
    expect(preloadLinks).toHaveLength(2);
    expect(preloadLinks[0].href).toContain("target1.jpg");
    expect(preloadLinks[1].href).toContain("target2.jpg");
  });
}); 