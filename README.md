Vignelli is a Web frontend tool to help you describe to your coding agent how you would like to change the page it generated. Instead of having to use languages to refer to the element you want to change, you can point at them and 

The project name Vignelli is a a tribute to the Italian designer [Massimo Vignelli](https://uxdesign.cc/the-vignelli-canon-a-design-classic-from-the-last-of-the-modernists-74d6e7dc0169).


include url

## Chrome extension

From `extension/`, run `npm ci` and `npm run build` using Node.js 26. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `extension/dist`.

On a webpage, open Chrome’s Extensions menu and click **Vignelli**. Click a page element to annotate it. After editing `injected.ts`, rebuild and reload the extension.
