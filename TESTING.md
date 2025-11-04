# Testing Guide

## Overview

This project uses **Jest** for unit and integration testing, along with **Supertest** for HTTP endpoint testing.

## Project Structure (Refactored)

```
botCheckin/
├── src/
│   ├── config/
│   │   └── env.js              # Environment configuration
│   ├── controllers/
│   │   └── webhook.controller.js  # Webhook request handlers
│   ├── services/
│   │   ├── auth.service.js     # Authentication & sessions
│   │   ├── checkin.service.js  # Check-in business logic
│   │   ├── database.service.js # Database operations
│   │   └── whatsapp.service.js # WhatsApp messaging & templates
│   ├── utils/
│   │   └── helpers.js          # Helper functions
│   ├── app.js                  # Express app configuration
│   └── server.js               # Server entry point
├── tests/
│   ├── unit/
│   │   ├── helpers.test.js
│   │   └── auth.service.test.js
│   └── integration/
│       └── webhook.test.js
├── index.js                    # Main entry point (redirects to src/server.js)
└── package.json
```

## Architecture Benefits

### ✅ Separation of Concerns
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic & external integrations
- **Database**: Isolated data access layer
- **Utils**: Reusable helper functions
- **Config**: Centralized configuration

### ✅ Better Testability
- Each module can be tested independently
- Easy to mock dependencies
- Clear boundaries between layers

### ✅ Maintainability
- Changes to one layer don't affect others
- Easy to locate and fix bugs
- Scalable codebase structure

## Installation

Install test dependencies:

```bash
npm install
```

This will install:
- `jest` - Testing framework
- `supertest` - HTTP assertion library

## Running Tests

### Run all tests with coverage:
```bash
npm test
```

### Run tests in watch mode (for development):
```bash
npm run test:watch
```

### Run only unit tests:
```bash
npm run test:unit
```

### Run only integration tests:
```bash
npm run test:integration
```

## Test Coverage

The test suite includes:

### Unit Tests

#### `tests/unit/helpers.test.js`
- ✅ Phone number normalization
- ✅ XML escaping
- ✅ TwiML message generation
- ✅ Timestamp formatting

#### `tests/unit/auth.service.test.js`
- ✅ Admin password validation
- ✅ User login (staff, manager, supervisor)
- ✅ User registration with role validation
- ✅ Session management
- ✅ Auto-login for staff users
- ✅ Password requirement for admin roles

### Integration Tests

#### `tests/integration/webhook.test.js`
- ✅ User registration flow
- ✅ Login/logout functionality
- ✅ Check-in actions (checkin, break, return, checkout)
- ✅ Supervisor notifications
- ✅ User history retrieval
- ✅ Manager search functionality
- ✅ Manager edit/delete operations
- ✅ Error handling (missing phone, invalid role, etc.)
- ✅ Health endpoint

## Writing New Tests

### Unit Test Example

```javascript
const myService = require('../../src/services/my.service');

// Mock dependencies
jest.mock('../../src/services/database.service', () => ({
  UserDB: {
    findByPhone: jest.fn()
  }
}));

describe('My Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myService.doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Integration Test Example

```javascript
const request = require('supertest');
const app = require('../../src/app');

describe('POST /webhook', () => {
  it('should return success', async () => {
    const response = await request(app)
      .post('/webhook')
      .send({
        Body: 'HELLO',
        From: 'whatsapp:+15551234567'
      })
      .expect(200)
      .expect('Content-Type', /xml/);

    expect(response.text).toContain('expected text');
  });
});
```

## Mocking Strategy

### Database Mocking
All database operations are mocked in tests to:
- Avoid real database I/O
- Speed up test execution
- Ensure test isolation

### WhatsApp Service Mocking
Twilio API calls are mocked to:
- Prevent real SMS/WhatsApp sends during tests
- Verify message content and recipients
- Test error handling

## Coverage Report

After running `npm test`, view the coverage report:

```bash
# Open in browser (auto-generated)
coverage/lcov-report/index.html
```

Target coverage: **>80%** for all modules

## Continuous Integration

For CI/CD pipelines (GitHub Actions, etc.), add:

```yaml
- name: Run tests
  run: npm test

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Testing Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **One assertion per test**: Keep tests focused
3. **Clear test names**: Describe what is being tested
4. **Mock external dependencies**: Database, APIs, etc.
5. **Clean up after tests**: Use `beforeEach`/`afterEach`
6. **Test edge cases**: Empty inputs, errors, etc.

## Debugging Tests

Run a single test file:
```bash
npx jest tests/unit/helpers.test.js
```

Run tests with verbose output:
```bash
npx jest --verbose
```

Run tests with debugging:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Common Issues

### SQLite Native Module Error
If you get errors about `better-sqlite3`, rebuild it:
```bash
npm rebuild better-sqlite3
```

### Tests Timing Out
Increase Jest timeout in `package.json`:
```json
"jest": {
  "testTimeout": 10000
}
```

## Future Improvements

- [ ] Add E2E tests with real Twilio sandbox
- [ ] Add performance tests
- [ ] Add snapshot testing for TwiML responses
- [ ] Add mutation testing
- [ ] Improve code coverage to >90%

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
