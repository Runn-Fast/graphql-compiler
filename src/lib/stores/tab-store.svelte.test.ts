import { describe, test, expect, beforeEach, vi } from 'vitest';
import { flushSync } from 'svelte';

import { createTabStore, type Storage, type Tab } from './tab-store.svelte.js';

// Mock nanoid to return predictable IDs for testing
vi.mock('$lib/nanoid.js', () => {
	let counter = 0;
	return {
		nanoid: () => `test-id-${counter++}`
	};
});

// Create a mock storage implementation
class MockStorage implements Storage {
	private store: Record<string, string> = {};

	getItem(key: string): string | null {
		return this.store[key] || null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = value;
	}

	// Helper methods for testing
	clear(): void {
		this.store = {};
	}

	get data(): Record<string, string> {
		return { ...this.store };
	}
}

describe('Tab Store', () => {
	let mockStorage: MockStorage;

	beforeEach(() => {
		mockStorage = new MockStorage();
		// Reset the counter for the nanoid mock
		vi.clearAllMocks();
	});

	test('should create a default tab when initialized with empty storage', () => {
		const cleanup = $effect.root(() => {
			const store = createTabStore(mockStorage);

			flushSync();

			expect(store.tabs.length).toBe(1);
			expect(store.tabs[0].id).toBe('test-id-0');
			expect(store.tabs[0].title).toBe('Example Query');
			expect(store.activeTabId).toBe('test-id-0');
			expect(store.activeTab).toBe(store.tabs[0]);
		});

		cleanup();
	});

	test('should load tabs from storage', () => {
		// Set up mock storage with existing data
		const mockTabs: Tab[] = [
			{
				id: 'existing-tab-1',
				title: 'Existing Tab 1',
				operationText: 'query { test1 }',
				optimizedOperationText: 'optimized1'
			},
			{
				id: 'existing-tab-2',
				title: 'Existing Tab 2',
				operationText: 'query { test2 }',
				optimizedOperationText: 'optimized2'
			}
		];

		mockStorage.setItem('graphql-inliner-tabs', JSON.stringify(mockTabs));
		mockStorage.setItem('graphql-inliner-active-tab', 'existing-tab-2');

		const cleanup = $effect.root(() => {
			const store = createTabStore(mockStorage);

			flushSync();

			expect(store.tabs.length).toBe(2);
			expect(store.tabs[0].id).toBe('existing-tab-1');
			expect(store.tabs[1].id).toBe('existing-tab-2');
			expect(store.activeTabId).toBe('existing-tab-2');
			expect(store.activeTab).toBe(store.tabs[1]);
		});

		cleanup();
	});

	test('should add a new tab', () => {
		const cleanup = $effect.root(() => {
			const store = createTabStore(mockStorage);

			flushSync();
			expect(store.tabs.length).toBe(1);

			store.addTab();
			flushSync();

			expect(store.tabs.length).toBe(2);
			expect(store.tabs[1].id).toBe('test-id-2');
			expect(store.activeTabId).toBe('test-id-2');

			// Verify storage was updated
			const savedTabs = JSON.parse(mockStorage.getItem('graphql-inliner-tabs') || '[]');
			expect(savedTabs.length).toBe(2);
			expect(mockStorage.getItem('graphql-inliner-active-tab')).toBe('test-id-2');
		});

		cleanup();
	});

	test('should close a tab', () => {
		// Set up mock storage with multiple tabs
		const mockTabs: Tab[] = [
			{ id: 'tab-1', title: 'Tab 1', operationText: '', optimizedOperationText: '' },
			{ id: 'tab-2', title: 'Tab 2', operationText: '', optimizedOperationText: '' },
			{ id: 'tab-3', title: 'Tab 3', operationText: '', optimizedOperationText: '' }
		];

		mockStorage.setItem('graphql-inliner-tabs', JSON.stringify(mockTabs));
		mockStorage.setItem('graphql-inliner-active-tab', 'tab-2');

		const cleanup = $effect.root(() => {
			const store = createTabStore(mockStorage);

			flushSync();
			expect(store.tabs.length).toBe(3);
			expect(store.activeTabId).toBe('tab-2');

			// Close the active tab
			store.closeTab('tab-2');
			flushSync();

			expect(store.tabs.length).toBe(2);
			expect(store.tabs[0].id).toBe('tab-1');
			expect(store.tabs[1].id).toBe('tab-3');
			// Should activate the previous tab when closing active tab
			expect(store.activeTabId).toBe('tab-1');

			// Close the first tab
			store.closeTab('tab-1');
			flushSync();

			expect(store.tabs.length).toBe(1);
			expect(store.activeTabId).toBe('tab-3');

			// Close the last tab
			store.closeTab('tab-3');
			flushSync();

			expect(store.tabs.length).toBe(0);
		});

		cleanup();
	});

	test('should set active tab', () => {
		// Set up mock storage with multiple tabs
		const mockTabs: Tab[] = [
			{ id: 'tab-1', title: 'Tab 1', operationText: '', optimizedOperationText: '' },
			{ id: 'tab-2', title: 'Tab 2', operationText: '', optimizedOperationText: '' }
		];

		mockStorage.setItem('graphql-inliner-tabs', JSON.stringify(mockTabs));
		mockStorage.setItem('graphql-inliner-active-tab', 'tab-1');

		const cleanup = $effect.root(() => {
			const store = createTabStore(mockStorage);

			flushSync();
			expect(store.activeTabId).toBe('tab-1');

			store.setActiveTab('tab-2');
			flushSync();

			expect(store.activeTabId).toBe('tab-2');
			expect(store.activeTab.id).toBe('tab-2');
			expect(mockStorage.getItem('graphql-inliner-active-tab')).toBe('tab-2');
		});

		cleanup();
	});

	test('should update tab title', () => {
		// Set up mock storage with a tab
		const mockTabs: Tab[] = [
			{ id: 'tab-1', title: 'Original Title', operationText: '', optimizedOperationText: '' }
		];

		mockStorage.setItem('graphql-inliner-tabs', JSON.stringify(mockTabs));

		const cleanup = $effect.root(() => {
			const store = createTabStore(mockStorage);

			flushSync();
			expect(store.tabs[0].title).toBe('Original Title');

			store.updateTabTitle('tab-1', 'Updated Title');
			flushSync();

			expect(store.tabs[0].title).toBe('Updated Title');

			// Verify storage was updated
			const savedTabs = JSON.parse(mockStorage.getItem('graphql-inliner-tabs') || '[]');
			expect(savedTabs[0].title).toBe('Updated Title');

			// Should keep existing title if empty string is provided
			store.updateTabTitle('tab-1', '');
			flushSync();

			expect(store.tabs[0].title).toBe('Updated Title');
		});

		cleanup();
	});

	test('should update tab content', () => {
		// Set up mock storage with a tab
		const mockTabs: Tab[] = [
			{
				id: 'tab-1',
				title: 'Test Tab',
				operationText: 'original query',
				optimizedOperationText: 'original optimized'
			}
		];

		mockStorage.setItem('graphql-inliner-tabs', JSON.stringify(mockTabs));

		const cleanup = $effect.root(() => {
			const store = createTabStore(mockStorage);

			flushSync();
			expect(store.tabs[0].operationText).toBe('original query');
			expect(store.tabs[0].optimizedOperationText).toBe('original optimized');

			store.updateTabContent('tab-1', 'updated query', 'updated optimized');
			flushSync();

			expect(store.tabs[0].operationText).toBe('updated query');
			expect(store.tabs[0].optimizedOperationText).toBe('updated optimized');

			// Verify storage was updated
			const savedTabs = JSON.parse(mockStorage.getItem('graphql-inliner-tabs') || '[]');
			expect(savedTabs[0].operationText).toBe('updated query');
			expect(savedTabs[0].optimizedOperationText).toBe('updated optimized');
		});

		cleanup();
	});

	test('should handle storage errors gracefully', () => {
		// Mock console.error to verify it's called
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Create a faulty storage that throws on getItem
		const faultyStorage: Storage = {
			getItem: () => {
				throw new Error('Storage error');
			},
			setItem: () => {
				/* noop */
			}
		};

		const cleanup = $effect.root(() => {
			const store = createTabStore(faultyStorage);

			flushSync();

			// Should create a default tab despite storage error
			expect(store.tabs.length).toBe(1);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error loading tabs from storage:',
				expect.any(Error)
			);
		});

		cleanup();
		consoleErrorSpy.mockRestore();
	});

	test('should use correct activeTab when activeTabId from storage is invalid', () => {
		// Set up mock storage with tabs but invalid active tab ID
		const mockTabs: Tab[] = [
			{ id: 'tab-1', title: 'Tab 1', operationText: '', optimizedOperationText: '' },
			{ id: 'tab-2', title: 'Tab 2', operationText: '', optimizedOperationText: '' }
		];

		mockStorage.setItem('graphql-inliner-tabs', JSON.stringify(mockTabs));
		mockStorage.setItem('graphql-inliner-active-tab', 'non-existent-tab');

		const cleanup = $effect.root(() => {
			const store = createTabStore(mockStorage);

			flushSync();

			// Should fallback to the first tab when activeTabId is invalid
			expect(store.activeTabId).toBe('tab-1');
			expect(store.activeTab.id).toBe('tab-1');
		});

		cleanup();
	});
});
