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
	const s = getComputedStyle(document.body);
	const v = (name: string) => s.getPropertyValue(name).trim();

	return {
		startOnLoad: false,
		securityLevel: "strict",
		...(useObsidianTheme ? {} : {
			theme: "default",
			themeVariables: {
				textColor: v("--text-normal"),
				fontFamily: v("--font-mermaid") || "ui-sans-serif, sans-serif",
			},
		}),
		flowchart: {
			useMaxWidth: false,
		},
		sequence: {
			useMaxWidth: false,
		},
		gantt: {
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

let mermaidCache: Record<string, Promise<MermaidAPI>> = {};

export async function getMermaid(
	version = "latest",
	source: "cdn" | "bundled" = "cdn",
	useObsidianTheme = true,
): Promise<MermaidAPI> {
	if (source === "bundled") {
		if (mermaidCache["__bundled__"]) return mermaidCache["__bundled__"];
		mermaidCache["__bundled__"] = Promise.resolve(
			(() => {
				(mermaidBundled as unknown as MermaidAPI).initialize(
					getMermaidConfig(useObsidianTheme),
				);
				return mermaidBundled as unknown as MermaidAPI;
			})(),
		);
		return mermaidCache["__bundled__"];
	}

	if (mermaidCache[version]) {
		return mermaidCache[version];
	}

	mermaidCache[version] = (async () => {
		try {
			const url =
				version === "latest"
					? "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs"
					: `https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/mermaid.esm.min.mjs`;

			const mod = await import(/* @vite-ignore */ url) as { default: MermaidAPI };
			const mermaid = mod.default;

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

	return mermaidCache[version];
}

export function createMermaidId(prefix = "mermaid") {
	const uuid = crypto.randomUUID();
	return `${prefix}-${uuid}`;
}
