Feature: Admin add attraction functionality

  @adminAddAttraction
  Scenario: Admin can create a new attraction
    Given the admin is on the login page
    When the admin logs in with valid credentials
    And the admin navigates to the add attraction page
    And the admin fills valid attraction details
    And the admin submits the attraction form
    Then the admin should see an attraction created success message
