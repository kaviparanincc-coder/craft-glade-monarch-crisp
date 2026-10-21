My Assistant — Android PWA deployment package

Deploy the CONTENTS of this folder (index.html must be at the site root) to a static HTTPS host.
Recommended: Cloudflare Pages Direct Upload. Create a Pages project, choose Direct Upload / Upload assets, and upload this ZIP if the dashboard offers ZIP upload.
Alternatively, use Netlify Drop if it allows selecting the ZIP on your device.
After deployment, open the resulting HTTPS URL in Chrome, wait for it to finish loading, then tap ⋮ > Install app (or Add to Home screen).

Do not open index.html directly from Downloads: service workers and PWA installation require HTTPS or localhost.
