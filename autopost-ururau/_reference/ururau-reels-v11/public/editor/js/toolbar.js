/**
 * Toolbar — Botões e ações da toolbar
 */
class Toolbar {
    constructor(canvas, history, templates, fabricEditor) {
        this.canvas = canvas;
        this.history = history;
        this.templates = templates;
        this.fabricEditor = fabricEditor;
        this.fileInput = null;
        this.init();
    }

    init() {
        // Cria input de arquivo escondido para imagens
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'image/*';
        this.fileInput.style.display = 'none';
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.fabricEditor.addImageFromFile(e.target.files[0]);
            }
        });
        document.body.appendChild(this.fileInput);

        // Bind botões
        document.getElementById('btn-add-text').addEventListener('click', () => this.addText());
        document.getElementById('btn-add-image').addEventListener('click', () => this.fileInput.click());
        document.getElementById('btn-add-rect').addEventListener('click', () => this.fabricEditor.addRect());
        document.getElementById('btn-add-circle').addEventListener('click', () => this.fabricEditor.addCircle());
        document.getElementById('btn-delete').addEventListener('click', () => this.deleteSelection());
        document.getElementById('btn-duplicate').addEventListener('click', () => this.duplicateSelection());
        document.getElementById('btn-undo').addEventListener('click', () => this.history.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.history.redo());
        document.getElementById('btn-bring-forward').addEventListener('click', () => this.bringForward());
        document.getElementById('btn-send-backward').addEventListener('click', () => this.sendBackward());
        document.getElementById('btn-group').addEventListener('click', () => this.groupSelection());
        document.getElementById('btn-ungroup').addEventListener('click', () => this.ungroupSelection());
        document.getElementById('btn-zoom-in').addEventListener('click', () => this.fabricEditor.zoomIn());
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.fabricEditor.zoomOut());
        document.getElementById('btn-zoom-reset').addEventListener('click', () => this.fabricEditor.resetZoom());
        document.getElementById('btn-save').addEventListener('click', () => this.showSaveModal());
        document.getElementById('btn-load').addEventListener('click', () => this.showLoadModal());
        document.getElementById('btn-preview').addEventListener('click', () => this.generatePreview());

        // Modais
        document.getElementById('modal-save-cancel').addEventListener('click', () => this.hideSaveModal());
        document.getElementById('modal-save-confirm').addEventListener('click', () => this.confirmSave());
        document.getElementById('modal-load-cancel').addEventListener('click', () => this.hideLoadModal());
        document.getElementById('modal-preview-close').addEventListener('click', () => this.hidePreviewModal());

        // Enter no input de save
        document.getElementById('save-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmSave();
        });
    }

    addText() {
        this.fabricEditor.addText('Título da Notícia');
    }

    deleteSelection() {
        const objs = this.canvas.getActiveObjects();
        if (objs.length === 0) {
            window.toast.show('Nenhum objeto selecionado', 'error');
            return;
        }
        objs.forEach(obj => this.canvas.remove(obj));
        this.canvas.discardActiveObject();
        this.canvas.renderAll();
        this.history.saveState();
        window.updateLayers && window.updateLayers();
        window.updateProps && window.updateProps();
    }

    duplicateSelection() {
        const objs = this.canvas.getActiveObjects();
        if (objs.length === 0) {
            window.toast.show('Nenhum objeto selecionado', 'error');
            return;
        }

        const newObjs = [];
        objs.forEach(obj => {
            obj.clone((clone) => {
                clone.set({
                    left: obj.left + 20,
                    top: obj.top + 20,
                    name: `${obj.name || obj.type}-copy`,
                    evented: true,
                    selectable: true
                });
                this.canvas.add(clone);
                newObjs.push(clone);
            });
        });

        if (newObjs.length > 0) {
            if (newObjs.length === 1) {
                this.canvas.setActiveObject(newObjs[0]);
            } else {
                const sel = new fabric.ActiveSelection(newObjs, { canvas: this.canvas });
                this.canvas.setActiveObject(sel);
            }
            this.canvas.renderAll();
            this.history.saveState();
            window.updateLayers && window.updateLayers();
            window.updateProps && window.updateProps();
        }
    }

    bringForward() {
        const objs = this.canvas.getActiveObjects();
        objs.forEach(obj => this.canvas.bringForward(obj));
        this.canvas.renderAll();
        this.history.saveState();
        window.updateLayers && window.updateLayers();
    }

    sendBackward() {
        const objs = this.canvas.getActiveObjects();
        objs.forEach(obj => this.canvas.sendBackwards(obj));
        this.canvas.renderAll();
        this.history.saveState();
        window.updateLayers && window.updateLayers();
    }

    bringToFront() {
        const objs = this.canvas.getActiveObjects();
        objs.forEach(obj => this.canvas.bringToFront(obj));
        this.canvas.renderAll();
        this.history.saveState();
        window.updateLayers && window.updateLayers();
    }

    sendToBack() {
        const objs = this.canvas.getActiveObjects();
        objs.forEach(obj => {
            this.canvas.sendToBack(obj);
            // Mantém template-base no fundo absoluto
            const base = this.canvas.getObjects().find(o => o.name === 'template-base');
            if (base) this.canvas.sendToBack(base);
        });
        this.canvas.renderAll();
        this.history.saveState();
        window.updateLayers && window.updateLayers();
    }

    groupSelection() {
        const objs = this.canvas.getActiveObjects();
        if (objs.length < 2) {
            window.toast.show('Selecione 2+ objetos para agrupar', 'error');
            return;
        }

        const group = new fabric.Group(objs, {
            canvas: this.canvas,
            name: `group-${Date.now()}`
        });

        objs.forEach(obj => this.canvas.remove(obj));
        this.canvas.add(group);
        this.canvas.setActiveObject(group);
        this.canvas.renderAll();
        this.history.saveState();
        window.updateLayers && window.updateLayers();
        window.updateProps && window.updateProps();
        window.toast.show('Objetos agrupados', 'success');
    }

    ungroupSelection() {
        const active = this.canvas.getActiveObject();
        if (!active || active.type !== 'group') {
            window.toast.show('Selecione um grupo para desagrupar', 'error');
            return;
        }

        const items = active._objects;
        active._restoreObjectsState();
        this.canvas.remove(active);

        items.forEach(item => {
            item.set({
                evented: true,
                selectable: true
            });
            this.canvas.add(item);
        });

        const sel = new fabric.ActiveSelection(items, { canvas: this.canvas });
        this.canvas.setActiveObject(sel);
        this.canvas.renderAll();
        this.history.saveState();
        window.updateLayers && window.updateLayers();
        window.updateProps && window.updateProps();
        window.toast.show('Grupo desfeito', 'success');
    }

    toggleLock() {
        const objs = this.canvas.getActiveObjects();
        objs.forEach(obj => {
            const isLocked = obj.lockMovementX && obj.lockMovementY;
            obj.set({
                lockMovementX: !isLocked,
                lockMovementY: !isLocked,
                lockScalingX: !isLocked,
                lockScalingY: !isLocked,
                lockRotation: !isLocked,
                selectable: isLocked,
                evented: isLocked
            });
        });
        this.canvas.discardActiveObject();
        this.canvas.renderAll();
        this.history.saveState();
        window.updateLayers && window.updateLayers();
        window.updateProps && window.updateProps();
    }

    toggleHide() {
        const objs = this.canvas.getActiveObjects();
        objs.forEach(obj => {
            obj.visible = !obj.visible;
        });
        this.canvas.discardActiveObject();
        this.canvas.renderAll();
        this.history.saveState();
        window.updateLayers && window.updateLayers();
        window.updateProps && window.updateProps();
    }

    // === MODAIS ===
    showSaveModal() {
        document.getElementById('modal-save').classList.remove('hidden');
        document.getElementById('save-name').value = '';
        document.getElementById('save-name').focus();
    }

    hideSaveModal() {
        document.getElementById('modal-save').classList.add('hidden');
    }

    async confirmSave() {
        const name = document.getElementById('save-name').value.trim();
        if (!name) {
            window.toast.show('Digite um nome para o template', 'error');
            return;
        }
        await this.templates.save(name);
        this.hideSaveModal();
    }

    async showLoadModal() {
        const list = await this.templates.list();
        const container = document.getElementById('templates-list');

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum template salvo</div>';
        } else {
            container.innerHTML = list.map(t => `
                <div class="template-card" onclick="window.toolbar.loadTemplate('${t.name}')">
                    <div class="template-name">${t.name}</div>
                    <div class="template-date">${new Date(t.date).toLocaleDateString('pt-BR')}</div>
                </div>
            `).join('');
        }

        document.getElementById('modal-load').classList.remove('hidden');
    }

    hideLoadModal() {
        document.getElementById('modal-load').classList.add('hidden');
    }

    async loadTemplate(name) {
        this.hideLoadModal();
        await this.templates.load(name);
    }

    async generatePreview() {
        window.toast.show('Gerando preview...', 'success');
        const url = await this.templates.render();
        if (url) {
            const img = document.getElementById('preview-img');
            img.src = url + '?t=' + Date.now();
            document.getElementById('modal-preview').classList.remove('hidden');
        }
    }

    hidePreviewModal() {
        document.getElementById('modal-preview').classList.add('hidden');
    }
}
