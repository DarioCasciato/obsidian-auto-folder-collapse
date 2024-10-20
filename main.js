const { Plugin } = require('obsidian');

// Utility function to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = class CollapseSubfoldersPlugin extends Plugin {
    async onload() {
        console.log('Loading Auto Folder Collapse Plugin'); // Startup log
        this.registerEvent(this.app.workspace.on('layout-ready', () => {
            this.setupObserverWithRetries();
        }));
    }

    onunload() {
        if (this.observer) {
            this.observer.disconnect();
            console.log('Auto Folder Collapse Plugin unloaded and observer disconnected.'); // Shutdown log
        }
    }

    async setupObserverWithRetries(retries = 5, delayMs = 1000) {
        for (let i = 0; i < retries; i++) {
            const fileExplorer = this.getFileExplorerElement();
            if (fileExplorer) {
                this.setupMutationObserver(fileExplorer);
                return;
            } else {
                console.warn(`File Explorer element not found. Retry ${i + 1}/${retries} after ${delayMs}ms.`);
                await sleep(delayMs);
            }
        }
        console.error('Auto Folder Collapse Plugin: File Explorer element not found after all retries.');
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
        if (!fileExplorer) {
            console.error('Cannot set up MutationObserver: fileExplorer is null.');
            return;
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target && target.classList.contains('is-collapsed')) {
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
        console.log('MutationObserver has been set up to monitor folder collapses.'); // Mutation Observer Setup log
    }

    async handleFolderCollapse(folder) {
        if (!folder) {
            console.error('handleFolderCollapse called with null folder.');
            return;
        }

        const subfoldersContainer = folder.querySelector('.nav-folder-children') || folder.querySelector('.child-folder-container');
        if (!subfoldersContainer) {
            return;
        }

        const subfolders = subfoldersContainer.querySelectorAll('.nav-folder') || subfoldersContainer.querySelectorAll('.child-folder');
        if (!subfolders.length) {
            return;
        }

        const collapsePromises = Array.from(subfolders).map(subfolder => this.collapseSubfolder(subfolder));
        try {
            await Promise.all(collapsePromises);
        } catch (error) {
            console.error('Error collapsing subfolders:', error);
        }
    }

    collapseSubfolder(subfolder) {
        return new Promise(async (resolve) => {
            if (!subfolder) {
                console.error('collapseSubfolder called with null subfolder.');
                resolve();
                return;
            }

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
                try {
                    collapseIcon.click();
                    await sleep(200); // Accommodate potential animation delays
                } catch (error) {
                    console.error('Error clicking collapse icon:', error);
                    observer.disconnect();
                    resolve();
                }
            } else {
                observer.disconnect();
                resolve();
            }
        });
    }
};
