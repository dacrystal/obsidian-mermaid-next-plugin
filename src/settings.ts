import {App, PluginSettingTab, SettingGroup} from "obsidian";
import MermaidNextPlugin from "./main";
import {bundledMermaidVersion} from "./load-mermaid";

export interface MermaidNextPluginSettings {
	version: string;
	source: 'cdn' | 'bundled';
	useObsidianTheme: boolean;
	cdnCache: { version: string; source: string } | null;
}

export const DEFAULT_SETTINGS: MermaidNextPluginSettings = {
	version: 'latest',
	source: 'cdn',
	useObsidianTheme: true,
	cdnCache: null,
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

		const isBundled = (this.plugin.settings?.source ?? DEFAULT_SETTINGS.source) === 'bundled';
		const cache = this.plugin.settings?.cdnCache ?? null;

		const desc = cache
				? `Cached: ${cache.version}`
				: 'No local cache';

		new SettingGroup(containerEl)
		.setHeading('Mermaid')
			.addSetting(set =>
				set
				.setName('Source')
				.setDesc('CDN: enter a version or "latest". Bundled: offline, fixed version.')
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
					}))
				.addText(text => {
					text
						.setPlaceholder('latest')
						.setValue(isBundled
							? bundledMermaidVersion
							: (this.plugin.settings?.version || DEFAULT_SETTINGS.version))
						.setDisabled(isBundled);
					if (!isBundled) {
						text.onChange(async (value) => {
							if (!this.plugin.settings) {
								this.plugin.settings = { ...DEFAULT_SETTINGS, version: value };
							} else {
								this.plugin.settings.version = value || DEFAULT_SETTINGS.version;
							}
							await this.plugin.saveSettings();
						});
					}
				}))
			.addSetting(set =>
				set
				.setName('CDN cache')
				.setDesc(desc)
				.addButton(btn => btn
					.setButtonText('Clear cache')
					.setDisabled(!cache)
					.onClick(async () => {
						if (!this.plugin.settings) return;
						this.plugin.settings.cdnCache = null;
						await this.plugin.saveSettings();
						this.display();
					})))

		new SettingGroup(containerEl)
			.setHeading('Appearance')
			.addSetting(set => 
				set
				.setName('Obsidian theme integration')
				.setDesc('When enabled, diagrams follow the active Obsidian theme. When disabled, Mermaid uses its "default" theme.')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings?.useObsidianTheme ?? DEFAULT_SETTINGS.useObsidianTheme)
					.onChange(async (value) => {
						if (!this.plugin.settings) {
							this.plugin.settings = { ...DEFAULT_SETTINGS, useObsidianTheme: value };
						} else {
							this.plugin.settings.useObsidianTheme = value;
						}
						await this.plugin.saveSettings();
					})));
	}
}
