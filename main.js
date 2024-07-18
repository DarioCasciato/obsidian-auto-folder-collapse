const { Plugin } = require('obsidian');


function delay(time)
{
    return new Promise(resolve => setTimeout(resolve, time));
}


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
        const collapsePromises = Array.from(subfolders).map(subfolder => this.collapseSubfolder(subfolder));

        Promise.all(collapsePromises).then(() =>
        {
            console.log('All subfolders collapsed');
        });
    }

    collapseSubfolder(subfolder)
    {
        return new Promise(async resolve =>
        { // Note the use of async here
            const observer = new MutationObserver(mutations =>
            {
                mutations.forEach(mutation =>
                {
                    if (mutation.target.classList.contains('is-collapsed'))
                    {
                        observer.disconnect();
                        resolve();
                    }
                });
            });

            observer.observe(subfolder, { attributes: true, attributeFilter: ['class'] });

            const collapseIcon = subfolder.querySelector('.nav-folder-collapse-indicator');
            if (collapseIcon && !subfolder.classList.contains('is-collapsed'))
            {
                collapseIcon.click();
                await delay(100);
            }
            else
            {
                resolve();
            }
        });
    }
};