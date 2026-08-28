import { expect, test } from 'bun:test';
import { assertAbsoluteHttpConformance } from '../src/conformance';
import { createTestHttpTransport } from '../src/testing';

test('test transport passes shared conformance', async () => {
	const observed: Request[] = [];
	const transport = createTestHttpTransport({
		handler: () => Response.json({ ok: true })
	});
	await assertAbsoluteHttpConformance({
		inspect: (request) => {
			observed.push(request);
		},
		transport
	});
	expect(observed).toHaveLength(1);
	expect(observed[0]?.url).toBe('https://absolute.test/conformance?value=1');
});
