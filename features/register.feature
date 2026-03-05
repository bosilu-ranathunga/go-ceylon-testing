Feature: Registration functionality

  @register
  Scenario: User completes traveller registration
    Given the user is on the registration page
    When the user selects Traveller account type
    And the user enters valid registration details
    And the user selects travel preferences and submits the form
    Then the user should see the registration success message

  @register
  Scenario: User completes guide registration
    Given the user is on the registration page
    When the user selects Guide account type
    And the user enters valid guide personal details
    And the user enters valid guide specific details and submits the form
    Then the user should see the registration success message

  @register
  Scenario: User completes business registration
    Given the user is on the registration page
    When the user selects Business account type
    And the user enters valid business personal details
    And the user enters valid business specific details and submits the form
    Then the user should see the registration success message
