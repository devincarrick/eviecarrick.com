describe("Navigation", () => {
  beforeEach(() => {
    // Set desktop viewport to ensure navigation links are visible
    cy.viewport(1280, 800);
    cy.visit("/");
    // Wait for components to load
    cy.get("#hero").should("exist");
  });

  it("should navigate to the about page", () => {
    // Click the visible desktop navigation link
    cy.get("a[href*='about']").should("be.visible").first().click();
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