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
      people(where: {is_active: {_eq: true}}) {
        id
        email
      }
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
    people(where: {is_active: {_eq: true}}) {
      id
      name
    }
  }
  permissions
}`;

describe('inlineRelayQueryFromString', () => {
	it('inlines fragments in a Relay query string', () => {
		const inlined = inlineRelayQueryFromString(relayQueryText);
		expect(inlined).toMatchInlineSnapshot(`
			"query NavigationQuery {
			  current_user {
			    id
			    permissions
			    account {
			      id
			      account_type
			      people(where: {is_active: {_eq: true}}) {
			        id
			        email
			        name
			      }
			      timesheets_protected
			    }
			    email
			  }
			}"
		`);
	});
});
