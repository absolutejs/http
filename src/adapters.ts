import type {
	AbsoluteHttpFetch,
	AbsoluteHttpRuntime,
	AbsoluteHttpTransport
} from './contracts';
import { normalizeAbsoluteHttpOrigin } from './url';

export type CreateAbsoluteHttpTransportOptions = {
	fetch?: AbsoluteHttpFetch;
	origin: string;
	runtime: AbsoluteHttpRuntime;
};

export const createAbsoluteHttpTransport = ({
	fetch: fetchImpl = globalThis.fetch,
	origin,
	runtime
}: CreateAbsoluteHttpTransportOptions): AbsoluteHttpTransport => ({
	fetch: fetchImpl,
	origin: normalizeAbsoluteHttpOrigin(origin),
	runtime
});

export const createWebHttpTransport = (
	options: {
		fetch?: AbsoluteHttpFetch;
		origin?: string;
	} = {}
) => {
	const origin = options.origin ?? globalThis.location?.origin;
	if (!origin)
		throw new TypeError(
			'The web HTTP transport requires a browser origin or explicit origin.'
		);

	return createAbsoluteHttpTransport({
		...(options.fetch ? { fetch: options.fetch } : {}),
		origin,
		runtime: 'web'
	});
};

export const createSsrHttpTransport = (options: {
	fetch?: AbsoluteHttpFetch;
	origin: string;
}) =>
	createAbsoluteHttpTransport({
		...(options.fetch ? { fetch: options.fetch } : {}),
		origin: options.origin,
		runtime: 'ssr'
	});
