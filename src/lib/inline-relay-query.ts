import { parse, print } from 'graphql';
import type {
	DocumentNode,
	FragmentDefinitionNode,
	SelectionNode,
	SelectionSetNode,
	FieldNode,
	InlineFragmentNode,
	DefinitionNode,
	OperationDefinitionNode
} from 'graphql';

/**
 * Build a map from fragment name to FragmentDefinitionNode.
 */
function buildFragmentMap(ast: DocumentNode): Record<string, FragmentDefinitionNode> {
	const fragmentMap: Record<string, FragmentDefinitionNode> = {};
	ast.definitions.forEach((def) => {
		if (def.kind === 'FragmentDefinition') {
			fragmentMap[def.name.value] = def;
		}
	});
	return fragmentMap;
}

/**
 * Deduplicate and merge selections.
 */
function mergeSelections(selections: readonly SelectionNode[]): SelectionNode[] {
	const merged: SelectionNode[] = [];
	const seen = new Map<string, SelectionNode>();

	selections.forEach((selection) => {
		if (selection.kind === 'Field') {
			const alias = selection.alias ? selection.alias.value : selection.name.value;
			const key = alias + JSON.stringify(selection.arguments || []);
			if (seen.has(key)) {
				const existing = seen.get(key) as FieldNode;
				if (selection.selectionSet) {
					// Create a new field node with merged selection set instead of modifying directly
					const newField: FieldNode = {
						...existing,
						selectionSet: existing.selectionSet
							? mergeSelectionSets(existing.selectionSet, selection.selectionSet)
							: selection.selectionSet
					};
					// Update the seen map and replace in merged array
					seen.set(key, newField);
					const index = merged.findIndex(
						(node) => node.kind === 'Field' && (node.alias?.value || node.name.value) === alias
					);
					if (index !== -1) {
						merged[index] = newField;
					}
				}
			} else {
				seen.set(key, selection);
				merged.push(selection);
			}
		} else if (selection.kind === 'InlineFragment') {
			const typeName = selection.typeCondition ? selection.typeCondition.name.value : '';
			const key = 'inline:' + typeName;
			if (seen.has(key)) {
				const existing = seen.get(key) as InlineFragmentNode;
				// Create a new inline fragment with merged selection set
				const newFragment: InlineFragmentNode = {
					...existing,
					selectionSet: mergeSelectionSets(existing.selectionSet, selection.selectionSet)
				};
				// Update the seen map and replace in merged array
				seen.set(key, newFragment);
				const index = merged.findIndex(
					(node) =>
						node.kind === 'InlineFragment' && (node.typeCondition?.name.value || '') === typeName
				);
				if (index !== -1) {
					merged[index] = newFragment;
				}
			} else {
				seen.set(key, selection);
				merged.push(selection);
			}
		} else {
			// For any other kinds (normally FragmentSpreads shouldn't remain after inlining)
			merged.push(selection);
		}
	});

	return merged;
}

/**
 * Merge two selection sets.
 */
function mergeSelectionSets(
	selSet1: SelectionSetNode,
	selSet2: SelectionSetNode
): SelectionSetNode {
	const combined = [...selSet1.selections, ...selSet2.selections];
	const mergedSelections = mergeSelections(combined);
	return {
		...selSet1,
		selections: mergedSelections
	};
}

/**
 * Recursively inline fragment spreads in a node.
 */
function inlineFragments<T extends { selectionSet?: SelectionSetNode }>(
	node: T,
	fragmentMap: Record<string, FragmentDefinitionNode>
): T {
	if (!node.selectionSet) return node;

	let selections: SelectionNode[] = [];
	node.selectionSet.selections.forEach((selection) => {
		if (selection.kind === 'FragmentSpread') {
			const fragmentName = selection.name.value;
			const fragment = fragmentMap[fragmentName];
			if (!fragment) {
				throw new Error(`Fragment ${fragmentName} not found`);
			}
			// Recursively inline the fragment's selections.
			const inlinedFragment = inlineFragments(fragment, fragmentMap);
			selections.push(...(inlinedFragment.selectionSet?.selections || []));
		} else if (selection.kind === 'Field' || selection.kind === 'InlineFragment') {
			selections.push(inlineFragments(selection, fragmentMap));
		} else {
			selections.push(selection);
		}
	});

	// Deduplicate and merge selections.
	selections = mergeSelections(selections);

	return {
		...node,
		selectionSet: {
			...node.selectionSet,
			selections
		}
	};
}

/**
 * Inline fragments in a Relay query AST.
 */
function inlineRelayQueryFromAST(ast: DocumentNode): DocumentNode {
	const fragmentMap = buildFragmentMap(ast);
	const newDefinitions = ast.definitions
		.filter((def): def is OperationDefinitionNode => {
			// Filter to only keep operation definitions (queries, mutations, subscriptions)
			return def.kind !== 'FragmentDefinition' && 'operation' in def; // Ensure the node has an operation property
		})
		.map((def) => inlineFragments(def, fragmentMap) as OperationDefinitionNode);

	return {
		...ast,
		definitions: newDefinitions as readonly DefinitionNode[]
	};
}

/**
 * Inline a Relay query given as a string (the original query text from params.text).
 */
function inlineRelayQueryFromString(queryText: string): string {
	const ast = parse(queryText);
	const inlinedAST = inlineRelayQueryFromAST(ast);
	return print(inlinedAST);
}

export { inlineRelayQueryFromString };
