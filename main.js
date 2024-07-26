const { Plugin } = require('obsidian');


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = class CollapseSubfoldersPlugin extends Plugin {
    async onload() {
        console.log('Loading Collapse Subfolders Plugin');
        await this.setupObserverWithRetries();
    }

    onunload() {
        console.log('Unloading Collapse Subfolders Plugin');
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    async setupObserverWithRetries(retries = 3, delayMs = 1000) {
        for (let i = 0; i < retries; i++) {
            const fileExplorer = document.querySelector('.workspace-leaf-content');
            if (fileExplorer) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'class') {
                            const target = mutation.target;
                            if (target.classList.contains('is-collapsed')) {
                                this.handleFolderCollapse(target);
                            }
                        }
                    });
                });

                observer.observe(fileExplorer, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: ['class'],
                });

                this.observer = observer;
                return;
            } else {
                console.log(`File explorer not found, retrying in ${delayMs}ms...`);
                await sleep(delayMs);
            }
        }
        console.error('Failed to set up observer after multiple retries');
    }

    handleFolderCollapse(folder) {
        const subfolders = folder.querySelectorAll('.nav-folder-children .nav-folder');
        const collapsePromises = Array.from(subfolders).map(subfolder => this.collapseSubfolder(subfolder));

        Promise.all(collapsePromises).then(() => {
        });
    }

    collapseSubfolder(subfolder) {
        return new Promise(async resolve => {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.target.classList.contains('is-collapsed')) {
                        observer.disconnect();
                        resolve();
                    }
                });
            });

            observer.observe(subfolder, { attributes: true, attributeFilter: ['class'] });

            const collapseIcon = subfolder.querySelector('.nav-folder-collapse-indicator');
            if (collapseIcon && !subfolder.classList.contains('is-collapsed')) {
                collapseIcon.click();
                await sleep(100);
            } else {
                resolve();
            }
        });
    }
};
