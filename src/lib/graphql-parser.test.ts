import { describe, it, expect } from 'vitest';

import { parseGraphQLDefinitions, type Definition } from './graphql-parser';

describe('parseGraphQLDefinitions', () => {
	it('parses a simple query definition and computes a lower-cased filename', () => {
		const input = `
      query NavigationQuery {
        current_user {
          id
        }
      }
    `;
		const definitions: Definition[] = parseGraphQLDefinitions(input);
		const queries = definitions.filter((def) => def.type === 'query');
		expect(queries).toHaveLength(1);
		// "NavigationQuery" should yield "navigation.js"
		expect(queries[0].filename).toBe('Navigation.js');
		expect(queries[0].content).toContain('query NavigationQuery {');
	});

	it('parses a simple fragment definition and computes a filename from the part before underscore', () => {
		const input = `
      fragment PermissionsProvider_user on users {
        id
        email
      }
    `;
		const definitions: Definition[] = parseGraphQLDefinitions(input);
		const fragments = definitions.filter((def) => def.type === 'fragment');
		expect(fragments).toHaveLength(1);
		// "PermissionsProvider_user" should yield "PermissionsProvider.js" (preserving case)
		expect(fragments[0].filename).toBe('PermissionsProvider.js');
		expect(fragments[0].content).toContain('fragment PermissionsProvider_user on users {');
	});

	it('parses multiple definitions correctly', () => {
		const input = `
      query FirstQuery {
        field1
      }
      
      fragment FirstFragment_extra on MyType {
        field2
      }
      
      query SecondQuery {
        field3
      }
    `;
		const definitions: Definition[] = parseGraphQLDefinitions(input);
		const queries = definitions.filter((def) => def.type === 'query');
		const fragments = definitions.filter((def) => def.type === 'fragment');
		expect(queries).toHaveLength(2);
		expect(fragments).toHaveLength(1);
		// Check filenames for queries.
		const queryFilenames = queries.map((q) => q.filename);
		expect(queryFilenames).toEqual(expect.arrayContaining(['First.js', 'Second.js']));
		// Check filename for fragment.
		expect(fragments[0].filename).toBe('FirstFragment.js');
	});

	it('throws an error when there is an unmatched brace', () => {
		const input = `
      query IncompleteQuery {
        field1
    `;
		expect(() => parseGraphQLDefinitions(input)).toThrow(/No matching closing brace found/);
	});

	it('ignores non-definition text', () => {
		const input = `
      // Some comment or random text
      This is not a definition.
      query ValidQuery {
        field
      }
    `;
		const definitions: Definition[] = parseGraphQLDefinitions(input);
		const queries = definitions.filter((def) => def.type === 'query');
		expect(queries).toHaveLength(1);
		expect(queries[0].filename).toBe('Valid.js');
	});
});
