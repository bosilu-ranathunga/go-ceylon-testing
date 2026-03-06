@login
Feature: Login functionality

  @login @smoke
  Scenario: User logs in with valid credentials
    Given the user is on the login page
    When the user enters valid username and password
    And clicks the login button
    Then the user should see the dashboard

  @login
  Scenario: Guide logs in with valid credentials
    Given the user is on the login page
    When the guide enters valid username and password
    And clicks the login button
    Then the guide should see the dashboard

  @login
  Scenario: Admin logs in with valid credentials
    Given the user is on the login page
    When the admin enters valid username and password
    And clicks the login button
    Then the admin should see the dashboard

  @login
  Scenario: Business user logs in with valid credentials
    Given the user is on the login page
    When the business user enters valid username and password
    And clicks the login button
    Then the business user should see the dashboard
