/**
 * HistoryManager — Undo/Redo com stack de estados JSON
 * Baseado na arquitetura do vue-fabric-editor
 */
class HistoryManager {
    constructor(canvas, maxStack = 50) {
        this.canvas = canvas;
        this.maxStack = maxStack;
        this.undoStack = [];
        this.redoStack = [];
        this.isProcessing = false;
        this.lastState = null;
    }

    saveState() {
        if (this.isProcessing) return;
        const json = this.canvas.toJSON(['name', 'selectable', 'evented', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'visible']);
        // Evita duplicatas consecutivas
        if (this.lastState && JSON.stringify(this.lastState) === JSON.stringify(json)) return;

        this.undoStack.push(json);
        if (this.undoStack.length > this.maxStack) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.lastState = json;
        this.updateUI();
    }

    undo() {
        if (this.undoStack.length <= 1) {
            window.toast && window.toast.show('Nada para desfazer', 'error');
            return;
        }
        this.isProcessing = true;
        const current = this.undoStack.pop();
        this.redoStack.push(current);
        const previous = this.undoStack[this.undoStack.length - 1];

        this.canvas.loadFromJSON(previous, () => {
            this.canvas.renderAll();
            this.canvas.fire('history:undo');
            this.isProcessing = false;
            this.updateUI();
            window.updateLayers && window.updateLayers();
            window.updateProps && window.updateProps();
        });
    }

    redo() {
        if (this.redoStack.length === 0) {
            window.toast && window.toast.show('Nada para refazer', 'error');
            return;
        }
        this.isProcessing = true;
        const next = this.redoStack.pop();
        this.undoStack.push(next);

        this.canvas.loadFromJSON(next, () => {
            this.canvas.renderAll();
            this.canvas.fire('history:redo');
            this.isProcessing = false;
            this.updateUI();
            window.updateLayers && window.updateLayers();
            window.updateProps && window.updateProps();
        });
    }

    updateUI() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        if (undoBtn) undoBtn.disabled = this.undoStack.length <= 1;
        if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.lastState = null;
        this.updateUI();
    }
}
