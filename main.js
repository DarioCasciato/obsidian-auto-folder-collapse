const { Plugin } = require('obsidian');

module.exports = class CollapseSubfoldersPlugin extends Plugin
{
    onload()
    {
        console.log('Loading Collapse Subfolders Plugin');

        const observer = new MutationObserver((mutations) =>
        {
            mutations.forEach((mutation) =>
            {
                if (mutation.attributeName === 'class')
                {
                    const target = mutation.target;
                    if (target.classList.contains('is-collapsed'))
                    {
                        this.handleFolderCollapse(target);
                    }
                }
            });
        });

        const fileExplorer = document.querySelector('.workspace-leaf-content');
        if (fileExplorer)
        {
            observer.observe(fileExplorer,
            {
                attributes: true,
                subtree: true,
                attributeFilter: ['class'],
            });
        }

        this.observer = observer;
    }

    onunload()
    {
        console.log('Unloading Collapse Subfolders Plugin');
        if (this.observer)
        {
            this.observer.disconnect();
        }
    }

    handleFolderCollapse(folder)
    {
        const subfolders = folder.querySelectorAll('.nav-folder-children .nav-folder');
        subfolders.forEach((subfolder) =>
        {
            if (!subfolder.classList.contains('is-collapsed'))
            {
                this.collapseSubfolder(subfolder);
            }
        });
    }

    collapseSubfolder(subfolder)
    {
        const collapseIcon = subfolder.querySelector('.nav-folder-collapse-indicator');
        if (collapseIcon)
        {
            collapseIcon.click(); // Simulate click to collapse
        }
    }
};