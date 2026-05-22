import { requestUrl } from "obsidian";
import mermaidBundled from "mermaid";
import mermaidPkg from "mermaid/package.json";

export const bundledMermaidVersion: string = mermaidPkg.version;

interface MermaidAPI {
	initialize(config: Record<string, unknown>): void;
	render(
		id: string,
		definition: string,
	): Promise<{ svg: string; bindFunctions?: (el: Element) => void }>;
}

export function getMermaidConfig(
	useObsidianTheme = true,
): Record<string, unknown> {
	return {
		startOnLoad: false,
		securityLevel: "strict",
		...(useObsidianTheme
			? {}
			: {
					theme: "default",
					themeVariables: {
						textColor: "var(--text-normal)",
						fontFamily: "var(--font-mermaid)",
					},
				}),
		flowchart: { useMaxWidth: false },
		sequence: { useMaxWidth: false },
		journey: { useMaxWidth: true },
		class: { useMaxWidth: true },
		git: { useMaxWidth: false },
		state: { useMaxWidth: true },
		er: { useMaxWidth: false },
		pie: { useMaxWidth: true },
		mindmap: { useMaxWidth: false },
		gantt: {
			// cspell:ignore gantt
			useMaxWidth: true,
			axisFormatter: [["%Y-%m-%d", (e: Date) => e.getDay() === 1]],
		},
	};
}

export interface MermaidDiskCache {
	read(version: string): Promise<string | null>;
	write(version: string, source: string): Promise<void>;
}

function initBundled(useObsidianTheme: boolean): MermaidAPI {
	(mermaidBundled as unknown as MermaidAPI).initialize(
		getMermaidConfig(useObsidianTheme),
	);
	return mermaidBundled as unknown as MermaidAPI;
}

function cdnBaseUrl(version: string): string {
	return version === "latest"
		? "https://cdn.jsdelivr.net/npm/mermaid/dist/"
		: `https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/`;
}

export async function fetchCDNSource(version: string): Promise<string> {
	const baseUrl = cdnBaseUrl(version);
	const response = await requestUrl(`${baseUrl}mermaid.esm.min.mjs`);
	// Rewrite relative chunk imports to absolute CDN URLs so the source can be
	// imported via a blob URL (which has no base).
	return response.text.replace(
		/(['"])(\.\/[^'"]+)\1/g,
		(_, q: string, path: string) => `${q}${baseUrl}${path.slice(2)}${q}`,
	);
}

let mermaidCache: Record<string, Promise<MermaidAPI>> = {};

export async function getMermaid(
	version = "latest",
	source: "cdn" | "bundled" = "cdn",
	useObsidianTheme = true,
	cache?: MermaidDiskCache,
): Promise<MermaidAPI> {
	const cacheKey =
		source === "bundled"
			? `bundled:${useObsidianTheme}`
			: `cdn:${version}:${useObsidianTheme}`;

	if (mermaidCache[cacheKey]) return mermaidCache[cacheKey];
	mermaidCache = {};

	if (source === "bundled") {
		return (mermaidCache[cacheKey] = Promise.resolve(
			initBundled(useObsidianTheme),
		));
	}

	// CDN: use disk cache only — no auto-fetch. If not cached, fall back to
	// bundled without populating mermaidCache so the next render re-checks
	// disk after the user manually fetches via settings.
	const diskCached = (await cache?.read(version)) ?? null;
	if (diskCached === null) {
		return initBundled(useObsidianTheme);
	}

	mermaidCache[cacheKey] = (async () => {
		try {
			const blob = new Blob([diskCached], {
				type: "application/javascript",
			});
			const blobUrl = URL.createObjectURL(blob);
			let mermaid: MermaidAPI;
			try {
				const mod = (await import(/* @vite-ignore */ blobUrl)) as {
					default: MermaidAPI;
				};
				mermaid = mod.default;
			} finally {
				URL.revokeObjectURL(blobUrl);
			}
			mermaid.initialize(getMermaidConfig(useObsidianTheme));
			return mermaid;
		} catch (err) {
			console.warn(
				`[Mermaid-next] Failed to load CDN version "${version}", falling back to bundled mermaid.`,
				err,
			);
			return initBundled(useObsidianTheme);
		}
	})();

	return mermaidCache[cacheKey];
}

export function createMermaidId(prefix = "mermaid") {
	const uuid = crypto.randomUUID();
	return `${prefix}-${uuid}`;
}
