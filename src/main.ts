import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MermaidNextPluginSettings, MermaidNextSettingTab} from "./settings";
import {createMermaidId, getMermaid, MermaidDiskCache} from "./load-mermaid";

export default class MermaidNextPlugin extends Plugin {
	settings: MermaidNextPluginSettings | undefined;

	diskCache: MermaidDiskCache = {
		read: async (v: string) =>
			this.settings?.cdnCache?.version === v
				? this.settings!.cdnCache!.source
				: null,
		write: async (v: string, src: string) => {
			if (!this.settings) return;
			this.settings.cdnCache = { version: v, source: src };
			await this.saveSettings();
		},
	};

	private get cfg(): MermaidNextPluginSettings {
		return this.settings ?? DEFAULT_SETTINGS;
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MermaidNextSettingTab(this.app, this));

		await getMermaid(this.cfg.version, this.cfg.source, this.cfg.useObsidianTheme, this.diskCache);

		this.registerMarkdownCodeBlockProcessor(
			'mermaid-next',
			async (source, el, _ctx) => {
				const mermaid = await getMermaid(this.cfg.version, this.cfg.source, this.cfg.useObsidianTheme, this.diskCache);
				if (this.cfg.useObsidianTheme) {
					el.removeClass('mermaid');
					el.addClass('mermaid');
				} else {
					el.addClass('mermaid-next');
				}
				try {
					const { svg } = await mermaid.render(createMermaidId('mermaid-next'), source);
					if (!svg?.trim()) throw new Error('Mermaid returned an empty diagram — check syntax or diagram type support.');
					// Parse as HTML, not SVG/XML: mermaid's DOMPurify pass converts <br/> to <br>
					// inside <foreignObject>, making the output invalid XML.
					const parser = new DOMParser();
					const htmlDoc = parser.parseFromString(`<body>${svg}</body>`, 'text/html');
					const svgEl = htmlDoc.querySelector('svg');
					if (!svgEl) throw new Error('No SVG element found in mermaid output.');
					el.replaceChildren(document.adoptNode(svgEl));
				} catch (err) {
					el.empty();
					console.error('Error rendering Mermaid diagram:', err);
					const pre = el.createEl('pre', { cls: 'mermaid-next-error' });
					pre.textContent = `Error rendering Mermaid diagram:\n${err instanceof Error ? err.message : String(err)}`;
				}
			}
		);
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MermaidNextPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
