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

	onMount(() => {
		// Setup input editor
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

		return () => {
			inputView.destroy();
			outputView.destroy();
		};
	});

	// Function to compile the query when the button is clicked
	async function compileQuery() {
		isLoading = true;
		error = null;
		success = null;

		try {
			optimizedOperationText = inlineRelayQueryFromString(operationText);
			outputView.dispatch({
				changes: { from: 0, to: outputView.state.doc.length, insert: optimizedOperationText }
			});
			success = 'Query compiled successfully!';
		} catch (err: unknown) {
			console.error(err);
			error = err instanceof Error ? err.message : 'An unknown error occurred';
			outputView.dispatch({
				changes: { from: 0, to: outputView.state.doc.length, insert: `Error: ${error}` }
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
</script>

<main>
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

	<div class="container">
		<div class="editors-container">
			<div class="editor-card">
				<div class="editor-header">
					<h2 class="editor-title">GraphQL Operation</h2>
					<p class="editor-description">
						Copy and paste the query from your browser's network tab here.
					</p>
				</div>
				<div class="editor-content" bind:this={inputEditor}></div>
			</div>

			<div class="editor-card">
				<div class="editor-header">
					<h2 class="editor-title">Compiled Result</h2>
					<p class="editor-description">The optimized and inlined query will appear here.</p>
				</div>
				<div class="editor-content" bind:this={outputEditor}></div>
			</div>
		</div>

		<div class="controls">
			<button class="btn btn-primary" on:click={compileQuery} disabled={isLoading}>
				{#if isLoading}
					<span class="spinner"></span>
					Compiling...
				{:else}
					Compile Query
				{/if}
			</button>

			<button class="btn btn-outline" on:click={copyToClipboard} disabled={!optimizedOperationText}>
				Copy Result
			</button>
		</div>

		{#if error}
			<div class="status status-error" transition:fade>
				{error}
			</div>
		{/if}

		{#if success}
			<div class="status status-success" transition:fade>
				{success}
			</div>
		{/if}
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell,
			'Helvetica Neue', sans-serif;
		background-color: #f9fafb;
		color: #1f2937;
	}

	header {
		background-color: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 1rem 0;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.container {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 1rem;
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

	main {
		padding: 2rem 0;
	}

	.editors-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.editor-card {
		background: white;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.editor-header {
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
		background-color: #f8fafc;
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
		min-height: 400px;
		width: 100%;
	}

	:global(.cm-editor) {
		height: 100%;
	}

	.controls {
		display: flex;
		justify-content: center;
		margin: 1.5rem 0;
		gap: 1rem;
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

	.btn-primary {
		background-color: #4f46e5;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #4338ca;
	}

	.btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-outline {
		background-color: transparent;
		border: 1px solid #e5e7eb;
		color: #1f2937;
	}

	.btn-outline:hover:not(:disabled) {
		background-color: #f3f4f6;
	}

	.btn-outline:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.status {
		padding: 0.75rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		margin-top: 1rem;
	}

	.status-error {
		background-color: #fee2e2;
		color: #ef4444;
	}

	.status-success {
		background-color: #d1fae5;
		color: #10b981;
	}

	.spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
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
