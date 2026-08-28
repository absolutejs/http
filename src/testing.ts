import { createAbsoluteHttpTransport } from './adapters';
import type { AbsoluteHttpFetch } from './contracts';

export type AbsoluteHttpTestRequest = {
	request: Request;
};

export const createTestHttpTransport = (options: {
	handler: (input: AbsoluteHttpTestRequest) => Promise<Response> | Response;
	origin?: string;
}) => {
	const fetch: AbsoluteHttpFetch = async (input, init) =>
		options.handler({
			request:
				input instanceof Request && init === undefined
					? input
					: new Request(input, init)
		});

	return createAbsoluteHttpTransport({
		fetch,
		origin: options.origin ?? 'https://absolute.test',
		runtime: 'test'
	});
};
