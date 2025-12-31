describe("Navigation", () => {
  beforeEach(() => {
    // Set desktop viewport to ensure navigation links are visible
    cy.viewport(1280, 800);
    cy.visit("/");
    // Wait for header component to load (contains navigation)
    cy.get("header nav", { timeout: 10000 }).should("exist");
  });

  it("should navigate to the about page", () => {
    // Prefer desktop ABOUT link; if it's hidden (e.g., tailwind breakpoint not applied),
    // open the mobile menu and click the mobile ABOUT link instead.
    cy.contains("header nav a", "ABOUT", { timeout: 10000, matchCase: false }).then($link => {
      if (Cypress.$($link).is(":visible")) {
        cy.wrap($link).click();
      } else {
        cy.get("#menuBtn", { timeout: 10000 }).click();
        cy.contains("#mobileMenu a", "ABOUT", { timeout: 10000, matchCase: false })
          .should("be.visible")
          .click();
      }
    });

    // Accept either clean URL (/about) or explicit file (/about.html)
    cy.location("pathname", { timeout: 10000 }).should("match", /\/about(?:\.html)?$/);
    // Wait for about page content to load
    cy.get("main", { timeout: 10000 }).should("exist");
  });

  it("should load the homepage successfully", () => {
    // Check for specific sections with content loaded
    cy.get("main").should("exist");
    // Wait for hero content to be loaded (not just the empty div)
    cy.get("#hero", { timeout: 10000 }).should("exist");
    cy.get("#editorial").should("exist");
    cy.get("#commercial-quote").should("exist");
    cy.get("#portfolio").should("exist");
  });

  // Add more navigation tests as needed
}); 