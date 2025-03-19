<div class="app">
	<slot />
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans',
			'Droid Sans', 'Helvetica Neue', sans-serif;
		background-color: #f7f7f7;
	}

	.app {
		width: 100%;
		min-height: 100vh;
	}
</style>
