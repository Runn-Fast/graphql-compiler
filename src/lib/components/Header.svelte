<script>
	// Header component for the GraphQL Query/Fragment Inliner application
</script>

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

<style>
	header {
		background-color: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 1rem 0;
		z-index: 10;
		flex-shrink: 0;
	}

	.container {
		width: 100%;
		max-width: 1800px;
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
</style>
