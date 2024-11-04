const { Plugin } = require('obsidian');

// Utility function to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = class CollapseSubfoldersPlugin extends Plugin {
    async onload() {
        console.log('Loading Auto Folder Collapse Plugin'); // Startup log

        // Initial setup when layout is ready
        this.registerEvent(this.app.workspace.on('layout-ready', () => {
            this.setupObserverWithRetries();
        }));

        // Set up a MutationObserver to watch for workspace layout changes
        this.setupWorkspaceObserver();
    }

    onunload() {
        // Disconnect the MutationObserver for file explorer
        if (this.observer) {
            this.observer.disconnect();
            console.log('Auto Folder Collapse Plugin unloaded and observer disconnected.'); // Shutdown log
        }

        // Disconnect the MutationObserver for workspace
        if (this.workspaceObserver) {
            this.workspaceObserver.disconnect();
            console.log('Workspace observer disconnected.');
        }
    }

     //Sets up the primary MutationObserver with retries.

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


    //Retrieves the file explorer DOM element using various selectors.
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

    // Sets up the MutationObserver to monitor folder collapses within the file explorer.
    setupMutationObserver(fileExplorer) {
        if (!fileExplorer) {
            console.error('Cannot set up MutationObserver: fileExplorer is null.');
            return;
        }

        // Disconnect existing observer if any to prevent multiple observers
        if (this.observer) {
            this.observer.disconnect();
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
    }

    // Handles the collapse of a folder by collapsing all its subfolders.
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

    // Collapses a single subfolder
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

    // Sets up a MutationObserver to monitor workspace layout changes and re-register the primary MutationObserver as needed.
    setupWorkspaceObserver() {
        const workspaceRoot = document.querySelector('.workspace');
        if (!workspaceRoot) {
            console.error('Workspace root element not found. Cannot set up workspace observer.');
            return;
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node is the file explorer
                            const fileExplorer = node.querySelector('.nav-files-container.node-insert-event') ||
                                                 node.querySelector('.file-explorer-view') ||
                                                 node.querySelector('.workspace-leaf-content[data-type="file-explorer"]');
                            if (fileExplorer) {
                                this.setupObserverWithRetries();
                            }
                        }
                    });
                }
            }
        });

        observer.observe(workspaceRoot, {
            childList: true,
            subtree: true
        });

        this.workspaceObserver = observer;
    }
};
