<script lang="ts">
	import { onMount } from 'svelte';

	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import EditorPanel from '$lib/components/EditorPanel.svelte';

	import { createTabStore } from '$lib/stores/tab-store.svelte.js';

	let isLoading = $state(false);
	let error = $state<string>();
	let success = $state<string>();

	const tabStore = createTabStore();
	const tabs = $derived(tabStore.tabs);
	const activeTabId = $derived(tabStore.activeTabId);
	const activeTab = $derived(tabStore.activeTab);

	// Handle status updates from child components
	function updateStatus({
		loading,
		errorMessage,
		successMessage
	}: {
		loading?: boolean;
		errorMessage?: string;
		successMessage?: string;
	}) {
		if (loading !== undefined) {
			isLoading = loading;
		} else {
			isLoading = false;
		}
		if (errorMessage !== undefined) {
			error = errorMessage;
		} else {
			error = undefined;
		}
		if (successMessage !== undefined) {
			success = successMessage;
		} else {
			success = undefined;
		}

		// Clear success messages after a delay
		if (successMessage) {
			setTimeout(() => {
				if (success === successMessage) {
					success = undefined;
				}
			}, 3000);
		}
	}

	// Make sure we have at least one tab when the app loads
	onMount(() => {
		if (tabs.length === 0) {
			tabStore.addTab(true); // Add a default tab with example content
		}
	});
</script>

<div class="app-container">
	<Header />

	<div class="main-content">
		<div class="container full-height">
			<TabBar
				{tabs}
				{activeTabId}
				onAddTab={tabStore.addTab}
				onCloseTab={tabStore.closeTab}
				onSetActiveTab={tabStore.setActiveTab}
				onUpdateTabTitle={tabStore.updateTabTitle}
			/>

			{#if activeTab}
				{#key activeTab.id}
					<EditorPanel
						tabId={activeTab.id}
						operationText={activeTab.operationText}
						optimizedOperationText={activeTab.optimizedOperationText}
						onUpdate={tabStore.updateTabContent}
						onStatus={updateStatus}
					/>
				{/key}
			{/if}
		</div>
	</div>

	<Footer {isLoading} {error} {success} />
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

	.main-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
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
</style>
