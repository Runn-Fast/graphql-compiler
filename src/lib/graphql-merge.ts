import type { Definition } from './graphql-parser.js';

type MergedDefinition = {
	filename: string;
	content: string;
};

const mergeDefinitions = (definitions: Definition[]): MergedDefinition[] => {
	// Group definitions by filename
	const groups = definitions.reduce<Record<string, Definition[]>>((acc, def) => {
		(acc[def.filename] ??= []).push(def);
		return acc;
	}, {});

	// Build merged result: sort filenames alphabetically, then sort definitions in each file
	return Object.entries(groups)
		.sort(([fileA], [fileB]) => fileA.localeCompare(fileB))
		.map(([filename, defs]) => {
			defs.sort((a, b) => {
				if (a.type === b.type) {
					return a.content.localeCompare(b.content);
				}
				return a.type === 'query' ? -1 : 1;
			});
			// Wrap each definition's content with the graphql template tag
			const content = defs.map((def) => `graphql\`${def.content}\``).join('\n');
			return { filename, content };
		});
};

export { mergeDefinitions };
export type { MergedDefinition };
