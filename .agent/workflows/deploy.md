---
description: Deploy the application to GitHub Pages with auto-versioning
---
This workflow automates the deployment process, ensuring version information is updated and code is synchronized before pushing.

1.  Run the deployment script (Windows)
    ```cmd
    deploy.cmd "Update site"
    ```
    *(Note: The `deploy.cmd` script has been updated to automatically run `node update_version.js` and `git pull` before committing)*

// turbo-all
