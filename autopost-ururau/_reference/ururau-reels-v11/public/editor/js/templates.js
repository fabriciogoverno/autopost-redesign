/**
 * TemplateManager — Salvar/Carregar templates via API
 */
class TemplateManager {
    constructor(canvas, history) {
        this.canvas = canvas;
        this.history = history;
        this.API_BASE = '/api/template';
    }

    async save(name) {
        const json = this.canvas.toJSON(['name', 'selectable', 'evented', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'visible']);
        const thumbnail = this.canvas.toDataURL({ format: 'png', quality: 0.5, multiplier: 0.15 });

        try {
            const res = await fetch(`${this.API_BASE}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, json, thumbnail, version: '1.0' })
            });
            const data = await res.json();
            if (data.success) {
                window.toast.show(`Template "${name}" salvo com sucesso!`, 'success');
                return true;
            }
            throw new Error(data.error || 'Erro ao salvar');
        } catch (err) {
            window.toast.show('Erro ao salvar: ' + err.message, 'error');
            return false;
        }
    }

    async load(name) {
        try {
            const res = await fetch(`${this.API_BASE}/load`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Erro ao carregar');

            this.canvas.loadFromJSON(data.json, () => {
                this.canvas.renderAll();
                this.history.clear();
                this.history.saveState();
                window.updateLayers && window.updateLayers();
                window.updateProps && window.updateProps();
                window.toast.show(`Template "${name}" carregado!`, 'success');
            });
            return true;
        } catch (err) {
            window.toast.show('Erro ao carregar: ' + err.message, 'error');
            return false;
        }
    }

    async list() {
        try {
            const res = await fetch(`${this.API_BASE}/list`);
            const data = await res.json();
            return data.templates || [];
        } catch (err) {
            window.toast.show('Erro ao listar templates', 'error');
            return [];
        }
    }

    async render() {
        const json = this.canvas.toJSON(['name', 'selectable', 'evented', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'visible']);

        try {
            const res = await fetch(`${this.API_BASE}/render`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ json })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Erro ao renderizar');
            return data.url;
        } catch (err) {
            window.toast.show('Erro ao renderizar: ' + err.message, 'error');
            return null;
        }
    }
}
