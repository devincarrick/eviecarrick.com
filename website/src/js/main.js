// Component loading functionality
async function loadComponent(name) {
  try {
    const path = `components/${name}.html`;
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${name} component`);
    return await response.text();
  } catch (error) {
    console.error(`Error loading ${name} component:`, error);
    return "";
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
      const components = {
        "#hero": "hero",
        "#editorial-quote": "editorial-quote",
        "#editorial-work": "editorial-section",
        "#commercial-quote": "commercial-quote",
        "#commercial-work": "commercial-section",
        "#footer": "footer",
      };

      for (const [selector, component] of Object.entries(components)) {
        const element = document.querySelector(selector);
        if (element) {
          element.innerHTML = await loadComponent(component);
        }
      }
    }
  } catch (error) {
    console.error("Error in initComponents:", error);
  }
}

// Initialize immediately
initComponents().catch((error) =>
  console.error("Error in initialization:", error)
);
