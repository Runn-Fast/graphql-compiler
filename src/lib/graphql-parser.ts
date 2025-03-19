export type Definition = {
	type: 'query' | 'fragment';
	filename: string;
	content: string;
};

export function parseGraphQLDefinitions(input: string): Definition[] {
	const definitions: Definition[] = [];
	let index = 0;
	const length = input.length;

	while (index < length) {
		// Skip whitespace and newlines.
		while (index < length && /\s/.test(input[index])) {
			index++;
		}
		if (index >= length) break;

		// Check if the current position starts with "query" or "fragment".
		if (input.startsWith('query', index) || input.startsWith('fragment', index)) {
			const startDefinition = index; // Mark start of the definition.
			const type: 'query' | 'fragment' = input.startsWith('query', index) ? 'query' : 'fragment';
			index += type.length;

			// Skip whitespace after the keyword.
			while (index < length && /\s/.test(input[index])) {
				index++;
			}

			// Extract the definition name.
			const nameMatch = /^[A-Za-z0-9_]+/.exec(input.substring(index));
			if (!nameMatch) {
				throw new Error('Could not parse definition name at position ' + index);
			}
			const name = nameMatch[0];
			index += name.length;

			// Skip until the first opening brace '{'.
			while (index < length && input[index] !== '{') {
				index++;
			}
			if (index >= length) break;

			// Extract the full block using a brace counter.
			let braceCount = 0;
			let endBlockIndex = -1;
			while (index < length) {
				if (input[index] === '{') {
					braceCount++;
				} else if (input[index] === '}') {
					braceCount--;
					if (braceCount === 0) {
						endBlockIndex = index;
						index++; // Move past the closing brace.
						break;
					}
				}
				index++;
			}
			if (endBlockIndex === -1) {
				throw new Error('No matching closing brace found for definition ' + name);
			}

			// The content includes the full definition (from the keyword to the closing brace).
			const content = input.substring(startDefinition, endBlockIndex + 1);

			// Compute the filename.
			let filename: string;
			if (type === 'query') {
				// For queries, remove the "Query" suffix (if present)
				let baseName = name;
				if (baseName.endsWith('Query')) {
					baseName = baseName.slice(0, -'Query'.length);
				}
				filename = baseName + '.js';
			} else {
				// For fragments, use the part before the first underscore (if any), preserving case.
				const underscoreIndex = name.indexOf('_');
				const baseName = underscoreIndex !== -1 ? name.substring(0, underscoreIndex) : name;
				filename = baseName + '.js';
			}

			definitions.push({ type, filename, content });
		} else {
			// Skip any text that isn't a valid definition.
			index++;
		}
	}

	return definitions;
}
