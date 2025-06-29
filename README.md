# Auto Folder Collapse

A plugin for [Obsidian](https://obsidian.md) that automatically collapses all child folders when you collapse a parent folder. This helps keep your file explorer organized and clutter-free.

## Installation

### Downloading from the Obsidian.md Community Plugin Browser

1. Open Obsidian and go to `Settings`.
2. Navigate to the `Community plugins` section.
3. Click on `Browse` and search for `Auto Folder Collapse`.
4. Click `Install` and then `Enable`.

### Downloading from the GitHub Repository

1. Download the plugin files from the [GitHub repository](https://github.com/DarioCasciato).
2. Copy the Plugin Folder to your Obsidian vault's plugins folder: `<vault>/.obsidian/plugins/`.
3. Enable the plugin in Obsidian:
   - Open Obsidian and go to `Settings`.
   - Navigate to the `Community plugins` section.
   - Refresh the Community Plugin list.
   - Enable the new Plugin.

## Demo

<img src="./folder-collapse.gif" width="400">

## Usage

Once the plugin is enabled, it will automatically collapse all child folders when you collapse a parent folder. You don't need to do anything else!

The plugin offers two independent features, each controlled by a toggle in
**Settings → Auto Folder Collapse**.

| Feature | Default | What it does |
| ------- | ------- | ------------ |
| **Auto-collapse children on parent collapse** | **Off** | When you collapse a folder, every sub-folder inside it is collapsed too (original behaviour). |
| **Exclusive accordion** | **Off** | When you expand a folder, all other folders that are not its ancestors or descendants are automatically collapsed. This keeps the sidebar focused on the area you’re working in. |

Enable or disable either feature at any time; the change takes effect immediately.


## Troubleshooting

If you encounter any issues with the plugin, try the following steps:

1. Ensure you are using the minimum required version of Obsidian (`0.12.0`).
2. Disable and re-enable the plugin in the Obsidian settings.
3. Restart Obsidian.

If the problem persists, please report it on the [GitHub Issues page](https://github.com/DarioCasciato/obsidian-auto-folder-collapse/issues).

## Author

Developed by [Dario Casciato](https://github.com/DarioCasciato).

[Buy me a espresso](https://buymeacoffee.com/dcasciato0s)

## License

This plugin is licensed under the [MIT License](https://github.com/DarioCasciato/obsidian-auto-folder-collapse/blob/main/LICENSE).
