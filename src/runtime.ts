import { createWebHttpTransport } from './adapters';
import { AbsoluteHttpError, type AbsoluteHttpTransport } from './contracts';

type AbsoluteHttpTransportInstallation = {
	transport: AbsoluteHttpTransport;
};

type AbsoluteHttpRuntimeRegistry = {
	fallback?: AbsoluteHttpTransport;
	installations: AbsoluteHttpTransportInstallation[];
};

const RUNTIME_REGISTRY = Symbol.for('@absolutejs/http/runtime');
const registryHost = globalThis as { [key: symbol]: unknown };

const isRuntimeRegistry = (
	value: unknown
): value is AbsoluteHttpRuntimeRegistry =>
	typeof value === 'object' &&
	value !== null &&
	Array.isArray(Reflect.get(value, 'installations'));

const runtimeRegistry = (() => {
	const existing = registryHost[RUNTIME_REGISTRY];
	if (isRuntimeRegistry(existing)) return existing;
	const created: AbsoluteHttpRuntimeRegistry = { installations: [] };
	Object.defineProperty(registryHost, RUNTIME_REGISTRY, {
		configurable: false,
		enumerable: false,
		value: created,
		writable: false
	});

	return created;
})();

const fallbackTransport = () => {
	if (typeof location !== 'undefined' && location.origin)
		return createWebHttpTransport();
	throw new AbsoluteHttpError(
		'not-configured',
		'Absolute HTTP requires a request-scoped SSR transport outside a browser.'
	);
};

export const getAbsoluteHttpTransport = () =>
	runtimeRegistry.installations.at(-1)?.transport ??
	(runtimeRegistry.fallback ??= fallbackTransport());

export const installAbsoluteHttpTransport = (
	transport: AbsoluteHttpTransport
) => {
	const installation = { transport };
	runtimeRegistry.installations.push(installation);

	return () => {
		const index = runtimeRegistry.installations.indexOf(installation);
		if (index >= 0) runtimeRegistry.installations.splice(index, 1);
	};
};
