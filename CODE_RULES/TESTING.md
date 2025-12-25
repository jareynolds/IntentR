# INTENT Testing Framework

**Part of**: MAIN_SWDEV_PLAN.md
**Framework**: INTENT (Scaled Agile With AI)

---

## Gherkin Syntax Overview

Gherkin is a Business Readable, Domain Specific Language that describes software behavior without detailing implementation. It serves as both documentation and automated test specification.

### Core Keywords

| Keyword | Purpose | Example |
|---------|---------|---------|
| `Feature` | High-level description of a software feature | `Feature: User Authentication` |
| `Scenario` | Concrete example of business rule | `Scenario: Successful login with valid credentials` |
| `Given` | Precondition/context setup | `Given a registered user exists` |
| `When` | Action/event that triggers behavior | `When the user enters valid credentials` |
| `Then` | Expected outcome/assertion | `Then the user should be logged in` |
| `And` | Additional step (continues previous keyword) | `And a session token should be created` |
| `But` | Negative additional step | `But no error message should appear` |
| `Background` | Steps run before each scenario | Common setup steps |
| `Scenario Outline` | Template with variable examples | Data-driven testing |
| `Examples` | Data table for Scenario Outline | Test data variations |

### Gherkin Best Practices
1. **Write scenarios from user perspective** - Focus on business value, not technical implementation
2. **Keep scenarios independent** - Each scenario should be executable in isolation
3. **Use declarative style** - Describe WHAT, not HOW
4. **One behavior per scenario** - Single assertion focus
5. **Use meaningful data** - Realistic examples over generic placeholders

### Example Gherkin Feature

```gherkin
@TST-123456
Feature: User Login
  As a registered user
  I want to log into the application
  So that I can access my personalized dashboard

  Background:
    Given the application is running
    And the database is available

  @TS-456789 @critical @smoke
  Scenario: Successful login with valid credentials
    Given a registered user with email "user@example.com"
    And the user has password "SecurePass123"
    When the user navigates to the login page
    And the user enters email "user@example.com"
    And the user enters password "SecurePass123"
    And the user clicks the login button
    Then the user should be redirected to the dashboard
    And a welcome message should display "Welcome back!"
    And a session token should be created

  @TS-456790 @critical
  Scenario: Failed login with invalid password
    Given a registered user with email "user@example.com"
    When the user attempts to login with password "WrongPassword"
    Then an error message should display "Invalid credentials"
    And the user should remain on the login page
    But no session token should be created

  @TS-456791
  Scenario Outline: Login validation rules
    Given a user on the login page
    When the user enters email "<email>"
    And the user enters password "<password>"
    And the user clicks login
    Then the system should respond with "<result>"

    Examples:
      | email              | password      | result                    |
      | invalid-email      | ValidPass123  | Invalid email format      |
      | user@example.com   | short         | Password too short        |
      | user@example.com   | ValidPass123  | Login successful          |
      |                    | ValidPass123  | Email is required         |
```

## Test Scenario ID Format

### ID Structure
- **Format**: `TS-XXXXXX` (6-digit unique identifier)
- **Prefix**: `TS` = Test Scenario
- **Suite Format**: `TST-XXXXXX` (6-digit unique identifier)
- **Prefix**: `TST` = Test Suite

### Tagging Convention
| Tag Type | Format | Example | Purpose |
|----------|--------|---------|---------|
| Scenario ID | `@TS-XXXXXX` | `@TS-456789` | Unique scenario identifier |
| Suite ID | `@TST-XXXXXX` | `@TST-123456` | Test suite grouping |
| Requirement Link | `@FR-XXXXXX` or `@NFR-XXXXXX` | `@FR-789012` | Traceability to requirements |
| Priority | `@critical`, `@high`, `@medium`, `@low` | `@critical` | Execution priority |
| Test Type | `@smoke`, `@regression`, `@integration`, `@e2e` | `@smoke` | Test classification |
| Automation | `@automated`, `@manual`, `@pending` | `@automated` | Automation status |

## Test Status Values

