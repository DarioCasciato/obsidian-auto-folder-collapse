const { Plugin, Setting, PluginSettingTab } = require('obsidian');

const DEFAULT_SETTINGS = {
    autoCollapseEnabled: false,
    inactivityMinutes: 5
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = class AutoFolderCollapsePlugin extends Plugin
{
    async onload()
    {
        console.log('Auto Folder Collapse Plugin loaded');

        await this.loadSettings();
        this.addSettingTab(new AutoFolderCollapseSettingTab(this.app, this));

        this.registerEvent(
            this.app.workspace.on('layout-ready', () =>
            {
                this.setupExplorerObserver();
            })
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

    async loadSettings()
    {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings()
    {
        await this.saveData(this.settings);
    }

    // Inactivity timer
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

        ['mousemove', 'keydown', 'click', 'focus'].forEach(evt =>
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
            ['mousemove', 'keydown', 'click', 'focus'].forEach(evt =>
            {
                window.removeEventListener(evt, this.resetHandler, true);
            });
        }
    }

    collapseAllTopFolders()
    {
        const explorer = this.getFileExplorerElement();
        if (!explorer)
        {
            return;
        }
        const folders = explorer.querySelectorAll('.nav-folder, .tree-item-folder');
        folders.forEach(folder =>
        {
            if (!folder.classList.contains('is-collapsed'))
            {
                const icon = folder.querySelector('.collapse-icon') || folder.querySelector('[data-action="toggle-folder"]');
                icon?.click();
            }
        });
        console.log('Parent folders collapsed after inactivity');
    }

    // Explorer observer
    async setupExplorerObserver(retries = 5, delayMs = 1000)
    {
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
            '.workspace-leaf-content[data-type="file-explorer"]'
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
        const observer = new MutationObserver(mutations =>
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

    async collapseChildFolders(folder)
    {
        const container = folder.querySelector('.nav-folder-children') || folder.querySelector('.child-folder-container');
        if (!container)
        {
            return;
        }
        const subfolders = container.querySelectorAll('.nav-folder, .child-folder');
        await Promise.all(Array.from(subfolders).map(sf => this.collapseSubfolder(sf)));
    }

    collapseSubfolder(subfolder)
    {
        return new Promise(async resolve =>
        {
            const localObserver = new MutationObserver(mutations =>
            {
                for (const mutation of mutations)
                {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class' && mutation.target.classList.contains('is-collapsed'))
                    {
                        localObserver.disconnect();
                        resolve();
                    }
                }
            });

            localObserver.observe(subfolder, { attributes: true, attributeFilter: ['class'] });

            const icon = subfolder.querySelector('.collapse-icon') || subfolder.querySelector('[data-action="toggle-folder"]');
            if (icon && !subfolder.classList.contains('is-collapsed'))
            {
                try
                {
                    icon.click();
                    await sleep(200);
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
        containerEl.createEl('h2', { text: 'Auto Folder Collapse – Settings' });

        new Setting(containerEl)
            .setName('Enable auto collapse')
            .setDesc('Collapse all parent folders after a period of inactivity.')
            .addToggle(toggle =>
            {
                toggle
                    .setValue(this.plugin.settings.autoCollapseEnabled)
                    .onChange(async value =>
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
            .addText(text =>
            {
                text
                    .setPlaceholder('5')
                    .setValue(String(this.plugin.settings.inactivityMinutes))
                    .onChange(async value =>
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

