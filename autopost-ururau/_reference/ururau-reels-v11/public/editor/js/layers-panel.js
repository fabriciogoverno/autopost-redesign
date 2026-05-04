/**
 * LayersPanel — Painel de camadas
 */
class LayersPanel {
    constructor(canvas) {
        this.canvas = canvas;
        this.listEl = document.getElementById('layers-list');
        this.countEl = document.getElementById('layer-count');
        this.init();
    }

    init() {
        this.canvas.on('object:added', () => this.render());
        this.canvas.on('object:removed', () => this.render());
        this.canvas.on('object:modified', () => this.render());
        this.canvas.on('selection:created', () => this.render());
        this.canvas.on('selection:updated', () => this.render());
        this.canvas.on('selection:cleared', () => this.render());

        // Expõe globalmente para outros módulos
        window.updateLayers = () => this.render();
        this.render();
    }

    render() {
        const objects = this.canvas.getObjects().filter(o => o.name !== 'template-base');
        this.countEl.textContent = `${objects.length} objeto${objects.length !== 1 ? 's' : ''}`;

        if (objects.length === 0) {
            this.listEl.innerHTML = '<div class="empty-state">Nenhum objeto no canvas</div>';
            return;
        }

        const activeObjects = this.canvas.getActiveObjects();
        const activeIds = new Set(activeObjects.map(o => o.__id || o));

        // Ordem reversa (topo da pilha primeiro)
        const reversed = [...objects].reverse();

        this.listEl.innerHTML = reversed.map((obj, idx) => {
            const isActive = activeObjects.includes(obj);
            const isLocked = obj.lockMovementX && obj.lockMovementY;
            const isHidden = !obj.visible;
            const typeIcon = this.getTypeIcon(obj);
            const name = obj.name || `${obj.type}-${idx}`;

            return `
                <div class="layer-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isHidden ? 'hidden-layer' : ''}" 
                     data-obj-index="${objects.indexOf(obj)}"
                     onclick="window.layersPanel.selectObject(${objects.indexOf(obj)})">
                    <div class="layer-icon">${typeIcon}</div>
                    <div class="layer-name" ondblclick="window.layersPanel.renameObject(event, ${objects.indexOf(obj)})">${this.escapeHtml(name)}</div>
                    <div class="layer-actions">
                        <button class="${isHidden ? 'active' : ''}" title="${isHidden ? 'Mostrar' : 'Ocultar'}"
                                onclick="event.stopPropagation(); window.layersPanel.toggleVisibility(${objects.indexOf(obj)})">
                            ${isHidden ? '🙈' : '👁️'}
                        </button>
                        <button class="${isLocked ? 'active' : ''}" title="${isLocked ? 'Desbloquear' : 'Bloquear'}"
                                onclick="event.stopPropagation(); window.layersPanel.toggleLock(${objects.indexOf(obj)})">
                            ${isLocked ? '🔓' : '🔒'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTypeIcon(obj) {
        if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') return 'T';
        if (obj.type === 'image') return '🖼️';
        if (obj.type === 'rect') return '▭';
        if (obj.type === 'circle') return '●';
        if (obj.type === 'group') return '⊞';
        if (obj.type === 'path') return '✎';
        return '◇';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    selectObject(index) {
        const objects = this.canvas.getObjects().filter(o => o.name !== 'template-base');
        const obj = objects[index];
        if (!obj) return;

        if (obj.visible === false) return; // Não seleciona objetos ocultos

        this.canvas.setActiveObject(obj);
        this.canvas.renderAll();
        window.updateProps && window.updateProps();
    }

    renameObject(e, index) {
        e.stopPropagation();
        const objects = this.canvas.getObjects().filter(o => o.name !== 'template-base');
        const obj = objects[index];
        if (!obj) return;

        const newName = prompt('Nome da camada:', obj.name || obj.type);
        if (newName !== null && newName.trim() !== '') {
            obj.name = newName.trim();
            this.render();
            window.historyManager && window.historyManager.saveState();
        }
    }

    toggleVisibility(index) {
        const objects = this.canvas.getObjects().filter(o => o.name !== 'template-base');
        const obj = objects[index];
        if (!obj) return;
        obj.visible = !obj.visible;
        this.canvas.renderAll();
        this.render();
        window.historyManager && window.historyManager.saveState();
    }

    toggleLock(index) {
        const objects = this.canvas.getObjects().filter(o => o.name !== 'template-base');
        const obj = objects[index];
        if (!obj) return;

        const isLocked = obj.lockMovementX && obj.lockMovementY;
        obj.set({
            lockMovementX: !isLocked,
            lockMovementY: !isLocked,
            lockScalingX: !isLocked,
            lockScalingY: !isLocked,
            lockRotation: !isLocked,
            selectable: isLocked,
            evented: isLocked,
            hoverCursor: isLocked ? 'default' : 'move'
        });
        this.canvas.renderAll();
        this.render();
        window.historyManager && window.historyManager.saveState();
    }
}
