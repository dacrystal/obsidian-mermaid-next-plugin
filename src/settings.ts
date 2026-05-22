import { App, PluginSettingTab, SettingGroup } from "obsidian";
import MermaidNextPlugin from "./main";
import { bundledMermaidVersion, fetchCDNSource } from "./load-mermaid";

export interface MermaidNextPluginSettings {
	version: string;
	source: "cdn" | "bundled";
	useObsidianTheme: boolean;
	cdnCache: { version: string; source: string } | null;
}

export const DEFAULT_SETTINGS: MermaidNextPluginSettings = {
	version: "latest",
	source: "bundled",
	useObsidianTheme: true,
	cdnCache: null,
};

export class MermaidNextSettingTab extends PluginSettingTab {
	plugin: MermaidNextPlugin;

	constructor(app: App, plugin: MermaidNextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private async save<K extends keyof MermaidNextPluginSettings>(
		key: K,
		value: MermaidNextPluginSettings[K],
	): Promise<void> {
		this.plugin.settings![key] = value;
		await this.plugin.saveSettings();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const isBundled =
			(this.plugin.settings?.source ?? DEFAULT_SETTINGS.source) ===
			"bundled";
		const cache = this.plugin.settings?.cdnCache ?? null;
		const version =
			this.plugin.settings?.version ?? DEFAULT_SETTINGS.version;

		new SettingGroup(containerEl)
			.setHeading("Mermaid")
			.addSetting((set) => {
				set.setName("Source")
					.setDesc(
						'CDN: enter a version or "latest". Bundled: offline, fixed version.',
					)
					.addDropdown((drop) =>
						drop
							.addOption("cdn", "CDN")
							.addOption("bundled", "Bundled")
							.setValue(
								this.plugin.settings?.source ??
									DEFAULT_SETTINGS.source,
							)
							.onChange((value) => {
								void this.save(
									"source",
									value as "cdn" | "bundled",
								).then(() => this.display());
							}),
					)
					.addText((text) => {
						text
							// eslint-disable-next-line obsidianmd/ui/sentence-case -- "latest" is a version keyword, not prose
							.setPlaceholder("latest")
							.setValue(
								isBundled
									? bundledMermaidVersion
									: this.plugin.settings?.version ||
											DEFAULT_SETTINGS.version,
							)
							.setDisabled(isBundled);
						if (!isBundled) {
							text.onChange((value) => {
								void this.save(
									"version",
									value || DEFAULT_SETTINGS.version,
								);
							});
						}
					});
			})
			.addSetting((set) => {
				set.setName("CDN cache").setDesc(
					cache ? `Cached: ${cache.version}` : "No local cache",
				);

				if (cache) {
					set.addButton((btn) =>
						btn.setButtonText("Clear cache").onClick(() => {
							void this.save("cdnCache", null).then(() =>
								this.display(),
							);
						}),
					);
				} else {
					set.addButton((btn) =>
						btn
							.setButtonText("Download")
							.setWarning()
							.setDisabled(isBundled)
							.onClick(
								() =>
									void (async () => {
										btn.setDisabled(true);
										btn.setButtonText("Downloading...");
										try {
											const source =
												await fetchCDNSource(version);
											await this.plugin.diskCache.write(
												version,
												source,
											);
											this.display();
										} catch (err) {
											btn.setDisabled(false);
											btn.setButtonText("Download");
											set.setDesc(
												`Download failed: ${err instanceof Error ? err.message : String(err)}`,
											);
										}
									})(),
							),
					);
				}
			});

		new SettingGroup(containerEl)
			.setHeading("Appearance")
			.addSetting((set) => {
				set.setName("Obsidian theme integration")
					.setDesc(
						'When enabled, diagrams follow the active Obsidian theme. When disabled, Mermaid uses its "default" theme.',
					)
					.addToggle((toggle) =>
						toggle
							.setValue(
								this.plugin.settings?.useObsidianTheme ??
									DEFAULT_SETTINGS.useObsidianTheme,
							)
							.onChange((value) => {
								void this.save("useObsidianTheme", value);
							}),
					);
			});
	}
}
