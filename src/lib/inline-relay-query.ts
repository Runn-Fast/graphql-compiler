import { parse, print, Kind } from 'graphql';
import type {
	DocumentNode,
	FragmentDefinitionNode,
	SelectionNode,
	SelectionSetNode,
	FieldNode,
	InlineFragmentNode,
	DefinitionNode,
	OperationDefinitionNode,
	ArgumentNode,
	ValueNode
} from 'graphql';

/**
 * Type guard to check if a node is a FieldNode
 */
function isFieldNode(node: SelectionNode): node is FieldNode {
	return node.kind === Kind.FIELD;
}

/**
 * Type guard to check if a node is an InlineFragmentNode
 */
function isInlineFragmentNode(node: SelectionNode): node is InlineFragmentNode {
	return node.kind === Kind.INLINE_FRAGMENT;
}

/**
 * Normalize a GraphQL value node by removing position information.
 */
function normalizeValueNode(value: ValueNode): unknown {
	switch (value.kind) {
		case 'ObjectValue':
      return value.fields.reduce<Record<string, unknown>>((obj, field) => {
        obj[field.name.value] = normalizeValueNode(field.value);
        return obj;
      }, {})

		case 'ListValue':
			return value.values.map(normalizeValueNode);

		case 'Variable':
			return { type: 'variable', name: value.name.value };

		case 'BooleanValue':
		case 'StringValue':
		case 'IntValue':
		case 'FloatValue':
		case 'EnumValue':
			return value.value;

		case 'NullValue':
			return null;

		default:
			return null;
	}
}

/**
 * Create a unique, deterministic key for GraphQL arguments.
 */
function createArgumentKey(args: readonly ArgumentNode[] | undefined): string {
	if (!args || args.length === 0) return '';

	const normalizedArgs = args.map((arg) => ({
		name: arg.name.value,
		value: normalizeValueNode(arg.value)
	}));

	// Sort by name for deterministic output
	normalizedArgs.sort((a, b) => a.name.localeCompare(b.name));
	return JSON.stringify(normalizedArgs);
}

/**
 * Create a unique key for a field selection.
 */
function createFieldKey(field: FieldNode): string {
	const name = field.alias ? field.alias.value : field.name.value;
	return name + createArgumentKey(field.arguments);
}

/**
 * Create a unique key for an inline fragment.
 */
function createInlineFragmentKey(fragment: InlineFragmentNode): string {
	const typeName = fragment.typeCondition ? fragment.typeCondition.name.value : '';
	return `inline:${typeName}`;
}

/**
 * Build a map from fragment name to FragmentDefinitionNode.
 */
function buildFragmentMap(ast: DocumentNode): Record<string, FragmentDefinitionNode> {
	const fragmentMap: Record<string, FragmentDefinitionNode> = {};

	for (const def of ast.definitions) {
		if (def.kind === Kind.FRAGMENT_DEFINITION) {
			fragmentMap[def.name.value] = def;
		}
	}

	return fragmentMap;
}

/**
 * Merge two selection sets.
 */
function mergeSelectionSets(set1: SelectionSetNode, set2: SelectionSetNode): SelectionSetNode {
	const combined = [...set1.selections, ...set2.selections];
	return {
		kind: Kind.SELECTION_SET,
		selections: deduplicateSelections(combined)
	};
}

/**
 * Deduplicate and merge selections.
 */
function deduplicateSelections(selections: readonly SelectionNode[]): SelectionNode[] {
	// Use Map for better performance with complex keys
	const selectionMap = new Map<string, SelectionNode>();

	for (const selection of selections) {
		if (isFieldNode(selection)) {
			const key = createFieldKey(selection);

			if (selectionMap.has(key)) {
				const existing = selectionMap.get(key) as FieldNode;

				// Merge selection sets if either has one
				if (selection.selectionSet || existing.selectionSet) {
					const mergedField: FieldNode = {
						...existing,
						selectionSet:
							existing.selectionSet && selection.selectionSet
								? mergeSelectionSets(existing.selectionSet, selection.selectionSet)
								: existing.selectionSet || selection.selectionSet
					};

					selectionMap.set(key, mergedField);
				}
			} else {
				selectionMap.set(key, selection);
			}
		} else if (isInlineFragmentNode(selection)) {
			const key = createInlineFragmentKey(selection);

			if (selectionMap.has(key)) {
				const existing = selectionMap.get(key) as InlineFragmentNode;

				const mergedFragment: InlineFragmentNode = {
					...existing,
					selectionSet: mergeSelectionSets(existing.selectionSet, selection.selectionSet)
				};

				selectionMap.set(key, mergedFragment);
			} else {
				selectionMap.set(key, selection);
			}
		} else {
			// For FragmentSpread nodes (should be already inlined at this point)
			const key = `other:${selection.kind}:${JSON.stringify(selection)}`;
			selectionMap.set(key, selection);
		}
	}

	return Array.from(selectionMap.values());
}

/**
 * Recursively inline fragment spreads in a node with selection set.
 */
function inlineFragmentSpreads<T extends { selectionSet?: SelectionSetNode }>(
	node: T,
	fragmentMap: Record<string, FragmentDefinitionNode>
): T {
	if (!node.selectionSet) return node;

	const newSelections: SelectionNode[] = [];

	for (const selection of node.selectionSet.selections) {
		if (selection.kind === Kind.FRAGMENT_SPREAD) {
			const fragmentName = selection.name.value;
			const fragment = fragmentMap[fragmentName];

			if (!fragment) {
				throw new Error(`Fragment "${fragmentName}" not found`);
			}

			// Recursively inline the fragment's selections
			const inlinedFragment = inlineFragmentSpreads(fragment, fragmentMap);
			if (inlinedFragment.selectionSet) {
				newSelections.push(...inlinedFragment.selectionSet.selections);
			}
		} else if (isFieldNode(selection) || isInlineFragmentNode(selection)) {
			// Recursively process nested selections
			newSelections.push(inlineFragmentSpreads(selection, fragmentMap));
		} else {
			newSelections.push(selection);
		}
	}

	// Return new node with deduplicated selections
	return {
		...node,
		selectionSet: {
			kind: Kind.SELECTION_SET,
			selections: deduplicateSelections(newSelections)
		}
	};
}

/**
 * Inline fragments in a GraphQL document AST.
 */
function inlineFragmentsInDocument(ast: DocumentNode): DocumentNode {
	const fragmentMap = buildFragmentMap(ast);

	// Only process operation definitions (queries, mutations, subscriptions)
	const newDefinitions = ast.definitions
		.filter((def): def is OperationDefinitionNode => {
			return def.kind === Kind.OPERATION_DEFINITION;
		})
		.map((def) => inlineFragmentSpreads(def, fragmentMap));

	return {
		kind: Kind.DOCUMENT,
		definitions: newDefinitions as readonly DefinitionNode[]
	};
}

/**
 * Inline fragments in a Relay query string.
 */
function inlineRelayQueryFromString(queryText: string): string {
	const ast = parse(queryText);
	const inlinedAST = inlineFragmentsInDocument(ast);
	return print(inlinedAST);
}

export { inlineRelayQueryFromString };
