export type AbsoluteHttpRuntime = 'native' | 'ssr' | 'test' | 'web';

export type AbsoluteHttpFetch = (
	input: RequestInfo | URL,
	init?: RequestInit
) => Promise<Response>;

export type AbsoluteHttpTransport = {
	/** The only origin that receives requests through this transport. */
	origin: string;
	/** Provider fetch. Native providers inject renewable credentials internally. */
	fetch: AbsoluteHttpFetch;
	runtime: AbsoluteHttpRuntime;
};

export type AbsoluteHttpErrorCode =
	| 'aborted'
	| 'body'
	| 'http'
	| 'network'
	| 'not-configured'
	| 'origin'
	| 'response';

export class AbsoluteHttpError extends Error {
	readonly code: AbsoluteHttpErrorCode;
	override readonly cause: unknown;
	readonly status: number | undefined;
	readonly url: string | undefined;

	constructor(
		code: AbsoluteHttpErrorCode,
		message: string,
		options: { cause?: unknown; status?: number; url?: string } = {}
	) {
		super(message);
		this.name = 'AbsoluteHttpError';
		this.code = code;
		this.cause = options.cause;
		this.status = options.status;
		this.url = options.url;
	}
}

export type AbsoluteHttpRequestOptions = Omit<
	RequestInit,
	'credentials' | 'redirect'
>;

export type AbsoluteHttpJsonRequestOptions = Omit<
	AbsoluteHttpRequestOptions,
	'body'
> & {
	body?: unknown;
};

export type AbsoluteHttpClientOptions = {
	transport?: AbsoluteHttpTransport;
};

export type AbsoluteHttpClient = {
	delete<T = unknown>(
		target: string | URL,
		options?: AbsoluteHttpJsonRequestOptions
	): Promise<T>;
	fetch(
		input: RequestInfo | URL,
		init?: AbsoluteHttpRequestOptions
	): Promise<Response>;
	get<T = unknown>(
		target: string | URL,
		options?: AbsoluteHttpRequestOptions
	): Promise<T>;
	json<T = unknown>(
		target: string | URL,
		options?: AbsoluteHttpRequestOptions
	): Promise<T>;
	origin(): string;
	patch<T = unknown>(
		target: string | URL,
		body?: unknown,
		options?: AbsoluteHttpRequestOptions
	): Promise<T>;
	post<T = unknown>(
		target: string | URL,
		body?: unknown,
		options?: AbsoluteHttpRequestOptions
	): Promise<T>;
	put<T = unknown>(
		target: string | URL,
		body?: unknown,
		options?: AbsoluteHttpRequestOptions
	): Promise<T>;
	request(
		target: string | URL,
		options?: AbsoluteHttpRequestOptions
	): Promise<Response>;
	text(
		target: string | URL,
		options?: AbsoluteHttpRequestOptions
	): Promise<string>;
};
