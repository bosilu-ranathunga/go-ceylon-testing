Feature: Business user business management flow

  @businessManagement
  Scenario: Business user can create a business
    Given the business user is on the login page
    When the business user logs in with valid credentials
    And the business user navigates to add business page
    And the business user fills valid business details
    And the business user submits the business form
    Then the business user should see a business created success message

  @businessManagement
  Scenario: Business user can update a business
    Given the business user is on the login page
    When the business user logs in with valid credentials
    And the business user navigates to add business page
    And the business user fills valid business details
    And the business user submits the business form
    Then the business user should see a business created success message
    When the business user opens the created business details
    And the business user updates the created business details
    Then the business user should see a business updated success message

  @businessManagement
  Scenario: Business user can delete a business
    Given the business user is on the login page
    When the business user logs in with valid credentials
    And the business user navigates to add business page
    And the business user fills valid business details
    And the business user submits the business form
    Then the business user should see a business created success message
    When the business user opens the created business details
    And the business user updates the created business details
    Then the business user should see a business updated success message
    When the business user deletes the updated business
    Then the business should be removed from the business list
