import { loadMermaid, Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	MermaidNextPluginSettings,
	MermaidNextSettingTab,
} from "./settings";
import {
	createMermaidId,
	getMermaid,
	MermaidAPI,
	MermaidDiskCache,
} from "./load-mermaid";

const OWNED_BY_NEXT = Symbol("mermaid-next.owned");

type WindowWithMermaid = Window & {
	mermaid?: MermaidAPI & { [OWNED_BY_NEXT]?: true };
	obsidian_mermaid?: MermaidAPI;
};

export default class MermaidNextPlugin extends Plugin {
	settings: MermaidNextPluginSettings | undefined;

	diskCache: MermaidDiskCache = {
		read: async (v: string) => {
			if (this.settings?.cdnCache?.version !== v) return null;
			return this.settings.cdnCache.source;
		},
		write: async (v: string, src: string) => {
			if (!this.settings) return;
			this.settings.cdnCache = { version: v, source: src };
			await this.saveSettings();
		},
	};

	private get cfg(): MermaidNextPluginSettings {
		return this.settings ?? DEFAULT_SETTINGS;
	}

	async syncGlobal(): Promise<void> {
		const win = window as WindowWithMermaid;
		if (this.cfg.replaceObsidianMermaid) {
			if (!win.mermaid?.[OWNED_BY_NEXT]) {
				win.obsidian_mermaid = win.mermaid;
			}
			win.mermaid = await getMermaid(
				this.cfg.version,
				this.cfg.source,
				this.cfg.useObsidianTheme,
				this.cfg.useElk,
				this.cfg.useHandDrawn,
				this.diskCache,
			);
			win.mermaid[OWNED_BY_NEXT] = true;
		} else {
			win.mermaid =
				win.obsidian_mermaid ??
				((await loadMermaid()) as MermaidAPI);
		}
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MermaidNextSettingTab(this.app, this));

		await getMermaid(
			this.cfg.version,
			this.cfg.source,
			this.cfg.useObsidianTheme,
			this.cfg.useElk,
			this.cfg.useHandDrawn,
			this.diskCache,
		);
		await this.syncGlobal();

		this.registerMarkdownCodeBlockProcessor(
			"mermaid-next",
			async (source, el, _ctx) => {
				const mermaid = await getMermaid(
					this.cfg.version,
					this.cfg.source,
					this.cfg.useObsidianTheme,
					this.cfg.useElk,
					this.cfg.useHandDrawn,
					this.diskCache,
				);
				void this.syncGlobal();
				if (this.cfg.useObsidianTheme) {
					el.removeClass("mermaid");
					el.addClass("mermaid");
				} else {
					el.addClass("mermaid-next");
				}
				try {
					const { svg } = await mermaid.render(
						createMermaidId("mermaid-next"),
						source,
					);
					if (!svg?.trim())
						throw new Error(
							"Mermaid returned an empty diagram — check syntax or diagram type support.",
						);
					// Parse as HTML, not SVG/XML: mermaid's DOMPurify pass converts <br/> to <br>
					// inside <foreignObject>, making the output invalid XML.
					const parser = new DOMParser();
					const htmlDoc = parser.parseFromString(
						`<body>${svg}</body>`,
						"text/html",
					);
					const svgEl = htmlDoc.querySelector("svg");
					if (!svgEl)
						throw new Error(
							"No SVG element found in mermaid output.",
						);
					el.replaceChildren(document.adoptNode(svgEl));
				} catch (err) {
					el.empty();
					console.debug("Error rendering Mermaid diagram:", err);
					const pre = el.createEl("pre", {
						cls: "mermaid-next-error",
					});
					pre.textContent = `Error rendering Mermaid diagram:\n${err instanceof Error ? err.message : String(err)}`;
				}
			},
		);
	}

	onunload() {
		const win = window as WindowWithMermaid;
		if (win.obsidian_mermaid) {
			win.mermaid = win.obsidian_mermaid;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MermaidNextPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
