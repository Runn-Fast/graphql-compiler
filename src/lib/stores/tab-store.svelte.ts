import { nanoid } from '$lib/nanoid.js';

// Storage interface to abstract localStorage
interface Storage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

// Tab type definition
interface Tab {
	id: string;
	title: string;
	operationText: string;
	optimizedOperationText: string;
}

// Default query for new tabs with example content
const DEFAULT_QUERY = `query UserQuery($id: ID!) {
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

// Storage keys
const TABS_STORAGE_KEY = 'graphql-inliner-tabs';
const ACTIVE_TAB_STORAGE_KEY = 'graphql-inliner-active-tab';

// Load data from storage
function loadFromStorage(storage?: Storage) {
	if (!storage) {
		return { tabs: [], activeTabId: '' };
	}

	try {
		const storedTabs = storage.getItem(TABS_STORAGE_KEY);
		const storedActiveTabId = storage.getItem(ACTIVE_TAB_STORAGE_KEY);
		const tabs: Tab[] = storedTabs ? JSON.parse(storedTabs) : [];
		let activeTabId = storedActiveTabId || '';

		// Validate the active tab ID is valid
		if (!tabs.some((tab) => tab.id === activeTabId) && tabs.length > 0) {
			activeTabId = tabs[0].id;
		}

		return { tabs, activeTabId };
	} catch (error) {
		console.error('Error loading tabs from storage:', error);
		return { tabs: [], activeTabId: '' };
	}
}

// Create a tab store with configurable storage
function createTabStore(storage?: Storage) {
	// Use browser's localStorage by default if available and no custom storage is provided
	const storageImpl = storage || (typeof localStorage !== 'undefined' ? localStorage : undefined);

	// Initialize from storage or with default values
	const { tabs: initialTabs, activeTabId: initialActiveId } = loadFromStorage(storageImpl);

	// State using runes
	const tabs = $state<Tab[]>(initialTabs.length ? initialTabs : [createTab('Example Query', true)]);
	let activeTabId = $state<string>(initialActiveId || tabs[0]?.id || '');

	// Create a tab with optional data
	function createTab(title = '', withDefaultContent = false): Tab {
		return {
			id: nanoid(),
			title: title || `Query ${tabs.length + 1}`,
			operationText: withDefaultContent ? DEFAULT_QUERY : '',
			optimizedOperationText: ''
		};
	}

	// Derived state using $derived rune
	const activeTab = $derived(tabs.find((tab) => tab.id === activeTabId) || tabs[0]);

	// Save to storage whenever state changes
	$effect(() => {
		if (!storageImpl) return;

		try {
			storageImpl.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
			storageImpl.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
		} catch (error) {
			console.error('Error saving tabs to storage:', error);
		}
	});

	// Actions that update the state
	function addTab(withDefaultContent = false) {
		const newTab = createTab('', withDefaultContent);
		tabs.push(newTab);
		activeTabId = newTab.id;
	}

	function closeTab(tabId: string) {
		// Find the next tab to activate if we're closing the active tab
		if (activeTabId === tabId) {
			const index = tabs.findIndex((tab) => tab.id === tabId);
			if (index > 0) {
				activeTabId = tabs[index - 1].id;
			} else if (tabs.length > 1) {
				activeTabId = tabs[1].id;
			}
		}

		// Remove the tab
		const index = tabs.findIndex((tab) => tab.id === tabId);
		if (index !== -1) {
			tabs.splice(index, 1);
		}
	}

	function setActiveTab(tabId: string) {
		activeTabId = tabId;
	}

	function updateTabTitle(tabId: string, title: string) {
		const tab = tabs.find((tab) => tab.id === tabId);
		if (tab) {
			tab.title = title || tab.title;
		}
	}

	function updateTabContent(tabId: string, operationText: string, optimizedOperationText: string) {
		const tab = tabs.find((tab) => tab.id === tabId);
		if (tab) {
			tab.operationText = operationText;
			tab.optimizedOperationText = optimizedOperationText;
		}
	}

	// Return the state and actions
	return {
		// Expose the state
		get tabs() {
			return tabs;
		},
		get activeTabId() {
			return activeTabId;
		},
		get activeTab() {
			return activeTab;
		},
		// Expose the actions
		addTab,
		closeTab,
		setActiveTab,
		updateTabTitle,
		updateTabContent
	};
}

export { createTabStore };
export type { Tab, Storage };
