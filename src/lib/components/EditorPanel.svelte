<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorState } from '@codemirror/state';
	import { basicSetup } from 'codemirror';
	import { EditorView } from '@codemirror/view';
	import { graphql as graphqlSyntax } from 'cm6-graphql';
	import { inlineRelayQueryFromString } from '$lib/inline-relay-query.js';

	type Props = {
		tabId: string;
		operationText?: string;
		optimizedOperationText?: string;
		onUpdate?: (tabId: string, operationText: string, optimizedOperationText: string) => void;
		onStatus?: (status: {
			loading?: boolean;
			errorMessage?: string;
			successMessage?: string;
		}) => void;
	};

	const {
		tabId,
		operationText = '',
		optimizedOperationText = '',
		onUpdate,
		onStatus
	}: Props = $props();

	let inputView: EditorView;
	let outputView: EditorView;
	let inputEditor: HTMLDivElement;
	let outputEditor: HTMLDivElement;
	let compilationTimer: ReturnType<typeof setTimeout>;

	// Function to compile the query
	async function compileQuery(query: string) {
		if (!query || query.trim() === '') {
			// Don't try to compile empty queries
			onUpdate?.(tabId, query, '');
			return;
		}

		onStatus?.({ loading: true, errorMessage: undefined, successMessage: undefined });

		try {
			const compiled = inlineRelayQueryFromString(query);
			const nextOptimizedOperationText = compiled;

			// Update the output editor
			if (outputView) {
				outputView.dispatch({
					changes: { from: 0, to: outputView.state.doc.length, insert: nextOptimizedOperationText }
				});
			}

			// Update the parent component
			onUpdate?.(tabId, query, compiled);

			onStatus?.({ loading: false, successMessage: 'Query compiled successfully!' });
		} catch (err: unknown) {
			console.error(err);
			const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';

			// Format the error message to be more human-readable
			let userFriendlyError = errorMessage;
			if (errorMessage.includes('SyntaxError')) {
				userFriendlyError = 'Syntax Error: Please check your GraphQL syntax';
			} else if (errorMessage.includes('Cannot find fragment')) {
				userFriendlyError = 'Fragment Error: The referenced fragment could not be found';
			} else if (errorMessage.includes('Expected Name')) {
				userFriendlyError = 'Syntax Error: Expected a name in your GraphQL query';
			}

			// Update the output editor with the error
			if (outputView) {
				outputView.dispatch({
					changes: {
						from: 0,
						to: outputView.state.doc.length,
						insert: `Error: ${userFriendlyError}`
					}
				});
			}

			onStatus?.({ loading: false, errorMessage: userFriendlyError });
		}
	}

	// Function to copy compiled result to clipboard
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(optimizedOperationText);
			onStatus?.({ successMessage: 'Copied to clipboard!' });
			setTimeout(() => onStatus?.({ successMessage: undefined }), 3000);
		} catch (err: unknown) {
			console.warn(err);
			onStatus?.({ errorMessage: 'Failed to copy to clipboard' });
		}
	}

	onMount(() => {
		// Setup input editor with auto-compile
		inputView = new EditorView({
			parent: inputEditor,
			state: EditorState.create({
				doc: operationText,
				extensions: [
					basicSetup,
					graphqlSyntax(),
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							const newText = update.state.doc.toString();

							onUpdate?.(tabId, newText, optimizedOperationText);

							// Add a small delay to prevent compiling on every keystroke
							clearTimeout(compilationTimer);
							compilationTimer = setTimeout(() => {
								compileQuery(newText);
							}, 300);
						}
					})
				]
			})
		});

		// Setup output editor (read-only)
		outputView = new EditorView({
			parent: outputEditor,
			state: EditorState.create({
				doc: optimizedOperationText,
				extensions: [basicSetup, graphqlSyntax(), EditorView.editable.of(false)]
			})
		});

		// Initial compilation if we have content
		if (operationText && operationText.trim() !== '') {
			compileQuery(operationText);
		} else if (optimizedOperationText) {
			// If we have optimizedOperationText but no operationText (shouldn't happen)
			// update the output editor to show it
			outputView.dispatch({
				changes: { from: 0, to: outputView.state.doc.length, insert: optimizedOperationText }
			});
		}
	});

	onDestroy(() => {
		if (inputView) inputView.destroy();
		if (outputView) outputView.destroy();
		if (compilationTimer) clearTimeout(compilationTimer);
	});
</script>

<div class="editors-container">
	<div class="editor-card">
		<div class="editor-header">
			<h2 class="editor-title">GraphQL Operation</h2>
			<p class="editor-description">Enter a GraphQL query with fragments to inline.</p>
		</div>
		<div class="editor-content" bind:this={inputEditor}></div>
	</div>

	<div class="editor-card">
		<div class="editor-header">
			<div class="editor-header-with-button">
				<div>
					<h2 class="editor-title">Compiled Result</h2>
					<p class="editor-description">The compiled inline query.</p>
				</div>
				<button
					class="btn btn-icon"
					onclick={copyToClipboard}
					disabled={!optimizedOperationText}
					title="Copy Result to Clipboard"
					aria-label="Copy Result to Clipboard"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
					</svg>
				</button>
			</div>
		</div>
		<div class="editor-content" bind:this={outputEditor}></div>
	</div>
</div>

<style>
	.editors-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		height: 100%;
	}

	.editor-card {
		background: white;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.editor-header {
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
		background-color: #f8fafc;
		flex-shrink: 0;
	}

	.editor-header-with-button {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.editor-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.editor-description {
		font-size: 0.875rem;
		color: #64748b;
		margin: 0;
	}

	.editor-content {
		flex: 1;
		overflow: auto;
		position: relative;
	}

	:global(.cm-editor) {
		height: 100%;
	}

	:global(.cm-scroller) {
		overflow: auto;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-icon {
		padding: 0.5rem;
		background-color: transparent;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-icon:hover:not(:disabled) {
		background-color: #f3f4f6;
	}

	.btn-icon:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.editors-container {
			grid-template-columns: 1fr;
		}
	}
</style>
