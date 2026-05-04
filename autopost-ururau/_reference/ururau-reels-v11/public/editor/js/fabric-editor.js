/**
 * FabricEditor — Motor do canvas Fabric.js
 * Inicializa canvas 1080x1920, carrega template-base.png
 */
class FabricEditor {
    constructor(canvasId, containerId) {
        this.canvasId = canvasId;
        this.containerId = containerId;
        this.width = 1080;
        this.height = 1920;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 3;
        this.isPanning = false;
        this.lastPosX = 0;
        this.lastPosY = 0;
        this.canvas = null;
    }

    async init() {
        const container = document.getElementById(this.containerId);
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;

        // Calcula zoom inicial para caber na tela com padding
        const scaleX = (containerW - 80) / this.width;
        const scaleY = (containerH - 80) / this.height;
        this.zoom = Math.min(scaleX, scaleY, 1);

        this.canvas = new fabric.Canvas(this.canvasId, {
            width: this.width,
            height: this.height,
            backgroundColor: '#000000',
            preserveObjectStacking: true,
            stopContextMenu: true,
            fireRightClick: true,
            selectionKey: 'shiftKey',
            uniScaleTransform: false,
            centeredScaling: true,
            centeredRotation: true,
            snapAngle: 5,
            rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315]
        });

        // Configura controles visuais
        fabric.Object.prototype.set({
            borderColor: '#ff3333',
            cornerColor: '#ff3333',
            cornerStrokeColor: '#ffffff',
            cornerSize: 12,
            cornerStyle: 'circle',
            transparentCorners: false,
            padding: 4,
            selectionBackgroundColor: 'rgba(255,51,51,0.1)',
            selectionBorderColor: '#ff3333',
            selectionLineWidth: 1,
            rotatingPointOffset: 30
        });

        fabric.Textbox.prototype.set({
            borderColor: '#ff3333',
            cornerColor: '#ff3333',
            cornerStrokeColor: '#ffffff',
            cornerSize: 12,
            cornerStyle: 'circle',
            transparentCorners: false,
            padding: 4
        });

        // Carrega template base
        await this.loadTemplateBase();

        // Configura zoom e pan
        this.setupZoomPan();

        // Eventos de seleção
        this.canvas.on('selection:created', () => this.onSelectionChange());
        this.canvas.on('selection:updated', () => this.onSelectionChange());
        this.canvas.on('selection:cleared', () => this.onSelectionCleared());

        // Eventos de modificação para history
        this.canvas.on('object:modified', () => {
            if (window.historyManager && !window.historyManager.isProcessing) {
                window.historyManager.saveState();
            }
        });
        this.canvas.on('object:added', () => {
            if (window.historyManager && !window.historyManager.isProcessing) {
                window.historyManager.saveState();
            }
            window.updateLayers && window.updateLayers();
        });
        this.canvas.on('object:removed', () => {
            if (window.historyManager && !window.historyManager.isProcessing) {
                window.historyManager.saveState();
            }
            window.updateLayers && window.updateLayers();
        });

