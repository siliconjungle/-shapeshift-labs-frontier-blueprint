import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  compileBlueprintCatalog,
  compileBlueprintOverridePatch,
  compileBlueprintProjection,
  createBlueprintCatalog,
  createBlueprintProof,
  createBlueprintRegistryGraph,
  decodeBlueprintJsonl,
  encodeBlueprintJsonl,
  materializeBlueprintInstance,
  validateBlueprintCatalog
} from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');
const repoRoot = path.basename(path.dirname(packageDir)) === 'packages'
  ? path.resolve(packageDir, '..', '..')
  : packageDir;
const args = parseArgs(process.argv.slice(2));
const instanceCount = readPositiveInt(args.instances, 5000);
const blueprintCount = readPositiveInt(args.blueprints, 64);
const rounds = readPositiveInt(args.rounds, 30);
const outPath = args.out ? path.resolve(repoRoot, args.out) : null;

const input = makeCatalogInput(blueprintCount, instanceCount);
let catalog = createBlueprintCatalog(input);
let compiled = compileBlueprintCatalog(catalog);
let projection = compileBlueprintProjection(compiled, undefined, { targetPath: '/entities' });
let projectionWithMaterializations = compileBlueprintProjection(compiled, undefined, { targetPath: '/entities', includeMaterializations: true });
let materialization = materializeBlueprintInstance(compiled, catalog.instances[0]);
let edit = compileBlueprintOverridePatch(compiled, catalog.instances[0], [[0, ['hp'], 1]], {
  instancePath: '/blueprintInstances/' + catalog.instances[0].id,
  effectivePath: '/entities/' + catalog.instances[0].id
});
let jsonl = encodeBlueprintJsonl([projection, createBlueprintProof(catalog)]);
let cursor = 0;

const rows = [
  measure('create-catalog-' + instanceCount, 4, () => {
    catalog = createBlueprintCatalog(input);
    return catalog.instances.length;
  }),
  measure('compile-catalog-' + instanceCount, 4, () => {
    compiled = compileBlueprintCatalog(catalog);
    return compiled.instancesById.size;
  }),
  measure('validate-catalog', 8, () => validateBlueprintCatalog(catalog).issues.length),
  measure('materialize-instance', 64, () => {
    materialization = materializeBlueprintInstance(compiled, catalog.instances[cursor++ % catalog.instances.length]);
    return Object.keys(materialization.idMap).length + materialization.overridePaths.length;
  }),
  measure('projection-patch-' + instanceCount, 2, () => {
    projection = compileBlueprintProjection(compiled, undefined, { targetPath: '/entities' });
    return projection.patch.length;
  }),
  measure('projection-materializations-' + instanceCount, 2, () => {
    projectionWithMaterializations = compileBlueprintProjection(compiled, undefined, { targetPath: '/entities', includeMaterializations: true });
    return projectionWithMaterializations.materializations.length;
  }),
  measure('override-compile', 64, () => {
    const instance = catalog.instances[cursor++ % catalog.instances.length];
    edit = compileBlueprintOverridePatch(compiled, instance, [[0, ['hp'], cursor % 100]], {
      instancePath: '/blueprintInstances/' + instance.id,
      effectivePath: '/entities/' + instance.id
    });
    return edit.patch.length;
  }),
  measure('registry-graph', 4, () => createBlueprintRegistryGraph(compiled).entries.length),
  measure('jsonl-encode', 16, () => {
    jsonl = encodeBlueprintJsonl([projection, materialization, edit.instance]);
    return jsonl.length;
  }),
  measure('jsonl-decode', 16, () => decodeBlueprintJsonl(jsonl).length),
  measure('proof', 8, () => createBlueprintProof(catalog).hash.length)
];

const report = {
  package: '@shapeshift-labs/frontier-blueprint',
  version: readPackageVersion(),
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform + ' ' + process.arch,
  blueprintCount,
  instanceCount,
  rounds,
  rows
};

if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
}

