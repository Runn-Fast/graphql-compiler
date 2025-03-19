import { describe, it, expect } from 'vitest';

import { inlineRelayQueryFromString } from './inline-relay-query.js';

// Sample Relay query text with fragment spread
const relayQueryText = `query NavigationQuery {
  current_user {
    id
    permissions
    account {
      id
      account_type
    }
    ...PermissionsProvider_user
  }
}

fragment PermissionsProvider_user on users {
  id
  email
  account {
    id
    timesheets_protected
  }
  permissions
}`;

const expectedInlinedQuery = `query NavigationQuery {
  current_user {
    id
    permissions
    account {
      id
      account_type
      timesheets_protected
    }
    email
  }
}
`;

describe('inlineRelayQueryFromString', () => {
	it('inlines fragments in a Relay query string', () => {
		const inlined = inlineRelayQueryFromString(relayQueryText);
		// Remove extra whitespace/newlines for comparison.
		const normalized = inlined.replace(/\s+/g, ' ').trim();
		const normalizedExpected = expectedInlinedQuery.replace(/\s+/g, ' ').trim();
		expect(normalized).toBe(normalizedExpected);
	});
});
