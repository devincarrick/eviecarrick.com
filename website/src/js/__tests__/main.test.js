import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";

describe("Main functionality", () => {
  beforeEach(() => {
    // Setup your DOM here
    document.body.innerHTML = `
      <div>
        <h1>Evie Carrick</h1>
        <!-- Add more of your actual DOM structure -->
      </div>
    `;
    
    // Import your JS file here if needed
    // require("../main.js");
  });

  afterEach(() => {
    // Cleanup
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("page title is visible", () => {
    expect(screen.getByText("Evie Carrick")).toBeInTheDocument();
  });

  // Add more tests as needed
}); 