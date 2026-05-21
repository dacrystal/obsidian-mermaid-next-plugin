import {App, PluginSettingTab, Setting} from "obsidian";
import MermaidNextPlugin from "./main";
import {bundledMermaidVersion} from "./load-mermaid";

export interface MermaidNextPluginSettings {
	version: string;
	source: 'cdn' | 'bundled';
}

export const DEFAULT_SETTINGS: MermaidNextPluginSettings = {
	version: 'latest',
	source: 'cdn',
}

export class MermaidNextSettingTab extends PluginSettingTab {
	plugin: MermaidNextPlugin;

	constructor(app: App, plugin: MermaidNextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Mermaid source')
			.setDesc('Load from CDN (allows version selection) or use the bundled version (offline, fixed). Reload the plugin after changing.')
			.addDropdown(drop => drop
				.addOption('cdn', 'CDN')
				.addOption('bundled', 'Bundled')
				.setValue(this.plugin.settings?.source ?? DEFAULT_SETTINGS.source)
				.onChange(async (value) => {
					if (!this.plugin.settings) {
						this.plugin.settings = { ...DEFAULT_SETTINGS, source: value as 'cdn' | 'bundled' };
					} else {
						this.plugin.settings.source = value as 'cdn' | 'bundled';
					}
					await this.plugin.saveSettings();
					this.display();
				}));

		const versionSetting = new Setting(containerEl)
			.setName('Mermaid version')
			.setDesc('CDN version to load. Use "latest" or a specific version like "11.4.1".')
			.addText(text => text
				.setPlaceholder('Latest')
				.setValue(this.plugin.settings?.version || DEFAULT_SETTINGS.version)
				.onChange(async (value) => {
					if (!this.plugin.settings) {
						this.plugin.settings = { ...DEFAULT_SETTINGS, version: value };
					} else {
						this.plugin.settings.version = value;
					}
					this.plugin.settings.version = this.plugin.settings.version || DEFAULT_SETTINGS.version;
					await this.plugin.saveSettings();
				}));

		const isBundled = (this.plugin.settings?.source ?? DEFAULT_SETTINGS.source) === 'bundled';
		versionSetting.setDisabled(isBundled);

		new Setting(containerEl)
			.setName('Bundled version')
			.setDesc('The Mermaid version included in this plugin.')
			.addText(text => text
				.setValue(bundledMermaidVersion)
				.setDisabled(true));
	}
}
