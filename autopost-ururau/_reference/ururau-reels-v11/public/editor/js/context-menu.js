/**
 * ContextMenu — Menu de contexto (right-click)
 */
class ContextMenu {
    constructor(canvas, history, toolbar) {
        this.canvas = canvas;
        this.history = history;
        this.toolbar = toolbar;
        this.menu = document.getElementById('context-menu');
        this.init();
    }

    init() {
        this.canvas.wrapperEl.addEventListener('contextmenu', (e) => this.show(e));
        document.addEventListener('click', () => this.hide());

        this.menu.querySelectorAll('[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.execute(action);
            });
        });
    }

    show(e) {
        e.preventDefault();
        const active = this.canvas.getActiveObject();
        const hasSelection = active || this.canvas.getActiveObjects().length > 0;

        this.menu.querySelectorAll('[data-action]').forEach(item => {
            const action = item.dataset.action;
            if (['duplicate', 'bring-to-front', 'send-to-back', 'lock', 'hide', 'delete'].includes(action)) {
                item.style.display = hasSelection ? 'flex' : 'none';
            }
        });

        const x = Math.min(e.clientX, window.innerWidth - 200);
        const y = Math.min(e.clientY, window.innerHeight - 250);
        this.menu.style.left = x + 'px';
        this.menu.style.top = y + 'px';
        this.menu.classList.remove('hidden');
    }

    hide() {
        this.menu.classList.add('hidden');
    }

    execute(action) {
        switch(action) {
            case 'duplicate':
                this.toolbar.duplicateSelection();
                break;
            case 'bring-to-front':
                this.toolbar.bringToFront();
                break;
            case 'send-to-back':
                this.toolbar.sendToBack();
                break;
            case 'lock':
                this.toolbar.toggleLock();
                break;
            case 'hide':
                this.toolbar.toggleHide();
                break;
            case 'delete':
                this.toolbar.deleteSelection();
                break;
        }
        this.hide();
    }
}
