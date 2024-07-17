const { Plugin } = require('obsidian');

module.exports = class CollapseSubfoldersPlugin extends Plugin {
    onload() {
        console.log('Loading Collapse Subfolders Plugin');

        this.registerEvent(
            this.app.workspace.on('file-explorer-collapse', this.handleFolderCollapse.bind(this))
        );
    }

    onunload() {
        console.log('Unloading Collapse Subfolders Plugin');
    }

    handleFolderCollapse(folder) {
        const subfolders = folder.el.querySelectorAll('.nav-folder-children .nav-folder');
        subfolders.forEach((subfolder) => {
            if (subfolder.classList.contains('is-collapsed')) {
                subfolder.classList.remove('is-collapsed');
            }
        });
    }
};