        this.applyZoom();
        return this.canvas;
    }

    loadTemplateBase() {
        return new Promise((resolve) => {
            fabric.Image.fromURL('/assets/template-base.png', (img) => {
                img.set({
                    left: 0,
                    top: 0,
                    selectable: false,
                    evented: false,
                    name: 'template-base',
                    lockMovementX: true,
                    lockMovementY: true,
                    lockScalingX: true,
                    lockScalingY: true,
                    lockRotation: true,
                    hasControls: false,
                    hasBorders: false,
                    hoverCursor: 'default'
                });
                this.canvas.add(img);
                this.canvas.sendToBack(img);
                this.canvas.renderAll();
                resolve();
            }, { crossOrigin: 'anonymous' });
        });
    }

    setupZoomPan() {
        const wrapper = document.getElementById(this.containerId);

        // Mouse wheel zoom
        wrapper.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoomCanvas(delta, e.clientX, e.clientY);
            }
        }, { passive: false });

        // Pan com middle mouse ou space+drag
        wrapper.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.altKey)) {
                this.isPanning = true;
                this.lastPosX = e.clientX;
                this.lastPosY = e.clientY;
                wrapper.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            const dx = e.clientX - this.lastPosX;
            const dy = e.clientY - this.lastPosY;
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;

            const vpt = this.canvas.viewportTransform;
            vpt[4] += dx;
            vpt[5] += dy;
            this.canvas.setViewportTransform(vpt);
            this.canvas.renderAll();
        });

        window.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                wrapper.style.cursor = 'default';
            }
        });
    }

    zoomCanvas(factor, x, y) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        if (newZoom === this.zoom) return;

        const point = new fabric.Point(x || this.canvas.width / 2, y || this.canvas.height / 2);
        this.canvas.zoomToPoint(point, newZoom);
        this.zoom = newZoom;
        this.updateZoomInfo();
    }

    setZoom(value) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
        this.canvas.setZoom(this.zoom);
        this.canvas.renderAll();
        this.updateZoomInfo();
    }

    resetZoom() {
        const container = document.getElementById(this.containerId);
        const scaleX = (container.clientWidth - 80) / this.width;
        const scaleY = (container.clientHeight - 80) / this.height;
        this.zoom = Math.min(scaleX, scaleY, 1);
        this.canvas.setViewportTransform([this.zoom, 0, 0, this.zoom, 0, 0]);
        this.canvas.renderAll();
        this.updateZoomInfo();
    }

    zoomIn() {
        this.zoomCanvas(1.2);
    }

    zoomOut() {
        this.zoomCanvas(0.8);
    }

    updateZoomInfo() {
        const el = document.getElementById('canvas-zoom');
        if (el) el.textContent = `Zoom: ${Math.round(this.zoom * 100)}%`;
    }

    applyZoom() {
        this.canvas.setZoom(this.zoom);
        this.updateZoomInfo();
    }

    onSelectionChange() {
        const active = this.canvas.getActiveObject();
        const count = this.canvas.getActiveObjects().length;
        const info = document.getElementById('selected-info');
        if (info) {
            if (count > 1) {
                info.textContent = `${count} objetos selecionados`;
            } else if (active) {
                const name = active.name || active.type;
                info.textContent = `Selecionado: ${name}`;
            }
        }
        window.updateProps && window.updateProps();
        window.updateLayers && window.updateLayers();
    }

    onSelectionCleared() {
        const info = document.getElementById('selected-info');
        if (info) info.textContent = 'Nada selecionado';
        window.updateProps && window.updateProps();
        window.updateLayers && window.updateLayers();
    }

    // Factory methods
    addText(text = 'Novo Texto') {
        const t = new fabric.Textbox(text, {
            left: this.width / 2,
            top: this.height / 2,
            width: 400,
            fontSize: 60,
            fontFamily: 'Aileron, Arial, sans-serif',
            fontWeight: 'bold',
            fill: '#ffffff',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            name: `text-${Date.now()}`,
            selectable: true,
            evented: true
        });
        this.canvas.add(t);
        this.canvas.setActiveObject(t);
        this.canvas.renderAll();
        window.historyManager && window.historyManager.saveState();
        window.updateLayers && window.updateLayers();
        window.updateProps && window.updateProps();
        return t;
    }

    addRect() {
        const r = new fabric.Rect({
            left: this.width / 2,
            top: this.height / 2,
            width: 200,
            height: 200,
            fill: 'rgba(255,51,51,0.6)',
            stroke: '#ff3333',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            name: `rect-${Date.now()}`,
            rx: 8,
            ry: 8
        });
        this.canvas.add(r);
        this.canvas.setActiveObject(r);
        this.canvas.renderAll();
        window.historyManager && window.historyManager.saveState();
        window.updateLayers && window.updateLayers();
        window.updateProps && window.updateProps();
        return r;
    }

    addCircle() {
        const c = new fabric.Circle({
            left: this.width / 2,
            top: this.height / 2,
            radius: 100,
            fill: 'rgba(255,51,51,0.6)',
            stroke: '#ff3333',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            name: `circle-${Date.now()}`
        });
        this.canvas.add(c);
        this.canvas.setActiveObject(c);
        this.canvas.renderAll();
        window.historyManager && window.historyManager.saveState();
        window.updateLayers && window.updateLayers();
        window.updateProps && window.updateProps();
        return c;
    }

    addImage(src) {
        fabric.Image.fromURL(src, (img) => {
            const scale = Math.min(400 / img.width, 400 / img.height, 1);
            img.set({
                left: this.width / 2,
                top: this.height / 2,
                scaleX: scale,
                scaleY: scale,
                originX: 'center',
                originY: 'center',
                name: `image-${Date.now()}`,
                selectable: true,
                evented: true
            });
            this.canvas.add(img);
            this.canvas.setActiveObject(img);
            this.canvas.renderAll();
            window.historyManager && window.historyManager.saveState();
            window.updateLayers && window.updateLayers();
            window.updateProps && window.updateProps();
        }, { crossOrigin: 'anonymous' });
    }

    addImageFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => this.addImage(e.target.result);
        reader.readAsDataURL(file);
    }
}
