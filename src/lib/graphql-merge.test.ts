import { describe, it, expect } from 'vitest';

import type { Definition } from './graphql-parser.js';

import { mergeDefinitions } from './graphql-merge.js';
import type { MergedDefinition } from './graphql-merge.js';

describe('mergeDefinitions', () => {
	it('merges definitions by filename and orders queries before fragments', () => {
		const definitions: Definition[] = [
			{
				type: 'query',
				filename: 'first.js',
				content: 'query FirstQuery {\n        field1\n      }'
			},
			{
				type: 'fragment',
				filename: 'first.js',
				content: 'fragment FirstFragment on MyType {\n        field2\n      }'
			},
			{
				type: 'query',
				filename: 'second.js',
				content: 'query SecondQuery {\n        field3\n      }'
			}
		];

		const expected: MergedDefinition[] = [
			{
				filename: 'first.js',
				content:
					'graphql`query FirstQuery {\n        field1\n      }`\ngraphql`fragment FirstFragment on MyType {\n        field2\n      }`'
			},
			{
				filename: 'second.js',
				content: 'graphql`query SecondQuery {\n        field3\n      }`'
			}
		];

		expect(mergeDefinitions(definitions)).toEqual(expected);
	});

	it('orders queries before fragments even if they are provided in reverse order', () => {
		const definitions: Definition[] = [
			{
				type: 'fragment',
				filename: 'a.js',
				content: 'fragment AFragment on AType {\n        aField\n      }'
			},
			{
				type: 'query',
				filename: 'a.js',
				content: 'query AQuery {\n        aField\n      }'
			}
		];

		const expected: MergedDefinition[] = [
			{
				filename: 'a.js',
				content:
					'graphql`query AQuery {\n        aField\n      }`\ngraphql`fragment AFragment on AType {\n        aField\n      }`'
			}
		];

		expect(mergeDefinitions(definitions)).toEqual(expected);
	});

	it('sorts files alphabetically by filename', () => {
		const definitions: Definition[] = [
			{
				type: 'query',
				filename: 'b.js',
				content: 'query BQuery {\n        fieldB\n      }'
			},
			{
				type: 'query',
				filename: 'a.js',
				content: 'query AQuery {\n        fieldA\n      }'
			}
		];

		const expected: MergedDefinition[] = [
			{
				filename: 'a.js',
				content: 'graphql`query AQuery {\n        fieldA\n      }`'
			},
			{
				filename: 'b.js',
				content: 'graphql`query BQuery {\n        fieldB\n      }`'
			}
		];

		expect(mergeDefinitions(definitions)).toEqual(expected);
	});

	it('returns an empty array for empty input', () => {
		const definitions: any[] = [];
		const expected: any[] = [];
		expect(mergeDefinitions(definitions)).toEqual(expected);
	});
});
