import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { parseGraphQLDefinitions } from './graphql-parser.js';
import { mergeDefinitions } from './graphql-merge.js';

const execAsync = promisify(exec);

export interface CompileRelayParams {
	schema: string;
	operations: string;
}

export interface CompileRelayResult {
	stdout: string;
	stderr: string;
	results: Record<string, string>;
}

/**
 * Compiles Relay artifacts.
 *
 * It sets up a temporary directory with the following structure:
 *
 * /tmp/relay-compiler-${randomUUID}/
 *   ├─ src/                     // Source directory with operation files
 *   │   ├─ file1.js             // Contains GraphQL operations
 *   │   ├─ file2.js             // Contains more GraphQL operations
 *   ├─ schema.graphql           // Contains the schema
 *   ├─ output/                  // Directory for generated artifacts
 *   └─ relay.config.json        // Relay compiler configuration
 */
export async function compileRelay(params: CompileRelayParams): Promise<CompileRelayResult> {
	// Create a temporary directory
	const tempDir = path.join(tmpdir(), `relay-compiler-${randomUUID()}`);
	await fs.mkdir(tempDir, { recursive: true });

	// Create subdirectories: src (for queries) and output (for artifacts)
	const srcDir = path.join(tempDir, 'src');
	await fs.mkdir(srcDir, { recursive: true });
	const outputDir = path.join(tempDir, 'output');
	await fs.mkdir(outputDir, { recursive: true });

	// Parse the operations into separate definitions
	const definitions = parseGraphQLDefinitions(params.operations);

	// Merge definitions by filename
	const mergedFiles = mergeDefinitions(definitions);

	// Write each merged file to the src directory
	for (const file of mergedFiles) {
		await fs.writeFile(path.join(srcDir, file.filename), file.content);
	}

	// Write schema file
	const schemaPath = path.join(tempDir, 'schema.graphql');
	await fs.writeFile(schemaPath, params.schema);

	// Create relay.config.json file with the required configuration
	const config = {
		src: './src',
		schema: './schema.graphql',
		artifactDirectory: './output',
		language: 'javascript'
	};
	const configPath = path.join(tempDir, 'relay.config.json');
	await fs.writeFile(configPath, JSON.stringify(config, null, 2));

	const command = 'pnpx relay-compiler compiler';
	console.log({
		schemaPath,
		srcDir,
		operationFiles: mergedFiles.map((f) => f.filename),
		outputDir,
		configPath,
		command
	});

	try {
		// Run Relay Compiler
		const { stdout, stderr } = await execAsync(command, {
			cwd: tempDir
		});

		// Read generated output artifacts
		const outputFiles = await fs.readdir(outputDir);
		const results: Record<string, string> = {};
		for (const file of outputFiles) {
			const content = await fs.readFile(path.join(outputDir, file), 'utf8');
			results[file] = content;
		}

		return { stdout, stderr, results };
	} catch (error) {
		console.error('Error compiling relay:', error);
		throw error;
	} finally {
		// Clean up temporary files
		// await fs.rm(tempDir, { recursive: true, force: true });
	}
}
