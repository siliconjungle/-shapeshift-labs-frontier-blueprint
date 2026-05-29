import assert from 'node:assert';
import { applyPatch } from '@shapeshift-labs/frontier';
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

const args = parseArgs(process.argv.slice(2));
const cases = readPositiveInt(args.cases, 500);
let seed = readPositiveInt(args.seed, 0xb17e9);
let checked = 0;

for (let i = 0; i < cases; i++) {
  const input = makeCatalogInput(i);
  const catalog = createBlueprintCatalog(input);
  const compiled = compileBlueprintCatalog(catalog);
  assert.strictEqual(compiled.validation.valid, validateBlueprintCatalog(catalog).valid);

  const projection = compileBlueprintProjection(compiled, undefined, { targetPath: '/entities' });
  let state = { entities: {}, blueprintInstances: {} };
  state = applyPatch(state, projection.patch);
  assert.strictEqual(Object.keys(state.entities).length, catalog.instances.length);

  for (const instance of catalog.instances) {
    const materialized = materializeBlueprintInstance(compiled, instance);
    assert.deepStrictEqual(state.entities[instance.id], materialized.value);
    assert.strictEqual(materialized.value.id, instance.id);
    assert.strictEqual(materialized.value.scene.userData.entityId, instance.id);
    assert.ok(!Object.prototype.hasOwnProperty.call(materialized.value.loot, 'secret'));
  }

  const chosen = catalog.instances[nextInt(catalog.instances.length)];
  const hp = 1 + nextInt(200);
  const edit = compileBlueprintOverridePatch(compiled, chosen, [[0, ['hp'], hp]], {
    instancePath: '/blueprintInstances/' + chosen.id,
    effectivePath: '/entities/' + chosen.id
  });
  assert.strictEqual(edit.instance.overrides['/hp'], hp);
  assert.deepStrictEqual(edit.effectivePatch[0][1], ['entities', chosen.id, 'hp']);

  const graph = createBlueprintRegistryGraph(compiled);
  assert.ok(graph.entries.length >= catalog.blueprints.length + catalog.instances.length);
  const jsonl = encodeBlueprintJsonl([projection, createBlueprintProof(catalog)]);
  assert.strictEqual(decodeBlueprintJsonl(jsonl).length, 2);
  checked++;
}

console.log('frontier-blueprint fuzz ok: ' + checked + ' cases');

function makeCatalogInput(index) {
  const blueprintCount = 2 + nextInt(4);
  const instanceCount = 4 + nextInt(12);
  const blueprints = [];
  const instances = [];
  for (let i = 0; i < blueprintCount; i++) {
    blueprints.push({
      id: 'enemy.type-' + i + '.v1',
      template: {
        id: '{{instanceId}}',
        type: 'enemy-' + i,
        hp: { $param: 'hp', default: 10 + i },
        attack: { $param: 'attack', default: 2 + i },
        loot: { coin: i + 1, secret: 'remove-me' },
        scene: {
          id: '{{id.root}}',
          mode: '2d',
          local: {
            x: { $param: 'x', default: 0 },
            y: { $param: 'y', default: 0 }
          },
          userData: { entityId: '{{instanceId}}', kind: '{{blueprintId}}' }
        }
      },
      variants: {
        elite: {
          params: { hp: 50 + i },
          overrides: { '/attack': 10 + i }
        }
      },
      resources: ['sprite:enemy-' + i],
      dependencies: ['tileset:group-' + (i % 2)]
    });
  }
  for (let i = 0; i < instanceCount; i++) {
    const blueprintIndex = i % blueprintCount;
    instances.push({
      id: 'enemy-' + index + '-' + i,
      blueprint: 'enemy.type-' + blueprintIndex + '.v1',
      variant: maybe() ? 'elite' : undefined,
      params: { x: nextInt(64), y: nextInt(64), hp: 5 + nextInt(80) },
      overrides: maybe() ? { '/loot/coin': nextInt(20) } : {},
      removals: ['/loot/secret'],
      idMap: maybe() ? { root: 'node-' + index + '-' + i } : undefined
    });
  }
  return { id: 'fuzz-blueprints-' + index, blueprints, instances };
}

function maybe() {
  return (next() & 1) === 1;
}

function nextInt(max) {
  return next() % max;
}

function next() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cases') out.cases = argv[++i];
    else if (argv[i] === '--seed') out.seed = argv[++i];
  }
  return out;
}

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
