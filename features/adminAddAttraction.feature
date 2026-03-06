Feature: Admin add attraction functionality

  @adminAddAttraction
  Scenario: Admin can create a new attraction
    Given the admin is on the login page
    When the admin logs in with valid credentials
    And the admin navigates to the add attraction page
    And the admin fills valid attraction details
    And the admin submits the attraction form
    Then the admin should see an attraction created success message

  @adminAddAttraction
  Scenario: Admin can update an existing attraction
    Given the admin is on the login page
    When the admin logs in with valid credentials
    And the admin navigates to the add attraction page
    And the admin fills valid attraction details
    And the admin submits the attraction form
    Then the admin should see an attraction created success message
    When the admin navigates to the attractions list page
    And the admin updates the created attraction details
    Then the admin should see an attraction updated success message

  @adminAddAttraction
  Scenario: Admin can delete an existing attraction
    Given the admin is on the login page
    When the admin logs in with valid credentials
    And the admin navigates to the add attraction page
    And the admin fills valid attraction details
    And the admin submits the attraction form
    Then the admin should see an attraction created success message
    When the admin navigates to the attractions list page
    And the admin deletes the created attraction
    Then the attraction should be removed from the locations list
