<script lang="ts">
	import { flushSync } from 'svelte';
	import type { Tab } from '$lib/stores/tab-store.svelte.js';

	type Props = {
		tabs?: Tab[];
		activeTabId?: string;
		onAddTab?: () => void;
		onCloseTab?: (tabId: string) => void;
		onSetActiveTab?: (tabId: string) => void;
		onUpdateTabTitle?: (tabId: string, title: string) => void;
	};

	const {
		tabs = [],
		activeTabId = '',
		onAddTab,
		onCloseTab,
		onSetActiveTab,
		onUpdateTabTitle
	}: Props = $props();

	let editingTabId = $state<string>();
	let editingTitle = $state<string>('');
	let inputRef = $state<HTMLInputElement>();

	function handleAddTab() {
		onAddTab?.();
	}

	function handleCloseTab(tabId: string, event: MouseEvent) {
		event.stopPropagation();
		onCloseTab?.(tabId);
	}

	function handleSetActiveTab(tabId: string) {
		if (editingTabId !== tabId) {
			onSetActiveTab?.(tabId);
		}
	}

	function handleEditTabTitle(tabId: string, currentTitle: string, event: MouseEvent) {
		event.stopPropagation();
		editingTabId = tabId;
		editingTitle = currentTitle;

		flushSync();
		inputRef?.focus();
		inputRef?.select();
	}

	function handleSaveTitle() {
		if (editingTabId && editingTitle.trim() !== '') {
			onUpdateTabTitle?.(editingTabId, editingTitle);
		}
		editingTabId = undefined;
	}

	function handleKeyDown(event: KeyboardEvent) {
		event.stopPropagation();
		if (event.key === 'Enter') {
			handleSaveTitle();
		} else if (event.key === 'Escape') {
			editingTabId = undefined;
		}
	}

	function handleBlur() {
		handleSaveTitle();
	}

	// New function to handle keyboard navigation for tabs
	function handleTabKeyDown(event: KeyboardEvent, tabId: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleSetActiveTab(tabId);
		}
	}

	// New function to handle keyboard navigation for editing tab titles
	function handleTitleKeyDown(event: KeyboardEvent, tabId: string, title: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleEditTabTitle(tabId, title, event as unknown as MouseEvent);
		}
	}
</script>

<div class="tab-bar">
	<div class="tabs-container" role="tablist">
		{#each tabs as tab (tab.id)}
			<div
				class="tab {activeTabId === tab.id ? 'active' : ''}"
				role="tab"
				tabindex={activeTabId === tab.id ? 0 : -1}
				aria-selected={activeTabId === tab.id}
				onclick={() => handleSetActiveTab(tab.id)}
				onkeydown={(e) => handleTabKeyDown(e, tab.id)}
			>
				{#if editingTabId === tab.id}
					<input
						type="text"
						bind:this={inputRef}
						bind:value={editingTitle}
						onkeydown={handleKeyDown}
						onblur={handleBlur}
					/>
				{:else}
					<span
						class="tab-title"
						role="button"
						tabindex="0"
						ondblclick={(e) => handleEditTabTitle(tab.id, tab.title, e)}
						onkeydown={(e) => handleTitleKeyDown(e, tab.id, tab.title)}
					>
						{tab.title}
					</span>
				{/if}

				<button
					class="tab-close"
					onclick={(e) => handleCloseTab(tab.id, e)}
					title="Close tab"
					aria-label="Close tab"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
		{/each}

		<button class="add-tab" onclick={handleAddTab} title="Add new tab" aria-label="Add new tab">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="12" y1="5" x2="12" y2="19"></line>
				<line x1="5" y1="12" x2="19" y2="12"></line>
			</svg>
		</button>
	</div>
</div>

<style>
	.tab-bar {
		padding-top: 0.5rem;
		flex-shrink: 0;
		overflow-x: auto;
	}

	.tabs-container {
		display: flex;
		gap: 0.25rem;
		padding: 0 0.5rem;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: #f3f4f6;
		border-radius: 0.375rem 0.375rem 0 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: #4b5563;
		cursor: pointer;
		transition: all 0.2s ease;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		min-width: 100px;
		max-width: 200px;
		border: 1px solid #e5e7eb;
		border-bottom: none;
	}

	.tab.active {
		background-color: white;
		color: #1f2937;
		border-bottom: 1px solid white;
		margin-bottom: -1px;
	}

	.tab:hover:not(.active) {
		background-color: #f9fafb;
	}

	.tab:focus-visible {
		outline: 2px solid #4f46e5;
		outline-offset: 1px;
	}

	.tab-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tab-title:focus-visible {
		outline: 2px solid #4f46e5;
		outline-offset: 1px;
		border-radius: 0.25rem;
	}

	.tab input {
		padding: 0.25rem 0;
		font-size: 0.875rem;
		height: 0.7rem;
		border: none;
		outline: none;
	}

	.tab input:focus {
		border-color: #4f46e5;
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
	}

	.tab-close {
		color: #9ca3af;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.125rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition: all 0.2s ease;
	}

	.tab-close:hover {
		color: #ef4444;
		background-color: rgba(239, 68, 68, 0.1);
	}

	.tab-close:focus-visible {
		outline: 2px solid #4f46e5;
		outline-offset: 1px;
	}

	.add-tab {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		color: #6b7280;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.375rem;
		transition: all 0.2s ease;
	}

	.add-tab:hover {
		color: #4f46e5;
		background-color: #f3f4f6;
	}

	.add-tab:focus-visible {
		outline: 2px solid #4f46e5;
		outline-offset: 1px;
	}
</style>
