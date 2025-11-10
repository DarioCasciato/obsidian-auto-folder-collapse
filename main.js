const { Plugin, Setting, PluginSettingTab } = require('obsidian');

const DEFAULT_SETTINGS = {
	autoCollapseEnabled: false,
	inactivityMinutes: 5,
	exclusiveAccordionEnabled: false
};

const ICON_SELECTORS =
	'.collapse-icon, .tree-item-collapse, [data-action="toggle-folder"]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = class AutoFolderCollapsePlugin extends Plugin
{
	async onload()
	{
		await this.loadSettings();
		this.addSettingTab(new AutoFolderCollapseSettingTab(this.app, this));

		const triggerSetup = () => this.setupExplorer();
		if (this.app.workspace.layoutReady)
		{
			triggerSetup();
		}
		else
		{
			this.registerEvent(
				this.app.workspace.on('layout-ready', triggerSetup)
			);
		}
		this.registerEvent(
			this.app.workspace.on('layout-change', triggerSetup)
		);

		if (this.settings.autoCollapseEnabled)
		{
			this.startInactivityTimer();
		}

        console.log('Auto Folder Collapse Plugin loaded');
	}

	onunload()
	{
		this.detachListeners();
		this.stopInactivityTimer();

        console.log('Auto Folder Collapse Plugin unloaded');
	}

	async loadSettings()
	{
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings()
	{
		await this.saveData(this.settings);
	}

	startInactivityTimer()
	{
		this.stopInactivityTimer();

		const timeout = this.settings.inactivityMinutes * 60 * 1000;
		this.timer = window.setTimeout(
			() => this.collapseAllTopFolders(),
			timeout
		);

		this.resetHandler = () =>
		{
			if (!this.settings.autoCollapseEnabled) return;
			clearTimeout(this.timer);
			this.timer = window.setTimeout(
				() => this.collapseAllTopFolders(),
				timeout
			);
		};

		['mousemove', 'keydown', 'click', 'focus'].forEach((evt) =>
		{
			window.addEventListener(evt, this.resetHandler, true);
		});
	}

	stopInactivityTimer()
	{
		if (this.timer) clearTimeout(this.timer);
		if (this.resetHandler)
		{
			['mousemove', 'keydown', 'click', 'focus'].forEach((evt) =>
			{
				window.removeEventListener(evt, this.resetHandler, true);
			});
		}
	}

	setupExplorer()
	{
		this.detachListeners();

		const explorer = this.getFileExplorerElement();
		if (!explorer) return;

		this.observer = new MutationObserver((muts) =>
		{
			for (const m of muts)
			{
				if (
					m.type === 'attributes' &&
					m.attributeName === 'class' &&
					m.target.classList.contains('is-collapsed')
				)
				{
					this.collapseChildFolders(m.target);
				}
			}
		});
		this.observer.observe(explorer, {
			attributes: true,
			subtree: true,
			attributeFilter: ['class']
		});

		this.clickHandler = (ev) =>
		{
			if (!this.settings.exclusiveAccordionEnabled) return;

			const sourceEl = ev.target instanceof Element ? ev.target : null;
			const target = sourceEl
				? sourceEl.closest('.nav-folder, .tree-item-folder')
				: null;
			if (!target) return;

			setTimeout(() =>
			{
				if (!target.classList.contains('is-collapsed'))
				{
					this.collapseOtherFolders(target);
				}
			}, 0);
		};
		explorer.addEventListener('click', this.clickHandler, true);
	}

	detachListeners()
	{
		if (this.observer)
		{
			this.observer.disconnect();
			this.observer = null;
		}
		const explorer = this.getFileExplorerElement();
		if (explorer && this.clickHandler)
		{
			explorer.removeEventListener('click', this.clickHandler, true);
		}
		this.clickHandler = null;
	}

	getFileExplorerElement()
	{
		const selectors = [
			'.nav-files-container.node-insert-event',
			'.file-explorer-view',
			'.workspace-leaf-content[data-type="file-explorer"]',
			'.workspace-tab-container .nav-files-container'
		];
		for (const s of selectors)
		{
			const el = document.querySelector(s);
			if (el) return el;
		}
		return null;
	}

	collapseAllTopFolders()
	{
		const explorer = this.getFileExplorerElement();
		if (!explorer) return;

		explorer.querySelectorAll('.nav-folder, .tree-item-folder').forEach((folder) =>
		{
			if (!folder.classList.contains('is-collapsed'))
			{
				folder.querySelector(ICON_SELECTORS)?.click();
			}
		});
	}

	async collapseChildFolders(folder)
	{
		const container = folder.querySelector(
			'.nav-folder-children, .child-folder-container'
		);
		if (!container) return;

		const subs = container.querySelectorAll('.nav-folder, .child-folder');
		await Promise.all(
			Array.from(subs).map((sf) => this.collapseSubfolder(sf))
		);
	}

	collapseSubfolder(subfolder)
	{
		return new Promise(async (resolve) =>
		{
			const localObserver = new MutationObserver((muts) =>
			{
				if (
					muts.some(
						(m) =>
							m.type === 'attributes' &&
							m.attributeName === 'class' &&
							m.target.classList.contains('is-collapsed')
					)
				)
				{
					localObserver.disconnect();
					resolve();
				}
			});
			localObserver.observe(subfolder, {
				attributes: true,
				attributeFilter: ['class']
			});

			const icon = subfolder.querySelector(ICON_SELECTORS);
			if (icon && !subfolder.classList.contains('is-collapsed'))
			{
				try
				{
					icon.click();
					await sleep(150);
				}
				catch (e)
				{
					/* ignore */
				}
			}
			localObserver.disconnect();
			resolve();
		});
	}

	collapseOtherFolders(openedFolder)
	{
		const explorer = this.getFileExplorerElement();
		if (!explorer) return;

		explorer.querySelectorAll('.nav-folder, .tree-item-folder').forEach((folder) =>
		{
			if (
				folder === openedFolder ||
				folder.contains(openedFolder) ||
				openedFolder.contains(folder)
			)
			{
				return;
			}
			if (!folder.classList.contains('is-collapsed'))
			{
				folder.querySelector(ICON_SELECTORS)?.click();
			}
		});
	}
};

class AutoFolderCollapseSettingTab extends PluginSettingTab
{
	constructor(app, plugin)
	{
		super(app, plugin);
		this.plugin = plugin;
	}

	display()
	{
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Auto Folder Collapse - Settings' });

		new Setting(containerEl)
			.setName('Enable auto collapse')
			.setDesc('Collapse all parent folders after a period of inactivity.')
			.addToggle((t) =>
			{
				t.setValue(this.plugin.settings.autoCollapseEnabled).onChange(
					async (v) =>
					{
						this.plugin.settings.autoCollapseEnabled = v;
						await this.plugin.saveSettings();
						v
							? this.plugin.startInactivityTimer()
							: this.plugin.stopInactivityTimer();
					}
				);
			});

		new Setting(containerEl)
			.setName('Inactivity duration (minutes)')
			.setDesc('Minutes of inactivity before collapsing parent folders.')
			.addText((txt) =>
			{
				txt.setPlaceholder('5')
					.setValue(String(this.plugin.settings.inactivityMinutes))
					.onChange(async (v) =>
					{
						const n = parseInt(v);
						if (!isNaN(n) && n > 0)
						{
							this.plugin.settings.inactivityMinutes = n;
							await this.plugin.saveSettings();
							if (this.plugin.settings.autoCollapseEnabled)
							{
								this.plugin.startInactivityTimer();
							}
						}
					});
			});

		new Setting(containerEl)
			.setName('Exclusive accordion')
			.setDesc('When expanding a folder, automatically collapse all others.')
			.addToggle((t) =>
			{
				t.setValue(
					this.plugin.settings.exclusiveAccordionEnabled
				).onChange(async (v) =>
				{
					this.plugin.settings.exclusiveAccordionEnabled = v;
					await this.plugin.saveSettings();
				});
			});
	}
}
