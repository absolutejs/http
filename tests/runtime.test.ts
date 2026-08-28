import { expect, test } from 'bun:test';
import { createAbsoluteHttpClient } from '../src';
import { installAbsoluteHttpTransport } from '../src/runtime';
import { createTestHttpTransport } from '../src/testing';

test('runtime installations are stack-safe and realm shared', async () => {
	const calls: string[] = [];
	const first = createTestHttpTransport({
		handler: () => {
			calls.push('first');
			return Response.json({ provider: 'first' });
		},
		origin: 'https://first.example'
	});
	const second = createTestHttpTransport({
		handler: () => {
			calls.push('second');
			return Response.json({ provider: 'second' });
		},
		origin: 'https://second.example'
	});
	const removeFirst = installAbsoluteHttpTransport(first);
	const client = createAbsoluteHttpClient();
	expect(await client.get<{ provider: string }>('/provider')).toEqual({
		provider: 'first'
	});
	const removeSecond = installAbsoluteHttpTransport(second);
	expect(await client.get<{ provider: string }>('/provider')).toEqual({
		provider: 'second'
	});
	removeSecond();
	expect(await client.get<{ provider: string }>('/provider')).toEqual({
		provider: 'first'
	});
	removeFirst();
	expect(calls).toEqual(['first', 'second', 'first']);
});
