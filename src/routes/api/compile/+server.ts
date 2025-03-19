import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

import { inlineRelayQueryFromString } from '$lib/inline-relay-query';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { schema, operations, persistOutput } = await request.json();

    const result = inlineRelayQueryFromString(operations)

    return json({
      success: true,
      result,
    })
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unknown error';

		console.error('Error compiling relay:', error);
		return json(
			{
				success: false,
				error: message
			},
			{ status: 500 }
		);
	}
};