### Test Scenario Status Flow
```
Draft → Ready for Execution → In Execution → Passed/Failed/Blocked → Verified
```

| Status | Description | Allowed Transitions |
|--------|-------------|---------------------|
| `Draft` | Scenario being written | → Ready for Execution |
| `Ready for Execution` | Scenario approved for testing | → In Execution |
| `In Execution` | Currently being executed | → Passed, Failed, Blocked |
| `Passed` | All steps successful | → Verified, Ready for Execution (re-test) |
| `Failed` | One or more steps failed | → Ready for Execution (after fix) |
| `Blocked` | Cannot execute due to blocker | → Ready for Execution (after unblock) |
| `Verified` | Passed and stakeholder verified | Terminal state |

## Test Coverage Requirements

### Coverage Metrics
| Metric | Definition | Target |
|--------|------------|--------|
| Requirement Coverage | % of requirements with at least one test scenario | 100% |
| Scenario Pass Rate | % of executed scenarios that passed | >= 80% |
| Critical Scenario Pass Rate | % of @critical scenarios that passed | 100% |
| Automation Rate | % of scenarios that are automated | >= 70% |

### Coverage Calculation
```
Requirement Coverage = (Requirements with Tests / Total Requirements) x 100
Scenario Pass Rate = (Passed Scenarios / Executed Scenarios) x 100
```

## Framework Integration

### Supported Test Frameworks

| Language | Framework | Gherkin Support |
|----------|-----------|-----------------|
| Go | godog | Native Gherkin |
| JavaScript/TypeScript | Cucumber.js | Native Gherkin |
| React | Jest + Cucumber | Via jest-cucumber |
| Python | Behave | Native Gherkin |
| Java | Cucumber-JVM | Native Gherkin |

### Go Integration Example (godog)

```go
package testing

import (
    "github.com/cucumber/godog"
)

type loginContext struct {
    user     *User
    response *Response
    err      error
}

func (ctx *loginContext) aRegisteredUserWithEmail(email string) error {
    ctx.user = &User{Email: email}
    return nil
}

func (ctx *loginContext) theUserAttemptsToLoginWithPassword(password string) error {
    ctx.response, ctx.err = authService.Login(ctx.user.Email, password)
    return nil
}

func (ctx *loginContext) theUserShouldBeLoggedIn() error {
    if ctx.response == nil || !ctx.response.Success {
        return fmt.Errorf("expected successful login")
    }
    return nil
}

func InitializeScenario(ctx *godog.ScenarioContext) {
    lc := &loginContext{}

    ctx.Step(`^a registered user with email "([^"]*)"$`, lc.aRegisteredUserWithEmail)
    ctx.Step(`^the user attempts to login with password "([^"]*)"$`, lc.theUserAttemptsToLoginWithPassword)
    ctx.Step(`^the user should be logged in$`, lc.theUserShouldBeLoggedIn)
}
```

### React/TypeScript Integration Example (jest-cucumber)

```typescript
import { defineFeature, loadFeature } from 'jest-cucumber';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../pages/LoginPage';

const feature = loadFeature('./features/login.feature');

defineFeature(feature, (test) => {
  test('Successful login with valid credentials', ({ given, when, then, and }) => {
    given('a registered user with email "user@example.com"', () => {
      // Setup mock user in test database
    });

    when('the user navigates to the login page', () => {
      render(<LoginPage />);
    });

    and(/^the user enters email "(.*)"$/, (email: string) => {
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
    });

    and(/^the user enters password "(.*)"$/, (password: string) => {
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
    });

    and('the user clicks the login button', () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
    });

    then('the user should be redirected to the dashboard', async () => {
      expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    });
  });
});
```

### Running Tests

```bash
# Run all Go tests
go test ./...

# Run Gherkin/BDD tests with godog
go test -v ./internal/testing/... -godog.format=pretty

# Run with coverage
go test -cover ./...

# Run specific tags
go test ./... -godog.tags=@smoke
go test ./... -godog.tags=@critical

# Run React/TypeScript tests with jest-cucumber
npm test -- --testPathPattern=steps

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```
