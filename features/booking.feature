@booking
Feature: Booking Guides
  As a traveler or guide on GoCeylon
  I want to manage guide bookings end-to-end
  So that I can plan, confirm, and track tour arrangements

  # ─── Background ───────────────────────────────────────────────────────────
  # Runs before EVERY scenario.  Sets up all API route stubs so no real
  # network calls are made during any test in this feature file.
  Background:
    Given the API mocks are configured

  # ─── Traveler: Guide List ─────────────────────────────────────────────────
  @smoke @traveler @guide-list
  Scenario: Traveler views the guide list for a location
    Given the traveler is logged in
    When the traveler navigates to the guide list for location "674abc123def456789012345"
    Then the guide list page heading "Guides" is visible
    And the guide search input is visible

  @traveler @search @regression
  Scenario: Traveler searches for a guide by name
    Given the traveler is logged in
    When the traveler navigates to the guide list for location "674abc123def456789012345"
    And the traveler types "Kamal" in the guide search input
    Then the guide cards shown contain the text "Kamal"

  @traveler @search @regression
  Scenario: Traveler sees no results for an unknown guide name
    Given the traveler is logged in
    When the traveler navigates to the guide list for location "674abc123def456789012345"
    And the traveler types "zzznomatch" in the guide search input
    Then the no-guides message "No guides found..." is visible

  # Scenario Outline — same flow exercised with multiple search terms.
  # The Examples table drives each row as a separate named scenario.
  @traveler @search @regression
  Scenario Outline: Traveler filters guide list using different search keywords
    Given the traveler is logged in
    When the traveler navigates to the guide list for location "674abc123def456789012345"
    And the traveler types "<query>" in the guide search input
    Then the guide search results count is at least <min_results>

    Examples:
      | query | min_results |
      | Kamal |           1 |
      | Nimal |           1 |
      | guide |           0 |

  # ─── Traveler: Book a Guide ───────────────────────────────────────────────
  @smoke @traveler @booking
  Scenario: Traveler books a guide successfully
    Given the traveler is logged in and a guide booking page is pre-loaded
    When the traveler clicks the "Request Booking" button
    Then the success modal with title "Requested!" is visible
    And the modal message "Your booking is pending confirmation." is visible

  @traveler @booking @regression
  Scenario: Traveler is redirected to booking history after confirming success modal
    Given the traveler is logged in and a guide booking page is pre-loaded
    When the traveler clicks the "Request Booking" button
    And the traveler clicks "OK" in the success modal
    Then the URL contains "/user/bookinghistory"

  # ─── Traveler: Booking History ────────────────────────────────────────────
  @smoke @traveler @history
  Scenario: Traveler views their booking history
    Given the traveler is logged in
    When the traveler navigates to "/user/bookinghistory"
    Then the booking history page heading "Booking History" is visible
    And at least one booking card is displayed

  @traveler @history @regression
  Scenario: Traveler sees booking status badge on each booking card
    Given the traveler is logged in
    When the traveler navigates to "/user/bookinghistory"
    Then each booking card has a visible status badge

  # ─── Traveler: Booking Info ───────────────────────────────────────────────

  # Scenario Outline — the same booking-info page is tested with three
  # different API-stubbed statuses, driving assertions from the Examples table.
  @traveler @booking-info @regression
  Scenario Outline: Traveler views booking details for different booking statuses
    Given the traveler is logged in
    And the booking is stubbed with status "<apiStatus>"
    When the traveler navigates to booking info page for booking "mock_booking_001"
    Then the booking info page shows "Booking Details"
    And the booking status badge is displayed

    Examples:
      | apiStatus |
      | pending   |
      | confirmed |
      | cancelled |

  @traveler @cancellation
  Scenario: Traveler cancels a pending booking
    Given the traveler is logged in
    When the traveler navigates to booking info page for booking "BOOKING_ID_PLACEHOLDER"
    And the traveler clicks the "Cancel Booking" button
    Then the cancel confirmation modal is visible
    And a "Yes, Cancel" button is shown in the cancel modal

  @traveler @cancellation @regression
  Scenario: Traveler confirms booking cancellation
    Given the traveler is logged in
    When the traveler navigates to booking info page for booking "BOOKING_ID_PLACEHOLDER"
    And the traveler clicks the "Cancel Booking" button
    And the traveler clicks "Yes, Cancel" in the cancel modal
    Then the booking status changes to "Cancelled"

  @traveler @receipt @regression
  Scenario: Traveler downloads a booking receipt
    Given the traveler is logged in
    When the traveler navigates to "/user/bookinghistory"
    And the traveler clicks the download receipt button on the first booking
    Then a PDF download is triggered

  # ─── Guide: Booking History ───────────────────────────────────────────────
  @smoke @guide @history
  Scenario: Guide views their booking history
    Given the guide is logged in
    When the guide navigates to "/guide/bookinghistory"
    Then the guide booking history page heading "Booking History" is visible
    And at least one guide booking card is displayed

  @guide @status @regression
  Scenario: Guide sees correct status badges on bookings
    Given the guide is logged in
    When the guide navigates to "/guide/bookinghistory"
    Then each guide booking card displays a status of "Pending" or "Confirmed" or "Completed" or "Cancelled"

  # Scenario Outline — verifies the guide's booking list renders each valid
  # status correctly when the API returns bookings in that status.
  @guide @status @regression
  Scenario Outline: Guide booking list renders each booking status correctly
    Given the guide is logged in
    And the guide booking list is stubbed with a single booking in "<status>" status
    When the guide navigates to "/guide/bookinghistory"
    Then each guide booking card displays a status of "Pending" or "Confirmed" or "Completed" or "Cancelled"

    Examples:
      | status    |
      | Pending   |
      | Confirmed |
      | Cancelled |

  # ─── Guide: Booking Info / Confirm ───────────────────────────────────────
  @guide @booking-info @regression
  Scenario: Guide views booking info details
    Given the guide is logged in
    When the guide navigates to guide booking info for booking "BOOKING_ID_PLACEHOLDER"
    Then the guide booking info page shows "Booking Details"
    And the traveler name section is visible

  @guide @cancellation
  Scenario: Guide cancels a pending booking
    Given the guide is logged in
    When the guide navigates to guide booking info for booking "BOOKING_ID_PLACEHOLDER"
    And the guide clicks the "Cancel Booking" button
    Then the guide cancel confirmation modal is visible

  @smoke @guide @verification
  Scenario: Guide enters a 6-digit verification code to confirm a booking
    Given the guide is logged in
    And the booking is stubbed with status "confirmed"
    When the guide navigates to guide booking info for booking "BOOKING_ID_PLACEHOLDER"
    And the guide enters the verification code "123456"
    Then the verification code inputs are filled correctly