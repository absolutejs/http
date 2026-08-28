import { describe, expect, test } from 'bun:test';
import {
	AbsoluteHttpError,
	createAbsoluteHttpClient,
	createAbsoluteHttpTransport
} from '../src';
import { createTestHttpTransport } from '../src/testing';

describe('Absolute HTTP client', () => {
	test('resolves relative requests against the trusted origin', async () => {
		let observed: Request | undefined;
		const client = createAbsoluteHttpClient({
			transport: createTestHttpTransport({
				handler: ({ request }) => {
					observed = request;
					return Response.json({ name: 'Ada' });
				}
			})
		});

		expect(
			await client.get<{ name: string }>('/api/user?view=short#hidden')
		).toEqual({
			name: 'Ada'
		});
		expect(observed?.url).toBe('https://absolute.test/api/user?view=short');
		expect(observed?.redirect).toBe('error');
	});

	test('serializes JSON methods without changing author headers', async () => {
		let observed: Request | undefined;
		const client = createAbsoluteHttpClient({
			transport: createTestHttpTransport({
				handler: ({ request }) => {
					observed = request;
					return Response.json({ created: true }, { status: 201 });
				}
			})
		});

		expect(
			await client.post<{ created: boolean }>(
				'/api/items',
				{ title: 'Offline first' },
				{ headers: { 'x-request-id': 'request-1' } }
			)
		).toEqual({ created: true });
		expect(observed?.method).toBe('POST');
		expect(observed?.headers.get('content-type')).toBe('application/json');
		expect(observed?.headers.get('x-request-id')).toBe('request-1');
		expect(await observed?.json()).toEqual({ title: 'Offline first' });
	});

	test('rejects every request outside the configured origin', async () => {
		let calls = 0;
		const client = createAbsoluteHttpClient({
			transport: createTestHttpTransport({
				handler: () => {
					calls += 1;
					return Response.json({});
				}
			})
		});

		await expect(
			client.get('https://attacker.invalid/steal')
		).rejects.toMatchObject({
			code: 'origin',
			name: 'AbsoluteHttpError'
		});
		await expect(
			client.get('//attacker.invalid/steal')
		).rejects.toMatchObject({
			code: 'origin'
		});
		expect(calls).toBe(0);
	});

	test('prevents application code from supplying credential headers', async () => {
		const client = createAbsoluteHttpClient({
			transport: createTestHttpTransport({
				handler: () => Response.json({})
			})
		});

		for (const header of [
			'authorization',
			'cookie',
			'proxy-authorization'
		]) {
			await expect(
				client.get('/api', { headers: { [header]: 'secret' } })
			).rejects.toMatchObject({ code: 'origin' });
		}
	});

	test('returns raw responses and normalizes status and JSON errors', async () => {
		const responses = [
			new Response('no', { status: 409 }),
			new Response('not-json', { status: 200 })
		];
		const client = createAbsoluteHttpClient({
			transport: createTestHttpTransport({
				handler: () => responses.shift() ?? Response.json(null)
			})
		});

		const raw = await client.request('/conflict');
		expect(raw.status).toBe(409);
		await expect(client.json('/invalid')).rejects.toMatchObject({
			code: 'response',
			name: 'AbsoluteHttpError'
		});
	});

	test('reports non-success JSON requests without consuming private bodies', async () => {
		const client = createAbsoluteHttpClient({
			transport: createTestHttpTransport({
				handler: () =>
					Response.json({ private: 'do-not-copy' }, { status: 403 })
			})
		});

		let caught: unknown;
		try {
			await client.get('/private');
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(AbsoluteHttpError);
		expect(caught).toMatchObject({ code: 'http', status: 403 });
		expect(JSON.stringify(caught)).not.toContain('do-not-copy');
	});

	test('permits HTTPS and loopback origins only', () => {
		expect(
			createAbsoluteHttpTransport({
				origin: 'https://api.example.com',
				runtime: 'ssr'
			}).origin
		).toBe('https://api.example.com');
		expect(
			createAbsoluteHttpTransport({
				origin: 'http://localhost:3000',
				runtime: 'ssr'
			}).origin
		).toBe('http://localhost:3000');
		expect(() =>
			createAbsoluteHttpTransport({
				origin: 'http://api.example.com',
				runtime: 'ssr'
			})
		).toThrow(AbsoluteHttpError);
	});
});
