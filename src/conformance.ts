import { createAbsoluteHttpClient } from './client';
import type { AbsoluteHttpTransport } from './contracts';

export type AbsoluteHttpConformanceHarness = {
	inspect(request: Request): Promise<void> | void;
	transport: AbsoluteHttpTransport;
};

export const inspectAbsoluteHttpConformance = async (
	harness: AbsoluteHttpConformanceHarness
) => {
	const issues: string[] = [];
	const client = createAbsoluteHttpClient({
		transport: {
			...harness.transport,
			fetch: async (input, init) => {
				const request = new Request(input, init);
				await harness.inspect(request);
				return new Response(JSON.stringify({ ok: true }), {
					headers: { 'content-type': 'application/json' }
				});
			}
		}
	});
	const response = await client.get<{ ok: boolean }>('/conformance?value=1');
	if (response.ok !== true) issues.push('JSON response did not round-trip');
	try {
		await client.get('https://attacker.invalid/conformance');
		issues.push('cross-origin request was not rejected');
	} catch {
		// Expected.
	}
	try {
		await client.get('/conformance', {
			headers: { authorization: 'Bearer application-owned' }
		});
		issues.push('application authorization header was not rejected');
	} catch {
		// Expected.
	}

	return issues;
};

export const assertAbsoluteHttpConformance = async (
	harness: AbsoluteHttpConformanceHarness
) => {
	const issues = await inspectAbsoluteHttpConformance(harness);
	if (issues.length > 0)
		throw new Error(
			`HTTP transport conformance failed: ${issues.join('; ')}`
		);
};
