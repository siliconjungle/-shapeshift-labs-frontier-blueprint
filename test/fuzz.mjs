import assert from 'node:assert';
import { OP_REMOVE, OP_SET, applyPatch, cloneJson } from '@shapeshift-labs/frontier';
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

  let chosen = catalog.instances[nextInt(catalog.instances.length)];
  for (let step = 0; step < 4; step++) {
    const before = materializeBlueprintInstance(compiled, chosen).value;
    const effectivePatch = makeEffectivePatch(step);
    const edit = compileBlueprintOverridePatch(compiled, chosen, effectivePatch, {
      instancePath: '/blueprintInstances/' + chosen.id,
      effectivePath: '/entities/' + chosen.id
    });
    const expected = applyPatch(cloneJson(before), effectivePatch);
    const after = materializeBlueprintInstance(compiled, edit.instance).value;
    assert.deepStrictEqual(after, expected);
    assert.deepStrictEqual(edit.effectivePatch[0][1].slice(0, 2), ['entities', chosen.id]);
    chosen = edit.instance;
  }

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
        },
        armored: {
          extends: 'elite',
          params: { armor: 4 + i },
          additions: { '/resistances/0': 'physical' },
          overrides: { '/loot/coin': 25 + i }
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
      variant: maybe() ? (maybe() ? 'armored' : 'elite') : undefined,
      params: { x: nextInt(64), y: nextInt(64), hp: 5 + nextInt(80) },
      overrides: maybe() ? { '/loot/coin': nextInt(20), '/scene/local/x': nextInt(128) } : {},
      additions: maybe() ? { '/status/0': 'spawned' } : {},
      removals: ['/loot/secret'],
      idMap: maybe() ? { root: 'node-' + index + '-' + i } : undefined
    });
  }
  return { id: 'fuzz-blueprints-' + index, blueprints, instances };
}

function maybe() {
  return (next() & 1) === 1;
}

function makeEffectivePatch(step) {
  const value = 1 + nextInt(200);
  switch ((next() + step) % 4) {
    case 0:
      return [[OP_SET, ['hp'], value]];
    case 1:
      return [[OP_SET, ['scene', 'local', 'x'], value]];
    case 2:
      return [[OP_SET, ['status', 0], 'fuzz-' + value]];
    default:
      return [[OP_REMOVE, ['loot', 'coin']]];
  }
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
