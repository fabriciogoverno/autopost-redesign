/**
 * src/routes/editor.js
 * Rotas do Editor Visual Ururau Reels v8
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const FabricToSharp = require('../utils/fabric-to-sharp');

const router = express.Router();
const DB_PATH = path.join(process.cwd(), 'database', 'templates.json');
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'reels');

// Garante diretórios existem
async function ensureDirs() {
    try {
        await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (e) { /* ignora */ }
}
ensureDirs();

// GET /editor — Serve o editor visual
router.get('/editor', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'editor', 'index.html'));
});

// POST /api/template/save
router.post('/api/template/save', async (req, res) => {
    try {
        const { name, json, thumbnail, version = '1.0' } = req.body;
        if (!name || !json) {
            return res.status(400).json({ success: false, error: 'Nome e JSON são obrigatórios' });
        }

        let db = { templates: [] };
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            db = JSON.parse(data);
        } catch (e) {
            // Arquivo não existe ou corrompido — cria novo
        }

        // Remove duplicata pelo nome
        db.templates = db.templates.filter(t => t.name !== name);

        db.templates.push({
            name,
            version,
            json,
            thumbnail: thumbnail || null,
            date: new Date().toISOString()
        });

        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
        res.json({ success: true, message: 'Template salvo' });
    } catch (err) {
        console.error('Erro ao salvar template:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/template/load
router.post('/api/template/load', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
        }

        let db = { templates: [] };
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            db = JSON.parse(data);
        } catch (e) {
            return res.status(404).json({ success: false, error: 'Nenhum template salvo' });
        }

        const template = db.templates.find(t => t.name === name);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Template não encontrado' });
        }

        res.json({ success: true, json: template.json, name: template.name, date: template.date });
    } catch (err) {
        console.error('Erro ao carregar template:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/template/list
router.get('/api/template/list', async (req, res) => {
    try {
        let db = { templates: [] };
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            db = JSON.parse(data);
        } catch (e) {
            // Sem templates ainda
        }

        const list = db.templates.map(t => ({
            name: t.name,
            date: t.date,
            version: t.version
        }));

        res.json({ success: true, templates: list });
    } catch (err) {
        console.error('Erro ao listar templates:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/template/render
router.post('/api/template/render', async (req, res) => {
    try {
        const { json } = req.body;
        if (!json) {
            return res.status(400).json({ success: false, error: 'JSON do canvas é obrigatório' });
        }

        const filename = `preview-${Date.now()}.png`;
        const outputPath = path.join(OUTPUT_DIR, filename);

        const renderer = new FabricToSharp({
            width: 1080,
            height: 1920,
            templateBase: path.join(process.cwd(), 'public', 'assets', 'template-base.png')
        });

        await renderer.render(json, outputPath);

        const relativeUrl = `/output/reels/${filename}`;
        res.json({ success: true, url: relativeUrl, path: outputPath });
    } catch (err) {
        console.error('Erro ao renderizar:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/template/delete
router.post('/api/template/delete', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
        }

        let db = { templates: [] };
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            db = JSON.parse(data);
        } catch (e) {
            return res.status(404).json({ success: false, error: 'Nenhum template salvo' });
        }

        const before = db.templates.length;
        db.templates = db.templates.filter(t => t.name !== name);

        if (db.templates.length === before) {
            return res.status(404).json({ success: false, error: 'Template não encontrado' });
        }

        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
        res.json({ success: true, message: 'Template removido' });
    } catch (err) {
        console.error('Erro ao deletar template:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
