const { Plugin } = require('obsidian');

// Utility function to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = class CollapseSubfoldersPlugin extends Plugin {
    async onload() {
        console.log('Loading Auto Folder Collapse Plugin');
        this.registerEvent(this.app.workspace.on('layout-ready', () => {
            this.setupObserverWithRetries();
        }));
    }

    onunload() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    async setupObserverWithRetries(retries = 5, delayMs = 1000) {
        for (let i = 0; i < retries; i++) {
            const fileExplorer = this.getFileExplorerElement();
            if (fileExplorer) {
                this.setupMutationObserver(fileExplorer);
                return;
            } else {
                await sleep(delayMs);
            }
        }
    }

    getFileExplorerElement() {
        const selectors = [
            '.nav-files-container.node-insert-event',
            '.file-explorer-view',
            '.workspace-leaf-content[data-type="file-explorer"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        return null;
    }

    setupMutationObserver(fileExplorer) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('is-collapsed')) {
                        this.handleFolderCollapse(target);
                    }
                }
            }
        });

        observer.observe(fileExplorer, {
            attributes: true,
            subtree: true,
            attributeFilter: ['class'],
        });

        this.observer = observer;
    }

    async handleFolderCollapse(folder) {
        const subfoldersContainer = folder.querySelector('.nav-folder-children') || folder.querySelector('.child-folder-container');
        if (!subfoldersContainer) return;

        const subfolders = subfoldersContainer.querySelectorAll('.nav-folder') || subfoldersContainer.querySelectorAll('.child-folder');
        if (!subfolders.length) return;

        const collapsePromises = Array.from(subfolders).map(subfolder => this.collapseSubfolder(subfolder));
        await Promise.all(collapsePromises);
    }

    collapseSubfolder(subfolder) {
        return new Promise(async (resolve) => {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (mutation.target.classList.contains('is-collapsed')) {
                            observer.disconnect();
                            resolve();
                        }
                    }
                }
            });

            observer.observe(subfolder, { attributes: true, attributeFilter: ['class'] });

            const collapseIcon = subfolder.querySelector('.collapse-icon') || subfolder.querySelector('[data-action="toggle-folder"]');
            if (collapseIcon && !subfolder.classList.contains('is-collapsed')) {
                collapseIcon.click();
                await sleep(200); // Accommodate potential animation delays
            } else {
                observer.disconnect();
                resolve();
            }
        });
    }
};
