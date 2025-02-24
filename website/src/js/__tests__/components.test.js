require("@testing-library/jest-dom");

// Mock fetch for component loading
global.fetch = jest.fn();

describe("Component Loading", () => {
  beforeEach(() => {
    // Reset fetch mock
    fetch.mockReset();
    
    // Setup basic DOM structure
    document.body.innerHTML = `
      <header></header>
      <main>
        <div id="hero"></div>
        <div id="editorial-work"></div>
        <div id="commercial-quote"></div>
        <div id="commercial-section"></div>
      </main>
      <div id="footer"></div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("loadComponent fetches and loads component content", async () => {
    const mockContent = "<div>Test Component</div>";
    fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockContent)
    });

    // Import the function dynamically to ensure fresh module state
    const { loadComponent } = await import("../main.js");
    const content = await loadComponent("test-component");

    expect(fetch).toHaveBeenCalledWith("/components/test-component.html");
    expect(content).toBe(mockContent);
  });

  test("loadComponent handles fetch errors gracefully", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    const { loadComponent } = await import("../main.js");
    const content = await loadComponent("error-component");

    expect(fetch).toHaveBeenCalledWith("/components/error-component.html");
    expect(content).toBe("");
  });

  test("initComponents loads all components in correct order", async () => {
    const mockComponents = {
      header: "<nav>Header</nav>",
      hero: "<section>Hero</section>",
      "editorial-section": "<section>Editorial</section>",
      "commercial-quote": "<section>Quote</section>",
      "commercial-section": "<section>Commercial</section>",
      footer: "<footer>Footer</footer>"
    };

    // Mock successful fetch for each component
    Object.values(mockComponents).forEach(content => {
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(content)
      });
    });

    const { initComponents } = await import("../main.js");
    await initComponents();

    // Verify components were loaded in correct order
    expect(document.querySelector("header").innerHTML).toBe(mockComponents.header);
    expect(document.querySelector("#hero").innerHTML).toBe(mockComponents.hero);
    expect(document.querySelector("#editorial-work").innerHTML).toBe(mockComponents["editorial-section"]);
    expect(document.querySelector("#commercial-quote").innerHTML).toBe(mockComponents["commercial-quote"]);
    expect(document.querySelector("#commercial-section").innerHTML).toBe(mockComponents["commercial-section"]);
    expect(document.querySelector("#footer").innerHTML).toBe(mockComponents.footer);
  });
}); 