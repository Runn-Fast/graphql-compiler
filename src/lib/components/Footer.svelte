<script lang="ts">
	import { fade } from 'svelte/transition';

	type Props = {
		isLoading: boolean;
		error: string | undefined;
		success: string | undefined;
	};

	const { isLoading, error, success }: Props = $props();
</script>

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

<style>
	footer {
		padding: 0.75rem 0;
		background-color: white;
		border-top: 1px solid #e5e7eb;
		flex-shrink: 0;
		display: flex;
		justify-content: center;
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
</style>
