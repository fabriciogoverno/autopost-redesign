#!/usr/bin/env node
/**
 * Vendor Konva: copia konva.min.js de node_modules para public/vendor/.
 *
 * Por que? O editor visual e' carregado dentro de um iframe que aponta
 * para /konva-editor.html (arquivo estatico em /public). Esse HTML nao
 * passa pelo bundler do Next.js, entao nao da pra fazer
 * "import Konva from 'konva'" la dentro. A solucao padrao e' "vendoring":
 * copiar o bundle UMD do pacote npm para /public/vendor/ e referenciar
 * por <script src="/vendor/konva.min.js">.
 *
 * Isso satisfaz o requisito de Konva como dependencia oficial (esta no
 * package.json, sob versionamento) sem depender de CDN.
 */
import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashboardRoot = resolve(__dirname, '..');
const source = resolve(dashboardRoot, 'node_modules/konva/konva.min.js');
const targetDir = resolve(dashboardRoot, 'public/vendor');
const target = resolve(targetDir, 'konva.min.js');

if (!existsSync(source)) {
  console.warn(`[vendor:konva] Aviso: ${source} nao encontrado. Rode "npm install" primeiro.`);
  process.exit(0); // nao falha o build se konva nao foi instalado
}

if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

copyFileSync(source, target);
const sizeKb = Math.round(statSync(target).size / 1024);
console.log(`[vendor:konva] OK: ${target} (${sizeKb} KB)`);
