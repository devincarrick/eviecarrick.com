describe("Navigation", () => {
  beforeEach(() => {
    cy.visit("/");
    // Wait for components to load
    cy.get("#hero").should("exist");
  });

  it("should navigate to the about page", () => {
    // Make selector more specific or use first matching link
    cy.get("a[href*='about']").first().click();
    cy.url().should("include", "/about.html");
    // Wait for about page content to load
    cy.get("main").should("be.visible");
  });

  it("should load the homepage successfully", () => {
    // Check for specific sections instead of h1
    cy.get("main").should("be.visible");
    cy.get("#hero").should("exist");
    cy.get("#editorial").should("exist");
    cy.get("#commercial-quote").should("exist");
    cy.get("#portfolio").should("exist");
  });

  // Add more navigation tests as needed
}); 