const { Plugin, Setting, PluginSettingTab } = require('obsidian');

const DEFAULT_SETTINGS = { autoCollapseEnabled: false, inactivityMinutes: 5 };
const ICON_SELECTORS = '.collapse-icon, .tree-item-collapse, [data-action="toggle-folder"]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = class AutoFolderCollapsePlugin extends Plugin
{
	async onload()
	{
		console.log('Auto Folder Collapse Plugin loaded');

		await this.loadSettings();
		this.addSettingTab(new AutoFolderCollapseSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('layout-ready', () => this.setupExplorerObserver())
		);
		this.registerEvent(
			this.app.workspace.on('layout-change', () => this.setupExplorerObserver())
		);

		if (this.settings.autoCollapseEnabled)
		{
			this.startInactivityTimer();
		}
	}

	onunload()
	{
		if (this.observer)
		{
			this.observer.disconnect();
		}
		this.stopInactivityTimer();
		console.log('Auto Folder Collapse Plugin unloaded');
	}

	/* ---------- settings ---------- */
	async loadSettings()
	{
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings()
	{
		await this.saveData(this.settings);
	}

	/* ---------- inactivity timer ---------- */
	startInactivityTimer()
	{
		this.stopInactivityTimer();

		const timeout = this.settings.inactivityMinutes * 60 * 1000;
		this.timer = window.setTimeout(() => this.collapseAllTopFolders(), timeout);

		this.resetHandler = () =>
		{
			if (!this.settings.autoCollapseEnabled)
			{
				return;
			}
			clearTimeout(this.timer);
			this.timer = window.setTimeout(() => this.collapseAllTopFolders(), timeout);
		};

		['mousemove', 'keydown', 'click', 'focus'].forEach((evt) =>
		{
			window.addEventListener(evt, this.resetHandler, true);
		});
	}

	stopInactivityTimer()
	{
		if (this.timer)
		{
			clearTimeout(this.timer);
		}
		if (this.resetHandler)
		{
			['mousemove', 'keydown', 'click', 'focus'].forEach((evt) =>
			{
				window.removeEventListener(evt, this.resetHandler, true);
			});
		}
	}

	/* ---------- explorer observer ---------- */
	async setupExplorerObserver(retries = 5, delayMs = 500)
	{
		if (this.observer)
		{
			this.observer.disconnect();
		}

		for (let i = 0; i < retries; i++)
		{
			const explorer = this.getFileExplorerElement();
			if (explorer)
			{
				this.observeExplorer(explorer);
				return;
			}
			await sleep(delayMs);
		}
		console.error('File Explorer element not found');
	}

	getFileExplorerElement()
	{
		const selectors = [
			'.nav-files-container.node-insert-event',
			'.file-explorer-view',
			'.workspace-leaf-content[data-type="file-explorer"]',
			'.workspace-tab-container .nav-files-container'
		];
		for (const selector of selectors)
		{
			const el = document.querySelector(selector);
			if (el)
			{
				return el;
			}
		}
		return null;
	}

	observeExplorer(explorer)
	{
		const observer = new MutationObserver((mutations) =>
		{
			for (const mutation of mutations)
			{
				if (mutation.type === 'attributes' && mutation.attributeName === 'class')
				{
					const target = mutation.target;
					if (target.classList.contains('is-collapsed'))
					{
						this.collapseChildFolders(target);
					}
				}
			}
		});

		observer.observe(explorer, { attributes: true, subtree: true, attributeFilter: ['class'] });
		this.observer = observer;
	}

	/* ---------- collapse helpers ---------- */
	collapseAllTopFolders()
	{
		const explorer = this.getFileExplorerElement();
		if (!explorer)
		{
			return;
		}
		explorer.querySelectorAll('.nav-folder, .tree-item-folder').forEach((folder) =>
		{
			if (!folder.classList.contains('is-collapsed'))
			{
				folder.querySelector(ICON_SELECTORS)?.click();
			}
		});
		console.log('Parent folders collapsed after inactivity');
	}

	async collapseChildFolders(folder)
	{
		const container = folder.querySelector('.nav-folder-children, .child-folder-container');
		if (!container)
		{
			return;
		}
		const subfolders = container.querySelectorAll('.nav-folder, .child-folder');
		await Promise.all(Array.from(subfolders).map((sf) => this.collapseSubfolder(sf)));
	}

	collapseSubfolder(subfolder)
	{
		return new Promise(async (resolve) =>
		{
			const localObserver = new MutationObserver((mutations) =>
			{
				for (const mutation of mutations)
				{
					if (
						mutation.type === 'attributes' &&
						mutation.attributeName === 'class' &&
						mutation.target.classList.contains('is-collapsed')
					)
					{
						localObserver.disconnect();
						resolve();
					}
				}
			});
			localObserver.observe(subfolder, { attributes: true, attributeFilter: ['class'] });

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
					console.error('Error collapsing subfolder', e);
				}
			}
			localObserver.disconnect();
			resolve();
		});
	}
};

/* ---------- settings tab ---------- */
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
			.addToggle((toggle) =>
			{
				toggle
					.setValue(this.plugin.settings.autoCollapseEnabled)
					.onChange(async (value) =>
					{
						this.plugin.settings.autoCollapseEnabled = value;
						await this.plugin.saveSettings();
						if (value)
						{
							this.plugin.startInactivityTimer();
						}
						else
						{
							this.plugin.stopInactivityTimer();
						}
					});
			});

		new Setting(containerEl)
			.setName('Inactivity duration (minutes)')
			.setDesc('Minutes of inactivity before collapsing parent folders.')
			.addText((text) =>
			{
				text
					.setPlaceholder('5')
					.setValue(String(this.plugin.settings.inactivityMinutes))
					.onChange(async (value) =>
					{
						const num = parseInt(value);
						if (!isNaN(num) && num > 0)
						{
							this.plugin.settings.inactivityMinutes = num;
							await this.plugin.saveSettings();
							if (this.plugin.settings.autoCollapseEnabled)
							{
								this.plugin.startInactivityTimer();
							}
						}
					});
			});
	}
}
