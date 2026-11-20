(() => {
  const state = window as Window & { vignelliReviewActive?: boolean };
  if (state.vignelliReviewActive) return;

  interface Review {
    element: Element,
    x: number,
    y: number,
    text: string
  }
  const reviews: Review[] = []

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    pointerEvents: 'none', // Crucial: lets elementFromPoint see through the overlay
    border: '2px solid #ff4757',
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    zIndex: '999999',
    transition: 'all 0.05s ease-out'
  });

  const inputBoxes = new WeakSet<Element>();

  function isInputBoxEvent(e: Event) {
    return e.composedPath().some(node => node instanceof Element && inputBoxes.has(node));
  }

  function handleMouseMove(e: MouseEvent) {
    overlay.hidden = isInputBoxEvent(e);
    if (overlay.hidden) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement) return;

    const rect = el.getBoundingClientRect();
    Object.assign(overlay.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
  }

  function createInputBox(
    posX: number,
    posY: number,
    onClose: () => void,
    onInputChange: (value: string) => void,
    onMove: (rect: DOMRect) => void
  ) {
    const box = document.createElement('div');
    inputBoxes.add(box);
    Object.assign(box.style, {
      position: 'fixed', left: `${posX}px`, top: `${posY}px`,
      width: '240px', height: '140px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', padding: '4px',
      border: '1px solid #666', background: 'white', zIndex: '1000001'
    });

    function button(label: string, icon: string) {
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

    function enableDrag(control: HTMLElement, cursor: string, update: (rect: DOMRect, dx: number, dy: number) => void) {
      Object.assign(control.style, { cursor, touchAction: 'none' });
      control.onpointerdown = down => {
        if (down.target !== control || down.button !== 0 || !down.isPrimary) return;
        down.preventDefault();
        const rect = box.getBoundingClientRect();
        control.setPointerCapture(down.pointerId);
        control.onpointermove = event => {
          if (event.pointerId !== down.pointerId) return;
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

  function handleClick(e: MouseEvent) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement) return;

    if (isInputBoxEvent(e) || !document.elementFromPoint(e.clientX, e.clientY)) return;

    e.preventDefault();

    const { clientX: x, clientY: y } = e;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.assign(svg.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '1000000'
    });
    svg.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS(svg.namespaceURI!, 'line');
    line.setAttribute('stroke', '#ff4757');
    line.setAttribute('x1', String(x));
    line.setAttribute('y1', String(y));
    svg.append(line);

    function updateLine(rect: DOMRect) {
      let endX = Math.max(rect.left, Math.min(x, rect.right));
      let endY = Math.max(rect.top, Math.min(y, rect.bottom));
      if (endX === x && endY === y) {
        const nearest = Math.min(x - rect.left, rect.right - x, y - rect.top, rect.bottom - y);
        if (nearest === x - rect.left) endX = rect.left;
        else if (nearest === rect.right - x) endX = rect.right;
        else if (nearest === y - rect.top) endY = rect.top;
        else endY = rect.bottom;
      }
      line.setAttribute('x2', String(endX));
      line.setAttribute('y2', String(endY));
    }

    const review = {
      element: el,
      x,
      y,
      text: ''
    };
    reviews.push(review);
    const box = createInputBox(
      x,
      y,
      () => {
        const i = reviews.indexOf(review)
        reviews.splice(i, i)
        svg.remove()
      },
      (value) => {
        review.text = value
      },
      updateLine
    );
    document.body.append(svg, box);
    updateLine(box.getBoundingClientRect());
  }

  function startReview() {
    document.body.appendChild(overlay);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
  }

  startReview();
  state.vignelliReviewActive = true;
})();
