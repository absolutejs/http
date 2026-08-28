import {
	AbsoluteHttpError,
	type AbsoluteHttpClient,
	type AbsoluteHttpClientOptions,
	type AbsoluteHttpJsonRequestOptions,
	type AbsoluteHttpRequestOptions,
	type AbsoluteHttpTransport
} from './contracts';
import { getAbsoluteHttpTransport } from './runtime';
import { resolveAbsoluteHttpUrl } from './url';

const forbiddenCredentialHeaders = new Set([
	'authorization',
	'cookie',
	'proxy-authorization'
]);

const transportFor = (configured?: AbsoluteHttpTransport) =>
	configured ?? getAbsoluteHttpTransport();

const safeHeaders = (input?: HeadersInit) => {
	const headers = new Headers(input);
	for (const name of forbiddenCredentialHeaders) {
		if (headers.has(name))
			throw new AbsoluteHttpError(
				'origin',
				`Absolute HTTP owns the ${name} credential header for trusted transports.`
			);
	}

	return headers;
};

const requestFor = (
	target: RequestInfo | URL,
	options: AbsoluteHttpRequestOptions | undefined,
	transport: AbsoluteHttpTransport
) => {
	const source = target instanceof Request ? target : undefined;
	const requestedUrl: string | URL = source
		? source.url
		: (target as string | URL);
	const url = resolveAbsoluteHttpUrl(requestedUrl, transport.origin);
	const headers = safeHeaders(options?.headers ?? source?.headers);

	return new Request(source ?? url, {
		...options,
		credentials: transport.runtime === 'web' ? 'same-origin' : 'omit',
		headers,
		redirect: 'error'
	});
};

const normalizeFetchError = (caught: unknown, url: string) => {
	if (caught instanceof AbsoluteHttpError) return caught;
	if (
		caught instanceof DOMException &&
		(caught.name === 'AbortError' || caught.name === 'TimeoutError')
	)
		return new AbsoluteHttpError('aborted', 'HTTP request was aborted.', {
			cause: caught,
			url
		});

	return new AbsoluteHttpError('network', 'HTTP request failed.', {
		cause: caught,
		url
	});
};

const requireOk = (response: Response) => {
	if (!response.ok)
		throw new AbsoluteHttpError(
			'http',
			`HTTP request failed with status ${response.status}.`,
			{ status: response.status, url: response.url }
		);

	return response;
};

const parseJson = async <T>(response: Response): Promise<T> => {
	const text = await response.text();
	if (text === '') return undefined as T;
	try {
		return JSON.parse(text) as T;
	} catch (cause) {
		throw new AbsoluteHttpError(
			'response',
			'HTTP response is not valid JSON.',
			{
				cause,
				status: response.status,
				url: response.url
			}
		);
	}
};

const jsonOptions = (
	method: string,
	body: unknown,
	options: AbsoluteHttpRequestOptions | undefined
) => {
	const headers = new Headers(options?.headers);
	if (body !== undefined && !headers.has('content-type'))
		headers.set('content-type', 'application/json');
	let encoded: BodyInit | undefined;
	try {
		encoded = body === undefined ? undefined : JSON.stringify(body);
	} catch (cause) {
		throw new AbsoluteHttpError(
			'body',
			'HTTP body is not JSON serializable.',
			{
				cause
			}
		);
	}

	return encoded === undefined
		? { ...options, headers, method }
		: { ...options, body: encoded, headers, method };
};

export const createAbsoluteHttpClient = (
	options: AbsoluteHttpClientOptions = {}
): AbsoluteHttpClient => {
	const fetchTrusted = async (
		input: RequestInfo | URL,
		init?: AbsoluteHttpRequestOptions
	) => {
		const transport = transportFor(options.transport);
		const request = requestFor(input, init, transport);
		try {
			return await transport.fetch(request);
		} catch (caught) {
			throw normalizeFetchError(caught, request.url);
		}
	};

	const request = (
		target: string | URL,
		requestOptions?: AbsoluteHttpRequestOptions
	) => fetchTrusted(target, requestOptions);
	const json = async <T>(
		target: string | URL,
		requestOptions?: AbsoluteHttpRequestOptions
	) => parseJson<T>(requireOk(await request(target, requestOptions)));
	const jsonMethod = <T>(
		method: string,
		target: string | URL,
		body: unknown,
		requestOptions?: AbsoluteHttpRequestOptions
	) => json<T>(target, jsonOptions(method, body, requestOptions));

	return {
		delete: <T>(
			target: string | URL,
			requestOptions?: AbsoluteHttpJsonRequestOptions
		) => {
			const { body, ...optionsWithoutBody } = requestOptions ?? {};
			return jsonMethod<T>('DELETE', target, body, optionsWithoutBody);
		},
		fetch: fetchTrusted,
		get: <T>(
			target: string | URL,
			requestOptions?: AbsoluteHttpRequestOptions
		) => json<T>(target, { ...requestOptions, method: 'GET' }),
		json,
		origin: () => transportFor(options.transport).origin,
		patch: <T>(
			target: string | URL,
			body?: unknown,
			requestOptions?: AbsoluteHttpRequestOptions
		) => jsonMethod<T>('PATCH', target, body, requestOptions),
		post: <T>(
			target: string | URL,
			body?: unknown,
			requestOptions?: AbsoluteHttpRequestOptions
		) => jsonMethod<T>('POST', target, body, requestOptions),
		put: <T>(
			target: string | URL,
			body?: unknown,
			requestOptions?: AbsoluteHttpRequestOptions
		) => jsonMethod<T>('PUT', target, body, requestOptions),
		request,
		text: async (
			target: string | URL,
			requestOptions?: AbsoluteHttpRequestOptions
		) => requireOk(await request(target, requestOptions)).text()
	};
};

export const http = createAbsoluteHttpClient();
