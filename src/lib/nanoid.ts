/**
 * Generate a simple nanoid for use as tab identifiers
 * (Simplified version that does not require external dependencies)
 */
export function nanoid(size: number = 10): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let id = '';
	for (let i = 0; i < size; i++) {
		id += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
	}
	return id;
}
