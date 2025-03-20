# GraphQL Query/Fragment Inliner

A simple web tool that inlines GraphQL fragments into their query operations, making it easier to understand and work with GraphQL queries.

[Try it live](https://stayradiated.github.io/graphql-compiler)

![Screenshot of GraphQL Query/Fragment Inliner tool](./screenshot.png)

## Features

- Easily inline GraphQL fragments into their parent operations
- Real-time compilation of GraphQL queries
- Syntax highlighting for GraphQL
- Copy optimized queries to clipboard
- Web-based with no server dependencies

## Usage

1. Paste your GraphQL query with fragments into the left editor
2. Click "Compile Query" to inline all fragments
3. The optimized query appears in the right editor
4. Copy the result to use in your application or API requests

### Example

**Input:**

```graphql
query UserQuery($id: ID!) {
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
}
```

**Output:**

```graphql
query UserQuery($id: ID!) {
	user(id: $id) {
		id
		name
		age
		friends {
			id
			name
			age
		}
	}
}
```

## Why Use This Tool?

- **Debugging**: Makes it easier to visualize the complete query structure
- **API Testing**: Generate clean queries for testing in GraphQL API tools
- **Learning**: Better understand how fragments work in GraphQL
- **Optimization**: Remove unnecessary fragment definitions for simpler queries

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/)

### Setup

```bash
# Clone the repository
git clone https://github.com/stayradiated/graphql-compiler.git
cd graphql-compiler

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

## Implementation Details

This tool uses:

- [SvelteKit](https://kit.svelte.dev/) for the UI framework
- [CodeMirror 6](https://codemirror.net/) for the code editors
- [GraphQL.js](https://github.com/graphql/graphql-js) for parsing and manipulating GraphQL queries

The core transformation logic can be found in `src/lib/inline-relay-query.ts`.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
