const { Plugin } = require('obsidian');

module.exports = class CollapseSubfoldersPlugin extends Plugin {
    onload() {
        console.log('Loading Collapse Subfolders Plugin');

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

        const fileExplorer = document.querySelector('.workspace-leaf-content');
        if (fileExplorer) {
            observer.observe(fileExplorer, {
                attributes: true,
                subtree: true,
                attributeFilter: ['class'],
            });
        }

        this.observer = observer;
    }

    onunload() {
        console.log('Unloading Collapse Subfolders Plugin');
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    handleFolderCollapse(folder) {
        console.log('Folder collapsed:', folder);
        const subfolders = folder.querySelectorAll('.nav-folder-children .nav-folder');
        subfolders.forEach((subfolder) => {
            if (!subfolder.classList.contains('is-collapsed')) {
                console.log('Collapsing subfolder:', subfolder);
                subfolder.classList.add('is-collapsed');
                this.collapseSubfolderContents(subfolder);
                console.log('Collapsed subfolder:', subfolder);
            } else {
                console.log('Subfolder already collapsed:', subfolder);
            }
        });
    }

    collapseSubfolderContents(subfolder) {
        const subfolderChildren = subfolder.querySelector('.nav-folder-children');
        if (subfolderChildren) {
            subfolderChildren.style.display = 'none';
        }
        const collapseIcon = subfolder.querySelector('.nav-folder-collapse-indicator');
        if (collapseIcon) {
            collapseIcon.classList.add('is-collapsed');
        }
        console.log('Collapsed contents of subfolder:', subfolder);
        console.log('Subfolder display style:', subfolderChildren ? subfolderChildren.style.display : 'no children');
        console.log('Subfolder collapse icon class:', collapseIcon ? collapseIcon.classList : 'no icon');
    }
};
