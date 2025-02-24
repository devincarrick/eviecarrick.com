// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })

// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })

// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })

// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Custom command to check if an element is visible and has specific content
Cypress.Commands.add("shouldBeVisibleWithText", { prevSubject: "element" }, (subject, text) => {
  cy.wrap(subject).should("be.visible").and("contain", text);
});

// Custom command to wait for images to load
Cypress.Commands.add("waitForImages", () => {
  cy.get("img").should($imgs => {
    const promises = Array.from($imgs, img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener("load", resolve);
        img.addEventListener("error", resolve);
      });
    });
    return Promise.all(promises);
  });
}); 