# Vignelli

Vignelli lets a reviewer point to a webpage element and write the change they want a coding agent to make.

## Acceptance checks

Run these on a webpage with at least two visible elements after loading the extension as described in the [README](README.md).

| Action | Expected result |
| --- | --- |
| Choose Vignelli from Chrome’s Extensions menu and hover over a page element. | The action popup says “Click a page element to add a review. Click this button again when finished”. An outline follows the hovered element in the active tab. |
| Keep the pointer still and scroll the page or a nested container. | The outline tracks the element now under the pointer and disappears over the page background or an annotation. |
| Click an element and type a multiline note. | One annotation opens at the click location. Typing edits that note. |
| Drag an exposed part of the annotation. | The box moves. A line connects the original click to the nearest point on the box border. |
| Scroll the document or a nested container after dragging a review box. | The connector stays anchored to the clicked point on the element, and the box keeps its offset from that point. |
| Drag the bottom-right resize handle, then select text in the note. | The box resizes in place, the connector follows the border, and text selection leaves the box in place. |
| Click a second element. | The first note is preserved and exactly one new annotation opens. |
| Close either annotation. | Its box and connector disappear. The other note remains editable. |
| Click Vignelli again during review. | A confirmation dialog opens on the page without the action popup. Escape resumes the review. |
| Inspect the finish dialog and choose Copy report. | The preview and clipboard contain the same page URL, numbered comments with click coordinates and element paths, and an indented snapshot of the rendered page with layout and visibility. Scripts and Vignelli controls are omitted. |
| Inspect the rendered DOM for links and images. | Each `<a>` includes its `href` and each `<img>` includes its `src` when present, preserving relative URLs. |
| Review an image and a box containing text. | Each comment records its target at click time: the resolved image URL for an image, or up to 512 characters of rendered text, including text in descendants, for a text box. |
| Choose Download report and copy filename. | A UTF-8 text file containing the exact preview downloads. Its name uses the form `vignelli-review-<ISO time>.txt` with a filename-safe UTC timestamp, and the same filename is copied to the clipboard. |
| Confirm the finish dialog, then start another review. | The dialog, annotations, connectors, and outline disappear. Page clicks work normally until the next activation starts a fresh review. |
