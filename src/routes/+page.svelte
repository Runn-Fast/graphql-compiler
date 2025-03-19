<script>
	// Default values for schema and operation
	let schemaText = `type User {
  id: ID!
  name: String
  age: Int
  friends: [User]
}

type Query {
  user(id: ID!): User
  users: [User]
}`;

	let operationText = `fragment UserFragment on User {
  id
  name
  age
}

query UserQuery($id: ID!) {
  user(id: $id) {
    ...UserFragment
    friends {
      ...UserFragment
    }
  }
}`;

	let optimizedOperationText = '';
	let isLoading = false;
	let error = null;

	// Function to compile the query when the button is clicked
	async function compileQuery() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/compile', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					schema: schemaText,
					operations: operationText
				})
			});

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Unknown error occurred');
			}
      optimizedOperationText = data.result
		} catch (err) {
			console.error(err);
			error = err.message;
			optimizedOperationText = `Error: ${err.message}`;
		} finally {
			isLoading = false;
		}
	}
</script>

<main>
	<h1>Relay Console</h1>
	<div class="editor-container">
		<div class="editor">
			<h2>GraphQL Schema</h2>
			<p>Copy and paste your <code>./schema_hasura.graphql</code> schema here.</p>
			<textarea bind:value={schemaText} rows="15"></textarea>
		</div>
		<div class="editor">
			<h2>GraphQL Operation</h2>
			<p>Copy and paste the query from your browsers network tab here.</p>
			<textarea bind:value={operationText} rows="15"></textarea>
		</div>
	</div>

	<div class="controls">
		<button on:click={compileQuery} disabled={isLoading}>
			{#if isLoading}
				Compiling...
			{:else}
				Recompile
			{/if}
		</button>
		{#if error}
			<div class="error">{error}</div>
		{/if}
	</div>

	<div class="result-editor">
		<h2>Compiled Result</h2>
		<textarea value={optimizedOperationText} readonly rows="15"></textarea>
	</div>
</main>

<style>
	main {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		font-family: sans-serif;
		background: #f9f9f9;
		color: #333;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
	}

	.editor-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.editor,
	.result-editor {
		background: #fff;
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
	}

	textarea {
		width: 100%;
		height: 300px;
		font-family: monospace;
		font-size: 0.9rem;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		resize: vertical;
	}

	.controls {
		margin: 1.5rem 0;
		text-align: center;
	}

	button {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		background: #007bff;
		color: #fff;
		transition: background 0.3s;
	}

	button:hover:not(:disabled) {
		background: #0056b3;
	}

	button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.error {
		margin-top: 1rem;
		padding: 0.75rem;
		background: #ffebee;
		color: #c62828;
		border-radius: 4px;
	}

	@media (max-width: 768px) {
		.editor-container {
			grid-template-columns: 1fr;
		}
	}
</style>
