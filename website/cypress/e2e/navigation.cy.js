describe("Navigation", () => {
  beforeEach(() => {
    // Set desktop viewport to ensure navigation links are visible
    cy.viewport(1280, 800);
    cy.visit("/");
    // Wait for header component to load (contains navigation)
    cy.get("header nav", { timeout: 10000 }).should("be.visible");
  });

  it("should navigate to the about page", () => {
    // Wait for and click the visible desktop navigation link
    cy.get('a[href="about.html"]', { timeout: 10000 })
      .should("be.visible")
      .click();
    cy.url().should("include", "/about.html");
    // Wait for about page content to load
    cy.get("main", { timeout: 10000 }).should("be.visible");
  });

  it("should load the homepage successfully", () => {
    // Check for specific sections with content loaded
    cy.get("main").should("be.visible");
    // Wait for hero content to be loaded (not just the empty div)
    cy.get("#hero img", { timeout: 10000 }).should("exist");
    cy.get("#editorial").should("exist");
    cy.get("#commercial-quote").should("exist");
    cy.get("#portfolio").should("exist");
  });

  // Add more navigation tests as needed
}); 