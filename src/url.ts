import { AbsoluteHttpError } from './contracts';

const loopbackHosts = new Set(['127.0.0.1', '[::1]', 'localhost']);

export const normalizeAbsoluteHttpOrigin = (value: string) => {
	let url: URL;
	try {
		url = new URL(value);
	} catch (cause) {
		throw new AbsoluteHttpError('origin', 'HTTP origin is invalid.', {
			cause
		});
	}
	const loopback =
		url.protocol === 'http:' && loopbackHosts.has(url.hostname);
	if (url.protocol !== 'https:' && !loopback)
		throw new AbsoluteHttpError(
			'origin',
			'HTTP origin must use HTTPS outside loopback development.'
		);
	if (
		url.username ||
		url.password ||
		url.pathname !== '/' ||
		url.search ||
		url.hash
	)
		throw new AbsoluteHttpError(
			'origin',
			'HTTP origin cannot contain credentials, a path, query, or fragment.'
		);

	return url.origin;
};

export const resolveAbsoluteHttpUrl = (
	target: string | URL,
	origin: string
) => {
	let url: URL;
	try {
		url = new URL(String(target), `${origin}/`);
	} catch (cause) {
		throw new AbsoluteHttpError('origin', 'HTTP request URL is invalid.', {
			cause
		});
	}
	if (url.username || url.password)
		throw new AbsoluteHttpError(
			'origin',
			'HTTP request URLs cannot contain credentials.'
		);
	if (url.origin !== origin)
		throw new AbsoluteHttpError(
			'origin',
			'Absolute HTTP refused a request outside the configured application origin.',
			{ url: url.href }
		);
	url.hash = '';

	return url;
};
