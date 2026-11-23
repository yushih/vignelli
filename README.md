Vignelli is a Web frontend tool to help you describe to your coding agent how you would like to change the page it generated. Instead of having to use languages to refer to the element you want to change, you can point at them and annotate.

The project name Vignelli is a a tribute to the Italian designer [Massimo Vignelli](https://uxdesign.cc/the-vignelli-canon-a-design-classic-from-the-last-of-the-modernists-74d6e7dc0169).


## Usage

Install from Chrome web store: https://chromewebstore.google.com/detail/vignelli/oafpkeleopngacflhincdfgnmmlhemcm. On the vibe coded webpage, open Chrome’s Extensions menu and click "V" icon to start. Click a page element to annotate it. Click "V" again when finished.

## Development

From `extension/`, run `npm ci` and `npm run build` using Node.js 26. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `extension/dist`.
