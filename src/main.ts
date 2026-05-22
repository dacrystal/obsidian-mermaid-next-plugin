import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, MermaidNextPluginSettings, MermaidNextSettingTab} from "./settings";
import {createMermaidId, getMermaid} from "./load-mermaid";

export default class MermaidNextPlugin extends Plugin {
	settings: MermaidNextPluginSettings | undefined;

	private get cfg(): MermaidNextPluginSettings {
		return this.settings ?? DEFAULT_SETTINGS;
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MermaidNextSettingTab(this.app, this));

		const diskCache = {
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

		await getMermaid(this.cfg.version, this.cfg.source, this.cfg.useObsidianTheme, diskCache);

		this.registerMarkdownCodeBlockProcessor(
			'mermaid-next',
			async (source, el, _ctx) => {
				const mermaid = await getMermaid(this.cfg.version, this.cfg.source, this.cfg.useObsidianTheme, diskCache);
				if (this.cfg.useObsidianTheme) {
					el.removeClass('mermaid');
					el.addClass('mermaid');
				} else {
					el.addClass('mermaid-next');
				}
				try {
					const { svg } = await mermaid.render(createMermaidId('mermaid-next'), source);
					const parser = new DOMParser();
					const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
					el.replaceChildren(document.adoptNode(svgDoc.documentElement));
				} catch (err) {
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
