/**
 * Ururau Editor v8 — Coordenador Principal
 * Inicializa todos os módulos e gerencia o estado global
 */
(async function() {
    // Toast global
    window.toast = {
        el: document.getElementById('toast'),
        timer: null,
        show(msg, type = 'info') {
            this.el.textContent = msg;
            this.el.className = type;
            this.el.classList.remove('hidden');
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                this.el.classList.add('hidden');
            }, 3000);
        }
    };

    // Inicializa Fabric Editor
    const fabricEditor = new FabricEditor('c', 'canvas-container');
    const canvas = await fabricEditor.init();

    // Inicializa History
    const historyManager = new HistoryManager(canvas);
    window.historyManager = historyManager;
    historyManager.saveState(); // Estado inicial

    // Inicializa Templates
    const templateManager = new TemplateManager(canvas, historyManager);

    // Inicializa Toolbar
    const toolbar = new Toolbar(canvas, historyManager, templateManager, fabricEditor);
    window.toolbar = toolbar;

    // Inicializa Layers Panel
    const layersPanel = new LayersPanel(canvas);
    window.layersPanel = layersPanel;

    // Inicializa Props Panel
    const propsPanel = new PropsPanel(canvas);
    window.propsPanel = propsPanel;

    // Inicializa Keyboard
    const keyboardManager = new KeyboardManager(canvas, historyManager, toolbar);

    // Inicializa Context Menu
    const contextMenu = new ContextMenu(canvas, historyManager, toolbar);

    // Expõe canvas globalmente para debug
    window.fabricCanvas = canvas;
    window.fabricEditor = fabricEditor;

    console.log('🎨 Ururau Editor v8 iniciado');
    console.log('Canvas:', canvas.width, 'x', canvas.height);
    console.log('Objetos:', canvas.getObjects().length);
})();
