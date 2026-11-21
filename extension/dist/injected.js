"use strict";
(() => {
    const state = window;
    if (state.vignelliReview) {
        state.vignelliReview.requestFinish();
    }
    else {
        startReview();
        return 'started';
    }
    function startReview() {
        const owned = new WeakSet();
        function pathStep(el) {
            const name = el.namespaceURI === 'http://www.w3.org/1999/xhtml'
                ? el.localName : `*[local-name()="${el.localName}"]`;
            let index = 1;
            for (let sibling = el.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
                if (!owned.has(sibling) && sibling.localName === el.localName)
                    index++;
            }
            return `${name}[${index}]`;
        }
        function describeReviewTarget(el) {
            if (el instanceof HTMLImageElement) {
                const url = el.currentSrc || el.src;
                return url ? `Image URL: ${url}` : '';
            }
            if (!(el instanceof HTMLElement || el instanceof SVGTextElement))
                return '';
            const text = el instanceof HTMLElement ? el.innerText : el.textContent;
            const excerpt = Array.from((text ?? '').trim()).slice(0, 512).join('');
            return excerpt ? `Element text: ${excerpt}` : '';
        }
        function describeDOM() {
            const lines = [`Viewport ${innerWidth} × ${innerHeight} CSS px, scroll (${scrollX}, ${scrollY})`];
            function visit(el, depth) {
                if (owned.has(el) || el.matches('script, style, noscript, template'))
                    return;
                const attrs = Array.from(el.attributes)
                    .filter(({ name }) => (el.localName === 'a' && name === 'href') ||
                    (el.localName === 'img' && name === 'src') ||
                    /^(id|class|name|role|type|alt|title|hidden|aria-[\w-]+|data-(?:testid|test-id|source|component))$/.test(name))
                    .map(({ name, value }) => `${name}=${JSON.stringify(value)}`);
                const rect = el.getBoundingClientRect();
                const css = getComputedStyle(el);
                const text = Array.from(el.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent).join(' ').replace(/\s+/g, ' ').trim();
                lines.push(`${'  '.repeat(depth)}${pathStep(el)} ${attrs.join(' ')}` +
                    ` | viewport (x,y,w,h)=(${[rect.x, rect.y, rect.width, rect.height].map(Math.round).join(',')})` +
                    ` position=${css.position} z-index=${css.zIndex} display=${css.display} visibility=${css.visibility} opacity=${css.opacity}` +
                    (text ? ` text=${JSON.stringify(text)}` : ''));
                for (const child of el.children)
                    visit(child, depth + 1);
            }
            visit(document.documentElement, 0);
            return lines.join('\n');
        }
        const reviews = new Map();
        const listeners = new AbortController();
        const overlay = document.createElement('div');
        overlay.hidden = true;
        Object.assign(overlay.style, {
            position: 'fixed',
            pointerEvents: 'none', // Crucial: lets elementFromPoint see through the overlay
            border: '2px solid #ff4757',
            backgroundColor: 'rgba(255, 71, 87, 0.15)',
            zIndex: '999999',
            transition: 'all 0.05s ease-out'
        });
        const inputBoxes = new WeakSet();
        function isInputBoxEvent(e) {
            return e.composedPath().some(node => node instanceof Element && inputBoxes.has(node));
        }
        let pointer;
        function updateHighlight() {
            const el = pointer && document.elementFromPoint(pointer.x, pointer.y);
            if (finishDialog.open || !el || el === document.body || el === document.documentElement ||
                el.closest('[data-vignelli-annotation]')) {
                overlay.hidden = true;
                return;
            }
            overlay.hidden = false;
            const rect = el.getBoundingClientRect();
            Object.assign(overlay.style, {
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`
            });
        }
        function createReviewBox(posX, posY, onClose, onInputChange, onMove) {
            const box = document.createElement('div');
            box.dataset.vignelliAnnotation = '';
            inputBoxes.add(box);
            Object.assign(box.style, {
                position: 'fixed', left: `${posX}px`, top: `${posY}px`,
                width: '240px', height: '140px', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', padding: '4px',
                border: '1px solid #666', background: 'white', zIndex: '1000001'
            });
            function button(label, icon) {
                const control = document.createElement('button');
                control.type = 'button';
                control.setAttribute('aria-label', label);
                control.textContent = icon;
                return control;
            }
            const close = button('Close annotation', '×');
            close.style.alignSelf = 'flex-end';
            const input = document.createElement('textarea');
            input.setAttribute('aria-label', 'Annotation');
            Object.assign(input.style, { flex: '1', minHeight: '0', resize: 'none' });
            const resize = button('Resize annotation', '◢');
            resize.style.alignSelf = 'flex-end';
            box.append(close, input, resize);
            function enableDrag(control, cursor, update) {
                Object.assign(control.style, { cursor, touchAction: 'none' });
                control.onpointerdown = down => {
                    if (down.target !== control || down.button !== 0 || !down.isPrimary)
                        return;
                    down.preventDefault();
                    const rect = box.getBoundingClientRect();
                    control.setPointerCapture(down.pointerId);
                    control.onpointermove = event => {
                        if (event.pointerId !== down.pointerId)
                            return;
                        update(rect, event.clientX - down.clientX, event.clientY - down.clientY);
                        onMove(box.getBoundingClientRect());
                    };
                    control.onlostpointercapture = () => { control.onpointermove = null; };
                };
            }
            enableDrag(box, 'move', (rect, dx, dy) => {
                box.style.left = `${rect.left + dx}px`;
                box.style.top = `${rect.top + dy}px`;
            });
            enableDrag(resize, 'nwse-resize', (rect, dx, dy) => {
                box.style.width = `${Math.max(100, rect.width + dx)}px`;
                box.style.height = `${Math.max(90, rect.height + dy)}px`;
            });
            close.onclick = () => { box.remove(); onClose(); };
            input.oninput = () => onInputChange(input.value);
            return box;
        }
        function handleClick(e) {
            const { clientX: x, clientY: y } = e;
            const el = document.elementFromPoint(x, y);
            if (finishDialog.open || e.composedPath().includes(finishDialog) ||
                isInputBoxEvent(e) || !el || el === document.documentElement)
                return;
            e.preventDefault();
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            Object.assign(svg.style, {
                position: 'fixed', inset: '0', width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: '1000000'
            });
            svg.setAttribute('aria-hidden', 'true');
            const line = document.createElementNS(svg.namespaceURI, 'line');
            line.setAttribute('stroke-width', '5');
            line.setAttribute('stroke', '#ff4757');
            svg.append(line);
            const targetRect = el.getBoundingClientRect();
            const pointOffsetX = x - targetRect.left;
            const pointOffsetY = y - targetRect.top;
            let boxOffsetX = 0;
            let boxOffsetY = 0;
            function updateLine(rect, x, y) {
                line.setAttribute('x1', String(x));
                line.setAttribute('y1', String(y));
                let endX = Math.max(rect.left, Math.min(x, rect.right));
                let endY = Math.max(rect.top, Math.min(y, rect.bottom));
                if (endX === x && endY === y) {
                    const nearest = Math.min(x - rect.left, rect.right - x, y - rect.top, rect.bottom - y);
                    if (nearest === x - rect.left)
                        endX = rect.left;
                    else if (nearest === rect.right - x)
                        endX = rect.right;
                    else if (nearest === y - rect.top)
                        endY = rect.top;
                    else
                        endY = rect.bottom;
                }
                line.setAttribute('x2', String(endX));
                line.setAttribute('y2', String(endY));
            }
            const steps = [];
            for (let ancestor = el; ancestor; ancestor = ancestor.parentElement) {
                steps.push(pathStep(ancestor));
            }
            const review = {
                path: '/' + steps.reverse().join('/'),
                elementDetails: describeReviewTarget(el),
                x,
                y,
                text: ''
            };
            const box = createReviewBox(x, y, () => {
                reviews.delete(review);
                svg.remove();
            }, (value) => {
                review.text = value;
            }, rect => {
                const target = el.getBoundingClientRect();
                const anchorX = target.left + pointOffsetX;
                const anchorY = target.top + pointOffsetY;
                boxOffsetX = rect.left - anchorX;
                boxOffsetY = rect.top - anchorY;
                updateLine(rect, anchorX, anchorY);
            });
            function reposition() {
                const target = el.getBoundingClientRect();
                const anchorX = target.left + pointOffsetX;
                const anchorY = target.top + pointOffsetY;
                box.style.left = `${anchorX + boxOffsetX}px`;
                box.style.top = `${anchorY + boxOffsetY}px`;
                updateLine(box.getBoundingClientRect(), anchorX, anchorY);
            }
            reviews.set(review, { reposition, remove: () => { box.remove(); svg.remove(); } });
            owned.add(svg);
            owned.add(box);
            document.body.append(svg, box);
            reposition();
        }
        owned.add(overlay);
        document.body.appendChild(overlay);
        document.addEventListener('mousemove', event => {
            pointer = { x: event.clientX, y: event.clientY };
            updateHighlight();
        }, { signal: listeners.signal });
        document.addEventListener('mouseleave', () => {
            pointer = undefined;
            updateHighlight();
        }, { signal: listeners.signal });
        document.addEventListener('scroll', () => {
            for (const annotation of reviews.values())
                annotation.reposition();
            updateHighlight();
        }, { capture: true, signal: listeners.signal });
        document.addEventListener('click', handleClick, { signal: listeners.signal });
        const finishDialog = document.createElement('dialog');
        owned.add(finishDialog);
        const report = document.createElement('textarea');
        report.readOnly = true;
        report.rows = 14;
        report.style.width = 'min(64ch, 70vw)';
        report.style.display = 'block';
        report.setAttribute('aria-label', 'Review report');
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.onclick = async () => {
            try {
                await navigator.clipboard.writeText(report.value);
                copy.textContent = 'Copied';
            }
            catch {
                report.focus();
                report.select();
                copy.textContent = document.execCommand('copy') ? 'Copied' : 'Press Ctrl+C or ⌘C to copy';
            }
        };
        const download = document.createElement('button');
        download.type = 'button';
        download.textContent = 'Download report and copy filename';
        const filenameField = document.createElement('input');
        filenameField.readOnly = true;
        filenameField.hidden = true;
        filenameField.setAttribute('aria-label', 'Filename to copy');
        download.onclick = async () => {
            const timestamp = new Date().toISOString().replace(/[-:]/g, '');
            const filename = `vignelli-review-${timestamp}.txt`;
            const file = new Blob([report.value], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            filenameField.hidden = true;
            try {
                await navigator.clipboard.writeText(filename);
            }
            catch {
                filenameField.value = filename;
                filenameField.hidden = false;
                filenameField.focus();
                filenameField.select();
                if (!document.execCommand('copy'))
                    return;
                filenameField.hidden = true;
            }
            download.textContent = 'Download again (filename copied)';
        };
        {
            finishDialog.setAttribute('aria-label', 'Finish review');
            const prompt = document.createElement('p');
            prompt.textContent = 'Finish this review and remove its annotations?';
            const confirm = document.createElement('button');
            confirm.textContent = 'Finish review';
            confirm.type = 'button';
            confirm.onclick = () => {
                listeners.abort();
                for (const annotation of reviews.values())
                    annotation.remove();
                reviews.clear();
                overlay.remove();
                finishDialog.close();
                finishDialog.remove();
                delete state.vignelliReview;
            };
            const cancel = document.createElement('button');
            cancel.textContent = 'Continue review';
            cancel.type = 'button';
            cancel.onclick = () => {
                finishDialog.close();
                overlay.hidden = false;
            };
            finishDialog.append(prompt, report, copy, download, filenameField, cancel, confirm);
            document.body.append(finishDialog);
        }
        state.vignelliReview = {
            requestFinish() {
                if (finishDialog.open)
                    return;
                overlay.hidden = true;
                const comments = Array.from(reviews.keys(), ({ path, elementDetails, x, y, text }, i) => [
                    `${i + 1}. Position (viewport CSS px): (${x}, ${y})`,
                    `XPath of element being pointed to: ${path}`,
                    elementDetails,
                    `Reviewer's comment: ${text}`
                ].filter(Boolean).join('\n'));
                report.value = [
                    `The rendered page: ${document.URL} was reviewed by pointing the mouse at specific positions and making a comment at each position. The comments are:`,
                    comments.join('\n\n') || 'No comments.',
                    'Rendered DOM',
                    describeDOM()
                ].join('\n\n');
                copy.textContent = 'Copy report';
                download.textContent = 'Download report and copy filename';
                filenameField.hidden = true;
                finishDialog.showModal();
                report.scrollTop = 0;
            }
        };
    }
})();
