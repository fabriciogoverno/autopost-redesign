/**
 * KeyboardManager — Atalhos de teclado
 */
class KeyboardManager {
    constructor(canvas, history, toolbar) {
        this.canvas = canvas;
        this.history = history;
        this.toolbar = toolbar;
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        // Ignora se estiver digitando em input/textarea
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            if (e.key === 'Escape') {
                e.target.blur();
                this.canvas.discardActiveObject();
                this.canvas.renderAll();
                window.updateProps && window.updateProps();
                window.updateLayers && window.updateLayers();
            }
            return;
        }

        const active = this.canvas.getActiveObject();
        const activeGroup = this.canvas.getActiveObjects();

        // Delete
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (activeGroup.length > 0) {
                activeGroup.forEach(obj => this.canvas.remove(obj));
                this.canvas.discardActiveObject();
                this.canvas.renderAll();
                this.history.saveState();
                window.updateLayers && window.updateLayers();
                window.updateProps && window.updateProps();
            }
            return;
        }

        // Ctrl / Cmd
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.history.redo();
                    } else {
                        this.history.undo();
                    }
                    return;
                case 'y':
                    e.preventDefault();
                    this.history.redo();
                    return;
                case 'd':
                    e.preventDefault();
                    this.toolbar.duplicateSelection();
                    return;
                case 'g':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.toolbar.ungroupSelection();
                    } else {
                        this.toolbar.groupSelection();
                    }
                    return;
                case 'a':
                    e.preventDefault();
                    this.canvas.setActiveObject(new fabric.ActiveSelection(this.canvas.getObjects(), { canvas: this.canvas }));
                    this.canvas.renderAll();
                    window.updateProps && window.updateProps();
                    window.updateLayers && window.updateLayers();
                    return;
                case ']':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.toolbar.bringToFront();
                    } else {
                        this.toolbar.bringForward();
                    }
                    return;
                case '[':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.toolbar.sendToBack();
                    } else {
                        this.toolbar.sendBackward();
                    }
                    return;
            }
        }

        // Escape
        if (e.key === 'Escape') {
            this.canvas.discardActiveObject();
            this.canvas.renderAll();
            window.updateProps && window.updateProps();
            window.updateLayers && window.updateLayers();
            return;
        }

        // Arrow keys (nudge)
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            if (!active) return;
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            let moved = false;

            if (activeGroup.length > 1) {
                activeGroup.forEach(obj => {
                    if (obj.lockMovementX && obj.lockMovementY) return;
                    switch(e.key) {
                        case 'ArrowUp': if (!obj.lockMovementY) { obj.top -= step; moved = true; } break;
                        case 'ArrowDown': if (!obj.lockMovementY) { obj.top += step; moved = true; } break;
                        case 'ArrowLeft': if (!obj.lockMovementX) { obj.left -= step; moved = true; } break;
                        case 'ArrowRight': if (!obj.lockMovementX) { obj.left += step; moved = true; } break;
                    }
                    obj.setCoords();
                });
            } else if (active) {
                if (active.lockMovementX && active.lockMovementY) return;
                switch(e.key) {
                    case 'ArrowUp': if (!active.lockMovementY) { active.top -= step; moved = true; } break;
                    case 'ArrowDown': if (!active.lockMovementY) { active.top += step; moved = true; } break;
                    case 'ArrowLeft': if (!active.lockMovementX) { active.left -= step; moved = true; } break;
                    case 'ArrowRight': if (!active.lockMovementX) { active.left += step; moved = true; } break;
                }
                if (moved) active.setCoords();
            }

            if (moved) {
                this.canvas.renderAll();
                window.updateProps && window.updateProps();
            }
            return;
        }

        // T = Add Text
        if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.toolbar.addText();
            return;
        }
    }

    handleKeyUp(e) {
        // Placeholder para futuras funcionalidades
    }
}
