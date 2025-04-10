import { initSentry, logError } from "./sentry-config";

// Initialize Sentry in production
initSentry();

// Set up global error handler
window.onerror = (message, source, line, column, error) => {
  logError(error || new Error(message), "Uncaught error");
  return false;
};

// Component loading functionality
export async function loadComponent(name) {
  try {
    const path = `/components/${name}.html`;
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${name} component`);
    return await response.text();
  } catch (error) {
    logError(error, `Loading component: ${name}`);
    return "";
  }
}

// Handle image loading with Intersection Observer
export function handleImageLoading() {
  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          // Start loading the image before it comes into view
          if (img.dataset.src) {
            const newImg = new Image();
            newImg.onload = () => {
              img.src = img.dataset.src;
              img.classList.add("fade-in", "loaded");
            };
            newImg.src = img.dataset.src;
            delete img.dataset.src;
          }
          observer.unobserve(img);
        }
      });
    },
    {
      // Start loading when image is 50% viewport height away
      rootMargin: "50% 0px",
      threshold: 0.1,
    }
  );

  const images = document.querySelectorAll("img[data-src]");
  images.forEach(img => {
    imageObserver.observe(img);
    img.classList.add("fade-in");
  });

  // Immediately load images that are already in view
  const visibleImages = document.querySelectorAll("img:not([data-src])");
  visibleImages.forEach(img => {
    img.classList.add("fade-in", "loaded");
  });
}

// Preload next section's images
export function preloadNextSectionImages(currentSection) {
  const nextSection = currentSection.nextElementSibling;
  if (nextSection) {
    const images = nextSection.querySelectorAll("img[data-src]");
    images.forEach(img => {
      const preloadLink = document.createElement("link");
      preloadLink.rel = "preload";
      preloadLink.as = "image";
      preloadLink.href = img.dataset.src;
      document.head.appendChild(preloadLink);
    });
  }
}

// Handle smooth scrolling with preloading
export function handleSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const target = document.querySelector(targetId);
      if (target) {
        // Preload images in the target section
        const images = target.querySelectorAll("img[data-src]");
        images.forEach(img => {
          const preloadLink = document.createElement("link");
          preloadLink.rel = "preload";
          preloadLink.as = "image";
          preloadLink.href = img.dataset.src;
          document.head.appendChild(preloadLink);
        });

        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
}

// Preload all images
export function preloadAllImages() {
  const allImages = document.querySelectorAll("img");
  allImages.forEach(img => {
    const src = img.src || img.dataset.src;
    if (src) {
      const preloadLink = document.createElement("link");
      preloadLink.rel = "preload";
      preloadLink.as = "image";
      preloadLink.href = src;
      document.head.appendChild(preloadLink);
    }
  });
}

export async function initComponents() {
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
        menuBtn.addEventListener("click", e => {
          e.preventDefault();
          mobileMenu.classList.toggle("hidden");
        });
      }
    }

    // Load other components if on main page
    if (document.querySelector("#hero")) {
      // Load components in specific order
      const components = [
        { selector: "#hero", name: "hero" },
        { selector: "#editorial-work", name: "editorial-section" },
        { selector: "#commercial-quote", name: "commercial-quote" },
        { selector: "#commercial-section", name: "commercial-section" },
      ];

      // Load main content first
      for (const { selector, name } of components) {
        const element = document.querySelector(selector);
        if (element) {
          const content = await loadComponent(name);
          element.innerHTML = content;
          handleImageLoading();
        }
      }

      // Load footer last
      const footerElement = document.querySelector("#footer");
      if (footerElement) {
        const footerContent = await loadComponent("footer");
        footerElement.innerHTML = footerContent;
      }

      // Preload all images after components are loaded
      preloadAllImages();

      // Initialize smooth scrolling
      handleSmoothScroll();
    }
  } catch (error) {
    logError(error, "Initializing components");
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initComponents().catch(error => logError(error, "DOM initialization"));
});
