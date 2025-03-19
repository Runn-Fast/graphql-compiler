<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { EditorState } from '@codemirror/state';
	import { basicSetup } from 'codemirror';
	import { EditorView } from '@codemirror/view';
	import { graphql as graphqlSyntax } from 'cm6-graphql';
	import { inlineRelayQueryFromString } from '$lib/inline-relay-query.js';

	// Default query
	let operationText = `query UserQuery($id: ID!) {
  user(id: $id) {
    ...UserFragment
    friends {
      ...UserFragment
    }
  }
}
fragment UserFragment on User {
  id
  name
  age
}`;

	let optimizedOperationText = '';
	let isLoading = false;
	let error: string | null = null;
	let success: string | null = null;
	let inputView: EditorView;
	let outputView: EditorView;
	let inputEditor: HTMLDivElement;
	let outputEditor: HTMLDivElement;
	let compilationTimer: ReturnType<typeof setTimeout>;

	// Function to compile the query
	async function compileQuery(query: string) {
		isLoading = true;
		error = null;
		success = null;

		try {
			optimizedOperationText = inlineRelayQueryFromString(query);
			outputView.dispatch({
				changes: { from: 0, to: outputView.state.doc.length, insert: optimizedOperationText }
			});
			success = 'Query compiled successfully!';
		} catch (err: unknown) {
			console.error(err);
			error = err instanceof Error ? err.message : 'An unknown error occurred';

			// Format the error message to be more human-readable
			let userFriendlyError = error;
			if (error.includes('SyntaxError')) {
				userFriendlyError = 'Syntax Error: Please check your GraphQL syntax';
			} else if (error.includes('Cannot find fragment')) {
				userFriendlyError = 'Fragment Error: The referenced fragment could not be found';
			} else if (error.includes('Expected Name')) {
				userFriendlyError = 'Syntax Error: Expected a name in your GraphQL query';
			}

			outputView.dispatch({
				changes: { from: 0, to: outputView.state.doc.length, insert: `Error: ${userFriendlyError}` }
			});
		} finally {
			isLoading = false;
		}
	}

	// Function to copy compiled result to clipboard
	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(optimizedOperationText);
			success = 'Copied to clipboard!';
			setTimeout(() => (success = null), 3000);
		} catch (err: unknown) {
			console.warn(err);
			error = 'Failed to copy to clipboard';
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
							operationText = update.state.doc.toString();
							// Add a small delay to prevent compiling on every keystroke
							clearTimeout(compilationTimer);
							compilationTimer = setTimeout(() => {
								compileQuery(operationText);
							}, 100);
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

		// Initial compilation
		compileQuery(operationText);

		return () => {
			inputView.destroy();
			outputView.destroy();
		};
	});
</script>

<div class="app-container">
	<header>
		<div class="container">
			<div class="logo">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="16 18 22 12 16 6"></polyline>
					<polyline points="8 6 2 12 8 18"></polyline>
				</svg>
				GraphQL Query/Fragment Inliner
			</div>
		</div>
	</header>

	<div class="main-content">
		<div class="container full-height">
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
								on:click={copyToClipboard}
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
		</div>
	</div>

	<footer>
		{#if isLoading}
			<div class="status status-loading" transition:fade>
				<span class="spinner"></span>
				Compiling...
			</div>
		{:else if error}
			<div class="status status-error" transition:fade>
				{error}
			</div>
		{:else if success}
			<div class="status status-success" transition:fade>
				{success}
			</div>
		{/if}
	</footer>
</div>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
		overflow: hidden;
	}

	:global(body) {
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell,
			'Helvetica Neue', sans-serif;
		background-color: #f9fafb;
		color: #1f2937;
	}

	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	header {
		background-color: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 1rem 0;
		z-index: 10;
		flex-shrink: 0;
	}

	.main-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	footer {
		padding: 0.75rem 0;
		background-color: white;
		border-top: 1px solid #e5e7eb;
		flex-shrink: 0;
		display: flex;
		justify-content: center;
	}

	.container {
		width: 100%;
		max-width: 1800px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.full-height {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	header .container {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		font-size: 1.5rem;
		font-weight: 700;
		color: #4f46e5;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logo svg {
		width: 24px;
		height: 24px;
	}

	.editors-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		height: 100%;
		padding: 1.5rem 0;
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

	h2 {
		margin: 0;
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

	.status {
		padding: 0.75rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: center;
		min-width: 200px;
	}

	.status-error {
		background-color: #fee2e2;
		color: #ef4444;
	}

	.status-success {
		background-color: #d1fae5;
		color: #10b981;
	}

	.status-loading {
		background-color: #e0f2fe;
		color: #0284c7;
	}

	.spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(2, 132, 199, 0.3);
		border-radius: 50%;
		border-top-color: #0284c7;
		animation: spin 1s ease-in-out infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.editors-container {
			grid-template-columns: 1fr;
		}
	}
</style>
