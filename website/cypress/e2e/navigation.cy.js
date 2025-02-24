describe("Navigation", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should navigate to the about page", () => {
    cy.get("a[href*='about']").click();
    cy.url().should("include", "/about.html");
    cy.get("h1").should("be.visible");
  });

  it("should load the homepage successfully", () => {
    cy.get("h1").should("be.visible");
    cy.get("main").should("exist");
  });

  // Add more navigation tests as needed
}); 