console.log(report.package + ' package benchmark');
console.log('Node ' + report.node + ' on ' + report.platform + ', blueprints=' + blueprintCount + ', instances=' + instanceCount + ', rounds=' + rounds);
console.log('These are Frontier-only package measurements, not competitor comparisons.');
console.log('');
console.log(padRight('Fixture', 32) + padLeft('Median', 12) + padLeft('p95', 12));
for (const row of rows) {
  console.log(padRight(row.fixture, 32) + padLeft(formatUs(row.medianUs), 12) + padLeft(formatUs(row.p95Us), 12));
}
if (outPath) console.log('\nwrote ' + path.relative(repoRoot, outPath));

function makeCatalogInput(blueprintsTotal, instancesTotal) {
  const blueprints = [];
  const instances = [];
  for (let i = 0; i < blueprintsTotal; i++) {
    blueprints.push({
      id: 'entity.kind-' + i + '.v1',
      template: {
        id: '{{instanceId}}',
        type: 'kind-' + i,
        hp: { $param: 'hp', default: 10 + (i % 20) },
        speed: { $param: 'speed', default: 1 + (i % 5) },
        tags: ['bench', 'kind-' + i],
        loot: { coin: i % 9, rare: 'item-' + i },
        scene: {
          id: '{{id.root}}',
          mode: '2d',
          local: {
            x: { $param: 'x', default: 0 },
            y: { $param: 'y', default: 0 }
          },
          bounds: { minX: 0, minY: 0, maxX: 16, maxY: 16 },
          userData: { entityId: '{{instanceId}}', blueprintId: '{{blueprintId}}' }
        }
      },
      variants: {
        elite: {
          params: { hp: 80 + i },
          overrides: { '/loot/coin': 10 + (i % 7) }
        },
        fast: {
          params: { speed: 8 },
          overrides: { '/tags/1': 'fast' }
        }
      },
      resources: ['sprite:kind-' + i],
      dependencies: ['tileset:group-' + (i % 8)]
    });
  }
  for (let i = 0; i < instancesTotal; i++) {
    instances.push({
      id: 'entity-' + i,
      blueprint: 'entity.kind-' + (i % blueprintsTotal) + '.v1',
      variant: i % 11 === 0 ? 'elite' : i % 7 === 0 ? 'fast' : undefined,
      params: {
        x: i % 1024,
        y: Math.floor(i / 1024),
        hp: 5 + (i % 60)
      },
      overrides: i % 5 === 0 ? { '/loot/coin': i % 20 } : {},
      removals: i % 3 === 0 ? ['/loot/rare'] : [],
      idMap: i % 13 === 0 ? { root: 'scene-node-' + i } : undefined
    });
  }
  return { id: 'bench.blueprints', blueprints, instances, metadata: { token: 'bench-secret' } };
}

function measure(fixture, batchSize, fn) {
  const values = [];
  let sink = 0;
  for (let round = 0; round < rounds; round++) {
    const started = performance.now();
    for (let i = 0; i < batchSize; i++) sink += fn();
    values[values.length] = ((performance.now() - started) * 1000) / batchSize;
  }
  if (sink === -1) console.log('sink=' + sink);
  values.sort((left, right) => left - right);
  return { fixture, medianUs: percentile(values, 0.5), p95Us: percentile(values, 0.95) };
}

function percentile(values, p) {
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))] ?? 0;
}

function formatUs(value) {
  if (value >= 1000) return (value / 1000).toFixed(2) + ' ms';
  return value.toFixed(2) + ' us';
}

function padRight(value, width) {
  return String(value).padEnd(width, ' ');
}

function padLeft(value, width) {
  return String(value).padStart(width, ' ');
}

function readPackageVersion() {
  return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')).version;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--instances') out.instances = argv[++i];
    else if (arg === '--blueprints') out.blueprints = argv[++i];
    else if (arg === '--rounds') out.rounds = argv[++i];
    else if (arg === '--out') out.out = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run bench -- [--instances 5000] [--blueprints 64] [--rounds 30] [--out benchmarks/results/frontier-blueprint-package-bench-latest.json]');
      process.exit(0);
    }
  }
  return out;
}

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
