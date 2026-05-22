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

export function getMermaidConfig(useObsidianTheme = true): Record<string, unknown> {
	return {
		startOnLoad: false,
		securityLevel: "strict",
		...(useObsidianTheme ? {} : {
			theme: "default",
			themeVariables: {
				textColor: "var(--text-normal)",
				fontFamily: "var(--font-mermaid)",
			},
		}),
		flowchart: {
			useMaxWidth: false,
		},
		sequence: {
			useMaxWidth: false,
		},
		gantt: { // cspell:ignore gantt
			useMaxWidth: true,
			axisFormatter: [
				[
					"%Y-%m-%d",
					(e: Date) => e.getDay() === 1,
				],
			],
		},
		journey: {
			useMaxWidth: true,
		},
		class: {
			useMaxWidth: true,
		},
		git: {
			useMaxWidth: false,
		},
		state: {
			useMaxWidth: true,
		},
		er: {
			useMaxWidth: false,
		},
		pie: {
			useMaxWidth: true,
		},
	};
}

export interface MermaidDiskCache {
	read(version: string): Promise<string | null>;
	write(version: string, source: string): Promise<void>;
}

let mermaidCache: Record<string, Promise<MermaidAPI>> = {};

export async function getMermaid(
	version = "latest",
	source: "cdn" | "bundled" = "cdn",
	useObsidianTheme = true,
	cache?: MermaidDiskCache,
): Promise<MermaidAPI> {
	const cacheKey = source === "bundled"
		? `bundled:${useObsidianTheme}`
		: `cdn:${version}:${useObsidianTheme}`;

	console.debug(`[Mermaid-next] getMermaid called — key: "${cacheKey}", hit: ${!!mermaidCache[cacheKey]}`);

	if (source === "bundled") {
		if (mermaidCache[cacheKey]) return mermaidCache[cacheKey];
		console.debug(`[Mermaid-next] Initializing bundled Mermaid (useObsidianTheme=${useObsidianTheme}).`);
		mermaidCache[cacheKey] = Promise.resolve(
			(() => {
				(mermaidBundled as unknown as MermaidAPI).initialize(
					getMermaidConfig(useObsidianTheme),
				);
				return mermaidBundled as unknown as MermaidAPI;
			})(),
		);
		return mermaidCache[cacheKey];
	}

	if (mermaidCache[cacheKey]) {
		return mermaidCache[cacheKey];
	}

	mermaidCache[cacheKey] = (async () => {
		try {
			const url =
				version === "latest"
					? "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs"
					: `https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/mermaid.esm.min.mjs`;

			const cached = await cache?.read(version) ?? null;
			let sourceText: string;
			if (cached !== null) {
				console.debug(`[Mermaid-next] Loaded v${version} from local cache.`);
				sourceText = cached;
			} else {
				console.debug(`[Mermaid-next] Fetching v${version} from CDN.`);
				// Rewrite relative chunk imports to absolute CDN URLs so the
				// source can be imported via a blob URL (which has no base).
				const baseUrl =
					version === "latest"
						? "https://cdn.jsdelivr.net/npm/mermaid/dist/"
						: `https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/`;
				const raw = await fetch(url).then(r => r.text());
				sourceText = raw.replace(
					/(['"])(\.\/[^'"]+)\1/g,
					(_, q, path) => `${q}${baseUrl}${path.slice(2)}${q}`,
				);
			}

			const blob = new Blob([sourceText], { type: 'application/javascript' });
			const blobUrl = URL.createObjectURL(blob);
			let mermaid: MermaidAPI;
			try {
				const mod = await import(/* @vite-ignore */ blobUrl) as { default: MermaidAPI };
				mermaid = mod.default;
			} finally {
				URL.revokeObjectURL(blobUrl);
			}

			if (!cached) await cache?.write(version, sourceText);
			mermaid.initialize(getMermaidConfig(useObsidianTheme));
			return mermaid;
		} catch (err) {
			console.warn(
				`[Mermaid-next] Failed to load CDN version "${version}", falling back to bundled mermaid.`,
				err,
			);
			(mermaidBundled as unknown as MermaidAPI).initialize(
				getMermaidConfig(useObsidianTheme),
			);
			return mermaidBundled as unknown as MermaidAPI;
		}
	})();

	return mermaidCache[cacheKey];
}

export function createMermaidId(prefix = "mermaid") {
	const uuid = crypto.randomUUID();
	return `${prefix}-${uuid}`;
}
