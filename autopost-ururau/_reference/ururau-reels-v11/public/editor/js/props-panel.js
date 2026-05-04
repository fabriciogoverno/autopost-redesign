/**
 * PropsPanel — Painel de propriedades do objeto selecionado
 */
class PropsPanel {
    constructor(canvas) {
        this.canvas = canvas;
        this.panel = document.getElementById('props-content');
        this.isUpdating = false;
        this.init();
    }

    init() {
        window.updateProps = () => this.render();
        this.render();
    }

    render() {
        const active = this.canvas.getActiveObject();
        const activeGroup = this.canvas.getActiveObjects();

        if (!active || activeGroup.length === 0) {
            this.panel.innerHTML = '<div class="empty-state">Selecione um objeto para editar</div>';
            return;
        }

        // Se múltiplos selecionados, mostra apenas propriedades comuns
        const isMulti = activeGroup.length > 1;
        const obj = active;

        let html = '';

        // === TRANSFORM ===
        html += `<div class="prop-group">
            <div class="prop-group-title">Posição & Tamanho</div>
            <div class="prop-row">
                <div class="prop-field">
                    <label>X</label>
                    <input type="number" id="prop-x" value="${this.round(obj.left)}" step="1" ${isMulti ? 'disabled' : ''}>
                </div>
                <div class="prop-field">
                    <label>Y</label>
                    <input type="number" id="prop-y" value="${this.round(obj.top)}" step="1" ${isMulti ? 'disabled' : ''}>
                </div>
            </div>
            <div class="prop-row">
                <div class="prop-field">
                    <label>Largura</label>
                    <input type="number" id="prop-width" value="${this.round(obj.width * obj.scaleX)}" step="1" ${isMulti ? 'disabled' : ''}>
                </div>
                <div class="prop-field">
                    <label>Altura</label>
                    <input type="number" id="prop-height" value="${this.round(obj.height * obj.scaleY)}" step="1" ${isMulti ? 'disabled' : ''}>
                </div>
            </div>
            <div class="prop-row">
                <div class="prop-field">
                    <label>Rotação</label>
                    <input type="number" id="prop-angle" value="${this.round(obj.angle)}" step="1">
                </div>
                <div class="prop-field">
                    <label>Opacidade</label>
                    <input type="range" id="prop-opacity" min="0" max="1" step="0.01" value="${obj.opacity}">
                    <div class="range-value">${Math.round(obj.opacity * 100)}%</div>
                </div>
            </div>
        </div>`;

        // === APPEARANCE ===
        html += `<div class="prop-group">
            <div class="prop-group-title">Aparência</div>`;

        if (obj.fill !== undefined && !isMulti) {
            html += `<div class="prop-row">
                <div class="prop-field">
                    <label>Cor de Preenchimento</label>
                    <input type="color" id="prop-fill" value="${this.colorToHex(obj.fill)}">
                </div>
                <div class="prop-field">
                    <label>Cor do Traço</label>
                    <input type="color" id="prop-stroke" value="${this.colorToHex(obj.stroke)}">
                </div>
            </div>
            <div class="prop-row">
                <div class="prop-field">
                    <label>Espessura do Traço</label>
                    <input type="number" id="prop-stroke-width" value="${obj.strokeWidth || 0}" step="1" min="0">
                </div>
            </div>`;
        }

        // Shadow
        html += `<div class="prop-row">
            <div class="prop-field">
                <label>Sombra (blur)</label>
                <input type="number" id="prop-shadow-blur" value="${obj.shadow ? obj.shadow.blur : 0}" step="1" min="0">
            </div>
            <div class="prop-field">
                <label>Cor da Sombra</label>
                <input type="color" id="prop-shadow-color" value="${obj.shadow ? this.colorToHex(obj.shadow.color) : '#000000'}">
            </div>
        </div>
        <div class="prop-row">
            <div class="prop-field">
                <label>Sombra X</label>
                <input type="number" id="prop-shadow-x" value="${obj.shadow ? obj.shadow.offsetX : 0}" step="1">
            </div>
            <div class="prop-field">
                <label>Sombra Y</label>
                <input type="number" id="prop-shadow-y" value="${obj.shadow ? obj.shadow.offsetY : 0}" step="1">
            </div>
        </div>`;

        html += `</div>`;

        // === TEXT ===
        if ((obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') && !isMulti) {
            html += `<div class="prop-group">
                <div class="prop-group-title">Texto</div>
                <div class="prop-field">
                    <label>Conteúdo</label>
                    <textarea id="prop-text" rows="3">${obj.text || ''}</textarea>
                </div>
                <div class="prop-row">
                    <div class="prop-field">
                        <label>Fonte</label>
                        <input type="text" id="prop-font-family" value="${obj.fontFamily || 'Aileron'}" list="font-list">
                        <datalist id="font-list">
                            <option value="Aileron">
                            <option value="Arial">
                            <option value="Helvetica">
                            <option value="Georgia">
                            <option value="Times New Roman">
                            <option value="Courier New">
                            <option value="Verdana">
                            <option value="Impact">
                        </datalist>
                    </div>
                    <div class="prop-field">
                        <label>Tamanho</label>
                        <input type="number" id="prop-font-size" value="${obj.fontSize || 60}" step="1" min="1">
                    </div>
                </div>
                <div class="prop-row">
                    <div class="prop-field">
                        <label>Peso</label>
                        <select id="prop-font-weight">
                            <option value="normal" ${obj.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="bold" ${obj.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
                            <option value="300" ${obj.fontWeight === '300' ? 'selected' : ''}>Light</option>
                            <option value="600" ${obj.fontWeight === '600' ? 'selected' : ''}>Semibold</option>
                            <option value="800" ${obj.fontWeight === '800' ? 'selected' : ''}>Extra Bold</option>
                        </select>
                    </div>
                    <div class="prop-field">
                        <label>Alinhamento</label>
                        <select id="prop-text-align">
                            <option value="left" ${obj.textAlign === 'left' ? 'selected' : ''}>Esquerda</option>
                            <option value="center" ${obj.textAlign === 'center' ? 'selected' : ''}>Centro</option>
                            <option value="right" ${obj.textAlign === 'right' ? 'selected' : ''}>Direita</option>
                            <option value="justify" ${obj.textAlign === 'justify' ? 'selected' : ''}>Justificado</option>
                        </select>
                    </div>
                </div>
                <div class="prop-row">
                    <div class="prop-field">
                        <label>Cor do Texto</label>
                        <input type="color" id="prop-text-color" value="${this.colorToHex(obj.fill)}">
                    </div>
                </div>
            </div>`;
        }

        // === ALIGN ===
        if (!isMulti) {
            html += `<div class="prop-group">
                <div class="prop-group-title">Alinhamento no Canvas</div>
                <div class="prop-row">
                    <button onclick="window.propsPanel.align('left')" style="flex:1">⬅️ Esq</button>
                    <button onclick="window.propsPanel.align('center-h')" style="flex:1">↔️ Centro H</button>
                    <button onclick="window.propsPanel.align('right')" style="flex:1">➡️ Dir</button>
                </div>
                <div class="prop-row">
                    <button onclick="window.propsPanel.align('top')" style="flex:1">⬆️ Topo</button>
                    <button onclick="window.propsPanel.align('center-v')" style="flex:1">↕️ Centro V</button>
                    <button onclick="window.propsPanel.align('bottom')" style="flex:1">⬇️ Base</button>
                </div>
            </div>`;
        }

        this.panel.innerHTML = html;
        this.bindEvents();
    }

    bindEvents() {
        const active = this.canvas.getActiveObject();
        if (!active) return;

        const inputs = this.panel.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Atualiza em tempo real para alguns campos
            if (input.type === 'range' || input.type === 'color') {
                input.addEventListener('input', () => this.applyValue(input.id, input.value));
            }
            // Para number e text, atualiza no change/blur para não floodar history
            else {
                input.addEventListener('change', () => {
                    this.applyValue(input.id, input.value);
                    window.historyManager && window.historyManager.saveState();
                });
            }
        });
    }

    applyValue(propId, value) {
        const active = this.canvas.getActiveObject();
        const activeGroup = this.canvas.getActiveObjects();
        if (!active) return;

        const targets = activeGroup.length > 1 ? activeGroup : [active];

        targets.forEach(obj => {
            switch(propId) {
                case 'prop-x':
                    if (!obj.lockMovementX) obj.set('left', parseFloat(value));
                    break;
                case 'prop-y':
                    if (!obj.lockMovementY) obj.set('top', parseFloat(value));
                    break;
                case 'prop-width':
                    if (obj.type === 'textbox' || obj.type === 'i-text') {
                        obj.set('width', parseFloat(value));
                    } else if (obj.scaleX !== undefined) {
                        obj.set('scaleX', parseFloat(value) / obj.width);
                    }
                    break;
                case 'prop-height':
                    if (obj.scaleY !== undefined) {
                        obj.set('scaleY', parseFloat(value) / obj.height);
                    }
                    break;
                case 'prop-angle':
                    if (!obj.lockRotation) obj.set('angle', parseFloat(value));
                    break;
                case 'prop-opacity':
                    obj.set('opacity', parseFloat(value));
                    break;
                case 'prop-fill':
                    if (obj.type !== 'textbox' && obj.type !== 'i-text' && obj.type !== 'text') {
                        obj.set('fill', value);
                    }
                    break;
                case 'prop-stroke':
                    obj.set('stroke', value);
                    break;
                case 'prop-stroke-width':
                    obj.set('strokeWidth', parseFloat(value));
                    break;
                case 'prop-shadow-blur':
                    this.updateShadow(obj, 'blur', parseFloat(value));
                    break;
                case 'prop-shadow-color':
                    this.updateShadow(obj, 'color', value);
                    break;
                case 'prop-shadow-x':
                    this.updateShadow(obj, 'offsetX', parseFloat(value));
                    break;
                case 'prop-shadow-y':
                    this.updateShadow(obj, 'offsetY', parseFloat(value));
                    break;
                case 'prop-text':
                    if (obj.set) obj.set('text', value);
                    break;
                case 'prop-font-family':
                    obj.set('fontFamily', value);
                    break;
                case 'prop-font-size':
                    obj.set('fontSize', parseFloat(value));
                    break;
                case 'prop-font-weight':
                    obj.set('fontWeight', value);
                    break;
                case 'prop-text-align':
                    obj.set('textAlign', value);
                    break;
                case 'prop-text-color':
                    obj.set('fill', value);
                    break;
            }
            obj.setCoords();
        });

        this.canvas.renderAll();

        // Atualiza info do canvas
        const info = document.getElementById('selected-info');
        if (info && targets.length === 1) {
            info.textContent = `Selecionado: ${active.name || active.type} — X:${Math.round(active.left)} Y:${Math.round(active.top)}`;
        }
    }

    updateShadow(obj, key, value) {
        let shadow = obj.shadow;
        if (!shadow || typeof shadow === 'string') {
            shadow = new fabric.Shadow({
                color: '#000000',
                blur: 0,
                offsetX: 0,
                offsetY: 0
            });
        }
        shadow[key] = value;
        obj.set('shadow', shadow);
    }

    align(direction) {
        const obj = this.canvas.getActiveObject();
        if (!obj) return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;

        switch(direction) {
            case 'left': obj.set('left', obj.width * obj.scaleX / 2); break;
            case 'center-h': obj.set('left', cw / 2); break;
            case 'right': obj.set('left', cw - obj.width * obj.scaleX / 2); break;
            case 'top': obj.set('top', obj.height * obj.scaleY / 2); break;
            case 'center-v': obj.set('top', ch / 2); break;
            case 'bottom': obj.set('top', ch - obj.height * obj.scaleY / 2); break;
        }

        obj.setCoords();
        this.canvas.renderAll();
        window.historyManager && window.historyManager.saveState();
        this.render();
    }

    round(val) {
        return Math.round((val || 0) * 100) / 100;
    }

    colorToHex(color) {
        if (!color || color === 'transparent') return '#000000';
        if (color.startsWith('#')) return color;
        // Converte rgb/rgba para hex (simplificado)
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = color;
        return ctx.fillStyle;
    }
}
