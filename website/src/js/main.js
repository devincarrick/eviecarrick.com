// Component loading functionality
async function loadComponent(name) {
  try {
    const path = `/components/${name}.html`;
    console.log(`[DEBUG] Loading ${name} from path: ${path}`);
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${name} component`);
    const content = await response.text();
    console.log(`[DEBUG] ${name} content loaded, length: ${content.length}`);
    return content;
  } catch (error) {
    console.error(`Error loading ${name} component:`, error);
    return "";
  }
}

async function loadPortfolioSection() {
  const portfolioElement = document.querySelector("#portfolio");
  if (!portfolioElement) return;

  try {
    console.log("[DEBUG] Loading portfolio section components");
    const quoteContent = await loadComponent("commercial-quote");
    const commercialContent = await loadComponent("commercial-section");

    const wrappedQuoteContent = `<div id="commercial-quote" class="bg-transparent">${quoteContent}</div>`;
    portfolioElement.innerHTML = wrappedQuoteContent + commercialContent;

    console.log("[DEBUG] Portfolio section loaded successfully");
  } catch (error) {
    console.error("[DEBUG] Error loading portfolio section:", error);
  }
}

async function initComponents() {
  try {
    // Load header first
    const headerElement = document.querySelector("header");
    if (headerElement) {
      const headerContent = await loadComponent("header");
      headerElement.innerHTML = headerContent;

      // Initialize mobile menu immediately after header is loaded
      const menuBtn = document.querySelector("#menuBtn");
      const mobileMenu = document.querySelector("#mobileMenu");

      if (menuBtn && mobileMenu) {
        menuBtn.addEventListener("click", (e) => {
          e.preventDefault();
          mobileMenu.classList.toggle("hidden");
        });
      }
    }

    // Load other components if on main page
    if (document.querySelector("#hero")) {
      // Load basic components
      const components = {
        "#hero": "hero",
        "#editorial-work": "editorial-section",
        "#footer": "footer",
      };

      for (const [selector, component] of Object.entries(components)) {
        const element = document.querySelector(selector);
        if (element) {
          const content = await loadComponent(component);
          element.innerHTML = content;
        }
      }

      // Load portfolio section
      await loadPortfolioSection();
    }
  } catch (error) {
    console.error("Error in initComponents:", error);
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("[DEBUG] DOM loaded, initializing components");
  initComponents().catch((error) =>
    console.error("Error in initialization:", error)
  );
});
