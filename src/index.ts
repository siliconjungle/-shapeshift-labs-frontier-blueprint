import {
  OP_ASSIGN,
  OP_REMOVE,
  OP_SET,
  applyPatch,
  cloneJson,
  parsePointer,
  stringifyPointer,
  type JsonObject,
  type JsonPath,
  type JsonValue,
  type Patch
} from '@shapeshift-labs/frontier';
import {
  createFrontierRegistryGraph,
  type FrontierRegistryEdge,
  type FrontierRegistryEntry,
  type FrontierRegistryGraph,
  type FrontierRegistryPath,
  type FrontierRegistryRecord,
  type FrontierRegistrySource
} from '@shapeshift-labs/frontier/registry';

export const FRONTIER_BLUEPRINT_KIND = 'frontier.blueprint';
export const FRONTIER_BLUEPRINT_VERSION = 1;
export const FRONTIER_BLUEPRINT_INSTANCE_KIND = 'frontier.blueprint.instance';
export const FRONTIER_BLUEPRINT_INSTANCE_VERSION = 1;
export const FRONTIER_BLUEPRINT_CATALOG_KIND = 'frontier.blueprint.catalog';
export const FRONTIER_BLUEPRINT_CATALOG_VERSION = 1;
export const FRONTIER_BLUEPRINT_MATERIALIZATION_KIND = 'frontier.blueprint.materialization';
export const FRONTIER_BLUEPRINT_MATERIALIZATION_VERSION = 1;
export const FRONTIER_BLUEPRINT_PROJECTION_KIND = 'frontier.blueprint.projection';
export const FRONTIER_BLUEPRINT_PROJECTION_VERSION = 1;
export const FRONTIER_BLUEPRINT_PROOF_KIND = 'frontier.blueprint.proof';
export const FRONTIER_BLUEPRINT_PROOF_VERSION = 1;

export type FrontierBlueprintId = string;
export type FrontierBlueprintInstanceId = string;
export type FrontierBlueprintOverlay = Record<string, JsonValue>;
export type FrontierBlueprintVariantMap = Record<string, FrontierBlueprintVariantInput>;

export interface FrontierBlueprintVariantInput {
  id?: string;
  description?: string;
  params?: JsonObject;
  overrides?: FrontierBlueprintOverlay;
  additions?: FrontierBlueprintOverlay;
  removals?: readonly (string | JsonPath)[];
  extends?: string;
  metadata?: unknown;
}

export interface FrontierBlueprintVariant {
  id: string;
  description?: string;
  params: JsonObject;
  overrides: FrontierBlueprintOverlay;
  additions: FrontierBlueprintOverlay;
  removals: string[];
  extends?: string;
  metadata?: JsonObject;
}

export interface FrontierBlueprintInput {
  id: FrontierBlueprintId;
  title?: string;
  description?: string;
  version?: string;
  template: JsonValue;
  params?: JsonObject;
  requiredParams?: readonly string[];
  variants?: FrontierBlueprintVariantMap | readonly FrontierBlueprintVariantInput[];
  resources?: readonly string[];
  dependencies?: readonly string[];
  tags?: readonly string[];
  package?: string;
  feature?: string;
  owner?: string;
  source?: FrontierRegistrySource;
  metadata?: unknown;
}

export interface FrontierBlueprint {
  kind: typeof FRONTIER_BLUEPRINT_KIND;
  schemaVersion: typeof FRONTIER_BLUEPRINT_VERSION;
  id: FrontierBlueprintId;
  title: string;
  description?: string;
  version?: string;
  template: JsonValue;
  params: JsonObject;
  requiredParams: string[];
  variants: Record<string, FrontierBlueprintVariant>;
  resources: string[];
  dependencies: string[];
  tags: string[];
  package?: string;
  feature?: string;
  owner?: string;
  source?: FrontierRegistrySource;
  metadata?: JsonObject;
}

export interface FrontierBlueprintInstanceInput {
  id: FrontierBlueprintInstanceId;
  blueprint: FrontierBlueprintId | FrontierBlueprint;
  variant?: string;
  version?: string;
  params?: JsonObject;
  overrides?: FrontierBlueprintOverlay;
  additions?: FrontierBlueprintOverlay;
  removals?: readonly (string | JsonPath)[];
  idMap?: Record<string, string>;
  pinnedHash?: string;
  tags?: readonly string[];
  owner?: string;
  source?: FrontierRegistrySource;
  metadata?: unknown;
}

export interface FrontierBlueprintInstance {
  kind: typeof FRONTIER_BLUEPRINT_INSTANCE_KIND;
  schemaVersion: typeof FRONTIER_BLUEPRINT_INSTANCE_VERSION;
  id: FrontierBlueprintInstanceId;
  blueprintId: FrontierBlueprintId;
  variant?: string;
  version?: string;
  params: JsonObject;
  overrides: FrontierBlueprintOverlay;
  additions: FrontierBlueprintOverlay;
  removals: string[];
  idMap: Record<string, string>;
  pinnedHash?: string;
  tags: string[];
  owner?: string;
  source?: FrontierRegistrySource;
  metadata?: JsonObject;
}

export interface FrontierBlueprintCatalogInput {
  id?: string;
  title?: string;
  description?: string;
  package?: string;
  feature?: string;
  owner?: string;
  blueprints?: readonly (FrontierBlueprintInput | FrontierBlueprint)[];
  instances?: readonly (FrontierBlueprintInstanceInput | FrontierBlueprintInstance)[];
  tags?: readonly string[];
  source?: FrontierRegistrySource;
  generatedAt?: number;
  metadata?: unknown;
}

export interface FrontierBlueprintCatalog {
  kind: typeof FRONTIER_BLUEPRINT_CATALOG_KIND;
  version: typeof FRONTIER_BLUEPRINT_CATALOG_VERSION;
  id: string;
  title?: string;
  description?: string;
  package?: string;
  feature?: string;
  owner?: string;
  blueprints: FrontierBlueprint[];
  instances: FrontierBlueprintInstance[];
  tags: string[];
  source?: FrontierRegistrySource;
  generatedAt?: number;
  metadata?: JsonObject;
  summary: FrontierBlueprintSummary;
}

export interface FrontierBlueprintSummary {
  blueprintCount: number;
  instanceCount: number;
  variantCount: number;
  resourceCount: number;
  dependencyCount: number;
  overrideCount: number;
  additionCount: number;
  removalCount: number;
  pinnedInstanceCount: number;
}

export interface FrontierBlueprintValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  blueprintId?: string;
  instanceId?: string;
  path?: string;
}

export interface FrontierBlueprintValidation {
  valid: boolean;
  issues: FrontierBlueprintValidationIssue[];
}

export interface FrontierCompiledBlueprintCatalog {
  kind: 'frontier.blueprint.compiled';
  version: 1;
  catalog: FrontierBlueprintCatalog;
  blueprintsById: ReadonlyMap<string, FrontierBlueprint>;
  instancesById: ReadonlyMap<string, FrontierBlueprintInstance>;
  validation: FrontierBlueprintValidation;
  getBlueprint(id: string): FrontierBlueprint;
  getInstance(id: string): FrontierBlueprintInstance;
  materialize(instance: string | FrontierBlueprintInstanceInput, options?: FrontierBlueprintMaterializeOptions): JsonValue;
}

export interface FrontierBlueprintMaterializeOptions {
  params?: JsonObject;
  idMap?: Record<string, string>;
  idSeparator?: string;
  includeInstanceMetadata?: boolean;
}

export interface FrontierBlueprintMaterialization {
  kind: typeof FRONTIER_BLUEPRINT_MATERIALIZATION_KIND;
  version: typeof FRONTIER_BLUEPRINT_MATERIALIZATION_VERSION;
  blueprintId: string;
  instanceId: string;
  variant?: string;
  value: JsonValue;
  inheritedPaths: string[];
  overridePaths: string[];
  additionPaths: string[];
  removalPaths: string[];
  idMap: Record<string, string>;
}

export interface FrontierBlueprintProjectionOptions {
  targetPath?: string | JsonPath;
  includeMaterializations?: boolean;
}

export interface FrontierBlueprintProjection {
  kind: typeof FRONTIER_BLUEPRINT_PROJECTION_KIND;
  version: typeof FRONTIER_BLUEPRINT_PROJECTION_VERSION;
  targetPath: JsonPath;
  patch: Patch;
  valuesById: Record<string, JsonValue>;
  materializations?: FrontierBlueprintMaterialization[];
}

export interface FrontierBlueprintPatchOptions {
  targetPath?: string | JsonPath;
  includeMaterialization?: boolean;
}

export interface FrontierBlueprintPatchResult {
  patch: Patch;
  materialization?: FrontierBlueprintMaterialization;
}

export interface FrontierBlueprintOverridePatchOptions {
  instancePath: string | JsonPath;
  effectivePath?: string | JsonPath;
}

export interface FrontierBlueprintOverridePatchResult {
  instance: FrontierBlueprintInstance;
  patch: Patch;
  sourcePatch: Patch;
  effectivePatch: Patch;
}

export interface FrontierBlueprintPatchTarget {
  commitPatch?: (patch: Patch, options?: unknown) => unknown;
  commit?: (patch: Patch, options?: unknown) => unknown;
}

export interface FrontierBlueprintProof {
  kind: typeof FRONTIER_BLUEPRINT_PROOF_KIND;
  version: typeof FRONTIER_BLUEPRINT_PROOF_VERSION;
  catalogId: string;
  generatedAt?: number;
  hash: string;
  summary: FrontierBlueprintSummary;
}

type BlueprintLike = FrontierBlueprint | FrontierBlueprintInput | FrontierCompiledBlueprintCatalog | FrontierBlueprintCatalog;

const hasOwn = Object.prototype.hasOwnProperty;
const EMPTY_VARIANT_CHAIN: readonly FrontierBlueprintVariant[] = Object.freeze([]);
const MAX_POINTER_PATH_CACHE_SIZE = 4096;
const blueprintLocalIdsCache = new WeakMap<FrontierBlueprint, readonly string[]>();
const blueprintVariantChainCache = new WeakMap<FrontierBlueprint, Map<string, readonly FrontierBlueprintVariant[]>>();
const blueprintPointerPathCache = new Map<string, JsonPath>();

interface ResolvedBlueprintValue {
  blueprint: FrontierBlueprint;
  instance: FrontierBlueprintInstance;
  value: JsonValue;
  idMap: Record<string, string>;
  overridePaths: string[];
  additionPaths: string[];
  removalPaths: string[];
}

export function defineBlueprint(input: FrontierBlueprintInput): FrontierBlueprint {
  return createBlueprint(input);
}

export function createBlueprint(input: FrontierBlueprintInput): FrontierBlueprint {
  if (!input || typeof input.id !== 'string' || input.id.length === 0) {
    throw new TypeError('createBlueprint(input) requires a non-empty id');
  }
  const variants = normalizeVariants(input.variants);
  return {
    kind: FRONTIER_BLUEPRINT_KIND,
    schemaVersion: FRONTIER_BLUEPRINT_VERSION,
    id: input.id,
    title: input.title ?? input.id,
    description: input.description,
    version: input.version,
    template: cloneJson(input.template),
    params: cloneObject(input.params),
    requiredParams: uniqueStrings(input.requiredParams),
    variants,
    resources: uniqueStrings(input.resources),
    dependencies: uniqueStrings(input.dependencies),
    tags: uniqueStrings(input.tags),
    package: input.package,
    feature: input.feature,
    owner: input.owner,
    source: input.source,
    metadata: toJsonObject(input.metadata)
  };
}

export function defineBlueprintInstance(input: FrontierBlueprintInstanceInput): FrontierBlueprintInstance {
  return createBlueprintInstance(input);
}

export function createBlueprintInstance(input: FrontierBlueprintInstanceInput): FrontierBlueprintInstance {
  if (!input || typeof input.id !== 'string' || input.id.length === 0) {
    throw new TypeError('createBlueprintInstance(input) requires a non-empty id');
  }
  const blueprintId = typeof input.blueprint === 'string' ? input.blueprint : input.blueprint.id;
  return {
    kind: FRONTIER_BLUEPRINT_INSTANCE_KIND,
    schemaVersion: FRONTIER_BLUEPRINT_INSTANCE_VERSION,
    id: input.id,
    blueprintId,
    variant: input.variant,
    version: input.version,
    params: cloneObject(input.params),
    overrides: normalizeOverlay(input.overrides),
    additions: normalizeOverlay(input.additions),
    removals: normalizePathList(input.removals),
    idMap: { ...(input.idMap ?? {}) },
    pinnedHash: input.pinnedHash,
    tags: uniqueStrings(input.tags),
    owner: input.owner,
    source: input.source,
    metadata: toJsonObject(input.metadata)
  };
}

export function createBlueprintCatalog(input: FrontierBlueprintCatalogInput = {}): FrontierBlueprintCatalog {
  const blueprints = (input.blueprints ?? []).map((entry) => isBlueprint(entry) ? entry : createBlueprint(entry));
  const instances = (input.instances ?? []).map((entry) => isBlueprintInstance(entry) ? entry : createBlueprintInstance(entry));
  return {
    kind: FRONTIER_BLUEPRINT_CATALOG_KIND,
    version: FRONTIER_BLUEPRINT_CATALOG_VERSION,
    id: input.id ?? 'frontier.blueprints',
    title: input.title,
    description: input.description,
    package: input.package,
    feature: input.feature,
    owner: input.owner,
    blueprints,
    instances,
    tags: uniqueStrings(input.tags),
    source: input.source,
    generatedAt: input.generatedAt,
    metadata: toJsonObject(input.metadata),
    summary: summarizeBlueprintCatalog(blueprints, instances)
  };
}

export function compileBlueprintCatalog(input: FrontierBlueprintCatalog | FrontierBlueprintCatalogInput): FrontierCompiledBlueprintCatalog {
  const catalog = isBlueprintCatalog(input) ? input : createBlueprintCatalog(input);
  const blueprintsById = new Map<string, FrontierBlueprint>();
  const instancesById = new Map<string, FrontierBlueprintInstance>();
  for (const blueprint of catalog.blueprints) blueprintsById.set(blueprint.id, blueprint);
  for (const instance of catalog.instances) instancesById.set(instance.id, instance);
  const validation = validateBlueprintCatalog(catalog);
  return {
    kind: 'frontier.blueprint.compiled',
    version: 1,
    catalog,
    blueprintsById,
    instancesById,
    validation,
    getBlueprint(id) {
      const blueprint = blueprintsById.get(id);
      if (!blueprint) throw new Error('unknown blueprint: ' + id);
      return blueprint;
    },
    getInstance(id) {
      const instance = instancesById.get(id);
      if (!instance) throw new Error('unknown blueprint instance: ' + id);
      return instance;
    },
    materialize(instance, options) {
      const normalized = typeof instance === 'string' ? this.getInstance(instance) : createBlueprintInstance(instance);
      return materializeBlueprintInstance(this, normalized, options).value;
    }
  };
}

export function validateBlueprintCatalog(input: FrontierBlueprintCatalog | FrontierBlueprintCatalogInput): FrontierBlueprintValidation {
  const catalog = isBlueprintCatalog(input) ? input : createBlueprintCatalog(input);
  const issues: FrontierBlueprintValidationIssue[] = [];
  const blueprintIds = new Set<string>();
  const instanceIds = new Set<string>();

  for (const blueprint of catalog.blueprints) {
    if (blueprintIds.has(blueprint.id)) {
      issues.push({ code: 'duplicate-blueprint', message: 'duplicate blueprint id: ' + blueprint.id, severity: 'error', blueprintId: blueprint.id });
    }
    blueprintIds.add(blueprint.id);
    for (const required of blueprint.requiredParams) {
      if (hasOwn.call(blueprint.params, required)) continue;
      issues.push({ code: 'required-param-no-default', message: 'required param has no default: ' + required, severity: 'warning', blueprintId: blueprint.id });
    }
    for (const variant of Object.values(blueprint.variants)) {
      validateOverlayPointers(issues, variant.overrides, blueprint.id);
      validateOverlayPointers(issues, variant.additions, blueprint.id);
      validatePointerList(issues, variant.removals, blueprint.id);
      if (variant.extends && !blueprint.variants[variant.extends]) {
        issues.push({ code: 'unknown-variant-parent', message: 'variant extends unknown parent: ' + variant.extends, severity: 'error', blueprintId: blueprint.id });
      }
    }
  }

  for (const instance of catalog.instances) {
    if (instanceIds.has(instance.id)) {
      issues.push({ code: 'duplicate-instance', message: 'duplicate instance id: ' + instance.id, severity: 'error', instanceId: instance.id });
    }
    instanceIds.add(instance.id);
    if (!blueprintIds.has(instance.blueprintId)) {
      issues.push({ code: 'unknown-blueprint', message: 'instance references unknown blueprint: ' + instance.blueprintId, severity: 'error', instanceId: instance.id });
      continue;
    }
    const blueprint = catalog.blueprints.find((entry) => entry.id === instance.blueprintId);
    if (blueprint && instance.variant && !blueprint.variants[instance.variant]) {
      issues.push({ code: 'unknown-variant', message: 'instance references unknown variant: ' + instance.variant, severity: 'error', blueprintId: blueprint.id, instanceId: instance.id });
    }
    validateOverlayPointers(issues, instance.overrides, instance.blueprintId, instance.id);
    validateOverlayPointers(issues, instance.additions, instance.blueprintId, instance.id);
    validatePointerList(issues, instance.removals, instance.blueprintId, instance.id);
  }

  return { valid: issues.every((issue) => issue.severity !== 'error'), issues };
}

export function materializeBlueprintInstance(
  blueprintOrCatalog: BlueprintLike,
  instanceInput: FrontierBlueprintInstance | FrontierBlueprintInstanceInput,
  options: FrontierBlueprintMaterializeOptions = {}
): FrontierBlueprintMaterialization {
  const materialized = materializeBlueprintValue(blueprintOrCatalog, instanceInput, options, true);

  return {
    kind: FRONTIER_BLUEPRINT_MATERIALIZATION_KIND,
    version: FRONTIER_BLUEPRINT_MATERIALIZATION_VERSION,
    blueprintId: materialized.blueprint.id,
    instanceId: materialized.instance.id,
    variant: materialized.instance.variant,
    value: materialized.value,
    inheritedPaths: collectInheritedPaths(materialized.value, new Set([...materialized.overridePaths, ...materialized.additionPaths, ...materialized.removalPaths])),
    overridePaths: uniqueStrings(materialized.overridePaths).sort(),
    additionPaths: uniqueStrings(materialized.additionPaths).sort(),
    removalPaths: uniqueStrings(materialized.removalPaths).sort(),
    idMap: materialized.idMap
  };
}

export function compileBlueprintPatch(
  blueprintOrCatalog: BlueprintLike,
  instanceInput: FrontierBlueprintInstance | FrontierBlueprintInstanceInput,
  options: FrontierBlueprintPatchOptions = {}
): FrontierBlueprintPatchResult {
  const materialization = materializeBlueprintInstance(blueprintOrCatalog, instanceInput);
  const targetPath = normalizeTargetPath(options.targetPath ?? [materialization.instanceId]);
  const patch: Patch = [[OP_SET, targetPath, cloneJson(materialization.value)]];
  return options.includeMaterialization ? { patch, materialization } : { patch };
}

export function compileBlueprintProjection(
  blueprintOrCatalog: FrontierCompiledBlueprintCatalog | FrontierBlueprintCatalog | FrontierBlueprintCatalogInput,
  instancesInput?: readonly (FrontierBlueprintInstance | FrontierBlueprintInstanceInput)[],
  options: FrontierBlueprintProjectionOptions = {}
): FrontierBlueprintProjection {
  const compiled = isCompiledCatalog(blueprintOrCatalog)
    ? blueprintOrCatalog
    : compileBlueprintCatalog(blueprintOrCatalog);
  const instances = instancesInput ? instancesInput.map((entry) => isBlueprintInstance(entry) ? entry : createBlueprintInstance(entry)) : compiled.catalog.instances;
  const targetPath = normalizeTargetPath(options.targetPath ?? []);
  const patch: Patch = [];
  const valuesById: Record<string, JsonValue> = {};
  const materializations: FrontierBlueprintMaterialization[] = [];
  for (const instance of instances) {
    if (options.includeMaterializations) {
      const materialization = materializeBlueprintInstance(compiled, instance);
      valuesById[instance.id] = cloneJson(materialization.value);
      patch.push([OP_SET, targetPath.concat(instance.id), cloneJson(materialization.value)]);
      materializations.push(materialization);
    } else {
      const materialized = materializeBlueprintValue(compiled, instance, {}, false);
      valuesById[instance.id] = materialized.value;
      patch.push([OP_SET, targetPath.concat(instance.id), cloneJson(materialized.value)]);
    }
  }
  const out: FrontierBlueprintProjection = {
    kind: FRONTIER_BLUEPRINT_PROJECTION_KIND,
    version: FRONTIER_BLUEPRINT_PROJECTION_VERSION,
    targetPath,
    patch,
    valuesById
  };
  if (options.includeMaterializations) out.materializations = materializations;
  return out;
}

export function compileBlueprintOverridePatch(
  blueprintOrCatalog: BlueprintLike,
  instanceInput: FrontierBlueprintInstance | FrontierBlueprintInstanceInput,
  effectivePatch: Patch,
  options: FrontierBlueprintOverridePatchOptions
): FrontierBlueprintOverridePatchResult {
  const instance = isBlueprintInstance(instanceInput) ? cloneInstance(instanceInput) : createBlueprintInstance(instanceInput);
  const current = materializeBlueprintValue(blueprintOrCatalog, instance, {}, false).value;
  const next = applyPatch(cloneJson(current), effectivePatch);
  const sourcePatch: Patch = [];
  const instancePath = normalizeTargetPath(options.instancePath);
  const effectivePath = options.effectivePath ? normalizeTargetPath(options.effectivePath) : null;

  const removals = new Set(instance.removals);
  const overrides: FrontierBlueprintOverlay = { ...instance.overrides };
  const additions: FrontierBlueprintOverlay = { ...instance.additions };

  for (const operation of effectivePatch) {
    const pointer = stringifyPointer(operation[1]);
    if (operation[0] === OP_REMOVE) {
      delete overrides[pointer];
      delete additions[pointer];
      removals.add(pointer);
      continue;
    }
    const value = readPath(next, operation[1]);
    if (value === undefined) {
      delete overrides[pointer];
      delete additions[pointer];
      removals.add(pointer);
    } else {
      removals.delete(pointer);
      overrides[pointer] = cloneJson(value);
    }
  }

  instance.overrides = sortOverlay(overrides);
  instance.additions = sortOverlay(additions);
  instance.removals = Array.from(removals).sort();

  sourcePatch.push([OP_SET, instancePath.concat('overrides'), cloneJson(instance.overrides)]);
  sourcePatch.push([OP_SET, instancePath.concat('additions'), cloneJson(instance.additions)]);
  sourcePatch.push([OP_SET, instancePath.concat('removals'), instance.removals.slice()]);

  const prefixedEffective = effectivePath ? prefixPatch(effectivePatch, effectivePath) : [];
  return {
    instance,
    patch: sourcePatch.concat(prefixedEffective),
    sourcePatch,
    effectivePatch: prefixedEffective
  };
}

export function compileBlueprintRevertPatch(
  instanceInput: FrontierBlueprintInstance | FrontierBlueprintInstanceInput,
  paths: readonly (string | JsonPath)[],
  options: { instancePath: string | JsonPath }
): { instance: FrontierBlueprintInstance; patch: Patch } {
  const instance = isBlueprintInstance(instanceInput) ? cloneInstance(instanceInput) : createBlueprintInstance(instanceInput);
  const keys = new Set(paths.map(pointerKey));
  const overrides: FrontierBlueprintOverlay = {};
  const additions: FrontierBlueprintOverlay = {};
  for (const [key, value] of Object.entries(instance.overrides)) if (!keys.has(key)) overrides[key] = value;
  for (const [key, value] of Object.entries(instance.additions)) if (!keys.has(key)) additions[key] = value;
  instance.overrides = sortOverlay(overrides);
  instance.additions = sortOverlay(additions);
  instance.removals = instance.removals.filter((path) => !keys.has(path));
  const instancePath = normalizeTargetPath(options.instancePath);
  return {
    instance,
    patch: [
      [OP_SET, instancePath.concat('overrides'), cloneJson(instance.overrides)],
      [OP_SET, instancePath.concat('additions'), cloneJson(instance.additions)],
      [OP_SET, instancePath.concat('removals'), instance.removals.slice()]
    ]
  };
}

export function commitBlueprintPatch(target: FrontierBlueprintPatchTarget, patch: Patch, options?: unknown): unknown {
  if (typeof target.commitPatch === 'function') return target.commitPatch(patch, options);
  if (typeof target.commit === 'function') return target.commit(patch, options);
  throw new TypeError('blueprint target must expose commitPatch(patch) or commit(patch)');
}

export function commitBlueprintInstance(
  target: FrontierBlueprintPatchTarget,
  blueprintOrCatalog: BlueprintLike,
  instanceInput: FrontierBlueprintInstance | FrontierBlueprintInstanceInput,
  options: FrontierBlueprintPatchOptions = {}
): unknown {
  return commitBlueprintPatch(target, compileBlueprintPatch(blueprintOrCatalog, instanceInput, options).patch, options);
}

export function createBlueprintRegistryGraph(
  input: FrontierCompiledBlueprintCatalog | FrontierBlueprintCatalog | FrontierBlueprintCatalogInput,
  options: { generatedAt?: number; package?: string; includeInstances?: boolean } = {}
): FrontierRegistryGraph {
  const compiled = isCompiledCatalog(input) ? input : compileBlueprintCatalog(input);
  const entries: FrontierRegistryEntry[] = [];
  const edges: FrontierRegistryEdge[] = [];
  const records: FrontierRegistryRecord[] = [];
  const packageName = options.package ?? compiled.catalog.package;

  for (const blueprint of compiled.catalog.blueprints) {
    const entryId = 'blueprint:' + blueprint.id;
    entries.push({
      id: entryId,
      kind: 'blueprint',
      package: blueprint.package ?? packageName,
      feature: blueprint.feature ?? compiled.catalog.feature,
      owner: blueprint.owner ?? compiled.catalog.owner,
      version: blueprint.version,
      source: blueprint.source,
      produces: blueprint.resources,
      dependsOn: blueprint.dependencies,
      tags: blueprint.tags,
      metadata: { blueprintId: blueprint.id, variants: Object.keys(blueprint.variants).length }
    });
    for (const dependency of blueprint.dependencies) edges.push({ from: entryId, to: dependency, kind: 'depends-on' });
    for (const resource of blueprint.resources) edges.push({ from: entryId, to: resource, kind: 'produces' });
    for (const variant of Object.values(blueprint.variants)) {
      const variantId = entryId + ':variant:' + variant.id;
      entries.push({
        id: variantId,
        kind: 'blueprint-variant',
        package: blueprint.package ?? packageName,
        feature: blueprint.feature ?? compiled.catalog.feature,
        version: blueprint.version,
        tags: blueprint.tags,
        metadata: { blueprintId: blueprint.id, variantId: variant.id }
      });
      edges.push({ from: variantId, to: entryId, kind: 'depends-on' });
    }
  }

  if (options.includeInstances !== false) {
    for (const instance of compiled.catalog.instances) {
      const entryId = 'blueprint-instance:' + instance.id;
      entries.push({
        id: entryId,
        kind: 'blueprint-instance',
        package: packageName,
        owner: instance.owner ?? compiled.catalog.owner,
        source: instance.source,
        dependsOn: ['blueprint:' + instance.blueprintId],
        writes: [['instances', instance.id] as FrontierRegistryPath],
        tags: instance.tags,
        metadata: {
          blueprintId: instance.blueprintId,
          variant: instance.variant ?? null,
          overrides: Object.keys(instance.overrides).length,
          removals: instance.removals.length
        }
      });
      edges.push({ from: entryId, to: 'blueprint:' + instance.blueprintId, kind: 'depends-on' });
      records.push({
        id: entryId + ':materialized',
        entryId,
        kind: 'blueprint-instance',
        status: 'ok',
        writes: [['instances', instance.id] as FrontierRegistryPath],
        metadata: { blueprintId: instance.blueprintId }
      });
    }
  }

  return createFrontierRegistryGraph({ entries, records, edges, generatedAt: options.generatedAt ?? compiled.catalog.generatedAt });
}

export function encodeBlueprintJsonl(values: readonly JsonValue[]): string {
  return values.map((value) => JSON.stringify(value)).join('\n') + (values.length === 0 ? '' : '\n');
}

export function decodeBlueprintJsonl(text: string): JsonValue[] {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line) as JsonValue);
}

export function createBlueprintProof(
  input: FrontierCompiledBlueprintCatalog | FrontierBlueprintCatalog | FrontierBlueprintCatalogInput,
  options: { generatedAt?: number } = {}
): FrontierBlueprintProof {
  const catalog = isCompiledCatalog(input) ? input.catalog : isBlueprintCatalog(input) ? input : createBlueprintCatalog(input);
  return {
    kind: FRONTIER_BLUEPRINT_PROOF_KIND,
    version: FRONTIER_BLUEPRINT_PROOF_VERSION,
    catalogId: catalog.id,
    generatedAt: options.generatedAt ?? catalog.generatedAt,
    hash: hashStableJson(redactBlueprintValue(catalog as unknown as JsonValue)),
    summary: catalog.summary
  };
}

export function redactBlueprintValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(redactBlueprintValue);
  if (!isPlainObject(value)) return value;
  const out: JsonObject = {};
  for (const key of Object.keys(value)) {
    if (/secret|token|password|credential|private/i.test(key)) out[key] = '[redacted]';
    else out[key] = redactBlueprintValue(value[key]);
  }
  return out;
}

function normalizeVariants(input: FrontierBlueprintInput['variants']): Record<string, FrontierBlueprintVariant> {
  const out: Record<string, FrontierBlueprintVariant> = {};
  if (!input) return out;
  if (Array.isArray(input)) {
    for (const variant of input) {
      if (!variant.id) throw new TypeError('array blueprint variants require id');
      out[variant.id] = normalizeVariant(variant.id, variant);
    }
    return out;
  }
  for (const [id, variant] of Object.entries(input)) out[id] = normalizeVariant(id, variant);
  return out;
}

function normalizeVariant(id: string, input: FrontierBlueprintVariantInput): FrontierBlueprintVariant {
  return {
    id,
    description: input.description,
    params: cloneObject(input.params),
    overrides: normalizeOverlay(input.overrides),
    additions: normalizeOverlay(input.additions),
    removals: normalizePathList(input.removals),
    extends: input.extends,
    metadata: toJsonObject(input.metadata)
  };
}

function summarizeBlueprintCatalog(blueprints: readonly FrontierBlueprint[], instances: readonly FrontierBlueprintInstance[]): FrontierBlueprintSummary {
  const resources = new Set<string>();
  const dependencies = new Set<string>();
  let variantCount = 0;
  let overrideCount = 0;
  let additionCount = 0;
  let removalCount = 0;
  let pinnedInstanceCount = 0;
  for (const blueprint of blueprints) {
    variantCount += Object.keys(blueprint.variants).length;
    for (const id of blueprint.resources) resources.add(id);
    for (const id of blueprint.dependencies) dependencies.add(id);
  }
  for (const instance of instances) {
    overrideCount += Object.keys(instance.overrides).length;
    additionCount += Object.keys(instance.additions).length;
    removalCount += instance.removals.length;
    if (instance.pinnedHash) pinnedInstanceCount++;
  }
  return {
    blueprintCount: blueprints.length,
    instanceCount: instances.length,
    variantCount,
    resourceCount: resources.size,
    dependencyCount: dependencies.size,
    overrideCount,
    additionCount,
    removalCount,
    pinnedInstanceCount
  };
}

function materializeBlueprintValue(
  blueprintOrCatalog: BlueprintLike,
  instanceInput: FrontierBlueprintInstance | FrontierBlueprintInstanceInput,
  options: FrontierBlueprintMaterializeOptions,
  collectPaths: boolean
): ResolvedBlueprintValue {
  const instance = isBlueprintInstance(instanceInput) ? instanceInput : createBlueprintInstance(instanceInput);
  const blueprint = resolveBlueprint(blueprintOrCatalog, instance.blueprintId);
  const chain = variantChain(blueprint, instance.variant);
  const idMap = createIdMap(blueprint, instance, options);
  const params = mergeParams(blueprint, instance, options, chain);
  let value = substituteBlueprintValue(blueprint.template, { blueprint, instance, params, idMap, options });
  const overridePaths: string[] = [];
  const additionPaths: string[] = [];
  const removalPaths: string[] = [];

  for (const variant of chain) {
    value = applyOverlay(value, variant.removals, variant.additions, variant.overrides);
    if (collectPaths) {
      removalPaths.push(...variant.removals);
      additionPaths.push(...Object.keys(variant.additions));
      overridePaths.push(...Object.keys(variant.overrides));
    }
  }

  value = applyOverlay(value, instance.removals, instance.additions, instance.overrides);
  if (collectPaths) {
    removalPaths.push(...instance.removals);
    additionPaths.push(...Object.keys(instance.additions));
    overridePaths.push(...Object.keys(instance.overrides));
  }

  if (options.includeInstanceMetadata && isPlainObject(value)) {
    value = {
      ...value,
      $blueprint: {
        id: blueprint.id,
        version: blueprint.version ?? null,
        instance: instance.id,
        variant: instance.variant ?? null
      }
    };
  }

  return { blueprint, instance, value, idMap, overridePaths, additionPaths, removalPaths };
}

function mergeParams(
  blueprint: FrontierBlueprint,
  instance: FrontierBlueprintInstance,
  options: FrontierBlueprintMaterializeOptions,
  chain: readonly FrontierBlueprintVariant[]
): JsonObject {
  const params: JsonObject = { ...blueprint.params };
  for (const variant of chain) Object.assign(params, variant.params);
  Object.assign(params, instance.params);
  if (options.params) Object.assign(params, options.params);
  return params;
}

function createIdMap(blueprint: FrontierBlueprint, instance: FrontierBlueprintInstance, options: FrontierBlueprintMaterializeOptions): Record<string, string> {
  const idMap: Record<string, string> = {};
  const separator = options.idSeparator ?? ':';
  const merged = { ...instance.idMap, ...(options.idMap ?? {}) };
  const localIds = blueprintLocalIds(blueprint);
  for (const localId of localIds) idMap[localId] = merged[localId] ?? instance.id + separator + localId;
  for (const [key, value] of Object.entries(merged)) idMap[key] = value;
  return idMap;
}

function blueprintLocalIds(blueprint: FrontierBlueprint): readonly string[] {
  const cached = blueprintLocalIdsCache.get(blueprint);
  if (cached) return cached;
  const localIds = Array.from(collectLocalIds(blueprint.template));
  blueprintLocalIdsCache.set(blueprint, localIds);
  return localIds;
}

function collectLocalIds(value: JsonValue, ids = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\{\{id\.([^}]+)\}\}/g)) ids.add(match[1]);
    return ids;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectLocalIds(item, ids);
    return ids;
  }
  if (isPlainObject(value)) {
    if (typeof value.$id === 'string') ids.add(value.$id);
    for (const item of Object.values(value)) collectLocalIds(item, ids);
  }
  return ids;
}

function substituteBlueprintValue(
  value: JsonValue,
  context: {
    blueprint: FrontierBlueprint;
    instance: FrontierBlueprintInstance;
    params: JsonObject;
    idMap: Record<string, string>;
    options: FrontierBlueprintMaterializeOptions;
  }
): JsonValue {
  if (typeof value === 'string') return substituteString(value, context);
  if (Array.isArray(value)) return value.map((item) => substituteBlueprintValue(item, context));
  if (!isPlainObject(value)) return value;
  if (typeof value.$param === 'string') {
    const fallback = hasOwn.call(value, 'default') ? value.default : null;
    return cloneJson(readParam(context.params, value.$param, fallback as JsonValue));
  }
  if (typeof value.$id === 'string') return context.idMap[value.$id] ?? context.instance.id + ':' + value.$id;
  const out: JsonObject = {};
  for (const key of Object.keys(value)) out[key] = substituteBlueprintValue(value[key], context);
  return out;
}

function substituteString(value: string, context: {
  blueprint: FrontierBlueprint;
  instance: FrontierBlueprintInstance;
  params: JsonObject;
  idMap: Record<string, string>;
}): JsonValue {
  const wholeParam = /^\{\{param\.([^}]+)\}\}$/.exec(value);
  if (wholeParam) return cloneJson(readParam(context.params, wholeParam[1], null));
  const wholeId = /^\{\{id\.([^}]+)\}\}$/.exec(value);
  if (wholeId) return context.idMap[wholeId[1]] ?? context.instance.id + ':' + wholeId[1];
  return value.replace(/\{\{(instanceId|blueprintId|variant|param\.([^}]+)|id\.([^}]+))\}\}/g, (_match, token, paramName, idName) => {
    if (token === 'instanceId') return context.instance.id;
    if (token === 'blueprintId') return context.blueprint.id;
    if (token === 'variant') return context.instance.variant ?? '';
    if (paramName) return String(readParam(context.params, paramName, ''));
    if (idName) return context.idMap[idName] ?? context.instance.id + ':' + idName;
    return '';
  });
}

function readParam(params: JsonObject, key: string, fallback: JsonValue): JsonValue {
  return hasOwn.call(params, key) ? params[key] : fallback;
}

function variantChain(blueprint: FrontierBlueprint, variantId?: string): readonly FrontierBlueprintVariant[] {
  if (!variantId) return EMPTY_VARIANT_CHAIN;
  let chains = blueprintVariantChainCache.get(blueprint);
  if (!chains) {
    chains = new Map<string, readonly FrontierBlueprintVariant[]>();
    blueprintVariantChainCache.set(blueprint, chains);
  }
  const cached = chains.get(variantId);
  if (cached) return cached;
  const out: FrontierBlueprintVariant[] = [];
  const seen = new Set<string>();
  let current: string | undefined = variantId;
  while (current) {
    if (seen.has(current)) throw new Error('cyclic blueprint variant chain: ' + current);
    seen.add(current);
    const variant: FrontierBlueprintVariant | undefined = blueprint.variants[current];
    if (!variant) throw new Error('unknown blueprint variant: ' + current);
    out.unshift(variant);
    current = variant.extends;
  }
  chains.set(variantId, out);
  return out;
}

function applyOverlay(
  source: JsonValue,
  removals: readonly string[],
  additions: FrontierBlueprintOverlay,
  overrides: FrontierBlueprintOverlay
): JsonValue {
  let value = source;
  for (let i = 0; i < removals.length; i++) value = removeAtPath(value, cachedPointerPath(removals[i]));
  for (const [pointer, next] of Object.entries(additions)) value = setAtPath(value, cachedPointerPath(pointer), cloneJson(next));
  for (const [pointer, next] of Object.entries(overrides)) value = setAtPath(value, cachedPointerPath(pointer), cloneJson(next));
  return value;
}

function setAtPath(root: JsonValue, path: JsonPath, value: JsonValue): JsonValue {
  if (path.length === 0) return value;
  let cursor = root;
  if (!isContainer(cursor)) cursor = isArrayLikePathKey(path[0]) ? [] : {};
  const out = cursor;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const nextKey = path[i + 1];
    if (Array.isArray(cursor)) {
      const index = toArrayIndex(key);
      if (!isContainer(cursor[index])) cursor[index] = isArrayLikePathKey(nextKey) ? [] : {};
      cursor = cursor[index];
    } else if (isPlainObject(cursor)) {
      const object = cursor as JsonObject;
      const prop = String(key);
      if (!isContainer(object[prop])) object[prop] = isArrayLikePathKey(nextKey) ? [] : {};
      cursor = object[prop];
    }
  }
  const last = path[path.length - 1];
  if (Array.isArray(cursor)) cursor[toArrayIndex(last)] = value;
  else if (isPlainObject(cursor)) cursor[String(last)] = value;
  return out;
}

function removeAtPath(root: JsonValue, path: JsonPath): JsonValue {
  if (path.length === 0) return null;
  const parent = readPath(root, path.slice(0, -1));
  if (!isContainer(parent)) return root;
  const last = path[path.length - 1];
  if (Array.isArray(parent)) {
    const index = toArrayIndex(last);
    if (index >= 0 && index < parent.length) parent.splice(index, 1);
  } else {
    delete (parent as JsonObject)[String(last)];
  }
  return root;
}

function readPath(root: JsonValue, path: JsonPath): JsonValue | undefined {
  let cursor: JsonValue | undefined = root;
  for (const key of path) {
    if (Array.isArray(cursor)) cursor = cursor[toArrayIndex(key)];
    else if (isPlainObject(cursor)) cursor = cursor[String(key)];
    else return undefined;
  }
  return cursor;
}

function prefixPatch(patch: Patch, prefix: JsonPath): Patch {
  return patch.map((operation) => {
    if (operation[0] === OP_SET) return [OP_SET, prefix.concat(operation[1]), cloneJson(operation[2])];
    if (operation[0] === OP_REMOVE) return [OP_REMOVE, prefix.concat(operation[1])];
    if (operation[0] === OP_ASSIGN) return [OP_ASSIGN, prefix.concat(operation[1]), cloneJson(operation[2]) as JsonObject];
    const copy = operation.slice() as unknown as [number, JsonPath, ...unknown[]];
    copy[1] = prefix.concat(operation[1]);
    return copy as unknown as Patch[number];
  });
}

function resolveBlueprint(input: BlueprintLike, id: string): FrontierBlueprint {
  if (isCompiledCatalog(input)) return input.getBlueprint(id);
  if (isBlueprintCatalog(input)) {
    const found = input.blueprints.find((blueprint) => blueprint.id === id);
    if (!found) throw new Error('unknown blueprint: ' + id);
    return found;
  }
  if (isBlueprint(input)) {
    if (input.id !== id) throw new Error('blueprint id mismatch: expected ' + id + ', got ' + input.id);
    return input;
  }
  const blueprint = createBlueprint(input);
  if (blueprint.id !== id) throw new Error('blueprint id mismatch: expected ' + id + ', got ' + blueprint.id);
  return blueprint;
}

function collectInheritedPaths(value: JsonValue, hidden: Set<string>, pointer = '', out: string[] = []): string[] {
  if (!hidden.has(pointer)) out.push(pointer);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) collectInheritedPaths(value[i], hidden, appendPointer(pointer, i), out);
  } else if (isPlainObject(value)) {
    for (const key of Object.keys(value)) collectInheritedPaths(value[key], hidden, appendPointer(pointer, key), out);
  }
  return out;
}

function appendPointer(base: string, key: string | number): string {
  return base + '/' + String(key).replace(/~/g, '~0').replace(/\//g, '~1');
}

function normalizeOverlay(input?: FrontierBlueprintOverlay): FrontierBlueprintOverlay {
  if (!input) return {};
  const out: FrontierBlueprintOverlay = {};
  for (const [key, value] of Object.entries(input)) out[pointerKey(key)] = cloneJson(value);
  return sortOverlay(out);
}

function sortOverlay(input: FrontierBlueprintOverlay): FrontierBlueprintOverlay {
  const out: FrontierBlueprintOverlay = {};
  for (const key of Object.keys(input).sort()) out[key] = cloneJson(input[key]);
  return out;
}

function normalizePathList(input?: readonly (string | JsonPath)[]): string[] {
  return uniqueStrings((input ?? []).map(pointerKey)).sort();
}

function normalizeTargetPath(path: string | JsonPath): JsonPath {
  return typeof path === 'string' ? pointerPath(path) : path.slice();
}

function pointerKey(path: string | JsonPath): string {
  return typeof path === 'string' ? stringifyPointer(pointerPath(path)) : stringifyPointer(path.slice());
}

function pointerPath(pointer: string): JsonPath {
  return cachedPointerPath(pointer).slice();
}

function cachedPointerPath(pointer: string): JsonPath {
  if (pointer === '') return [];
  const cached = blueprintPointerPathCache.get(pointer);
  if (cached) return cached;
  const path = parsePointer(pointer);
  if (blueprintPointerPathCache.size >= MAX_POINTER_PATH_CACHE_SIZE) blueprintPointerPathCache.clear();
  blueprintPointerPathCache.set(pointer, path);
  return path;
}

function cloneObject(value?: JsonObject): JsonObject {
  return value ? cloneJson(value) as JsonObject : {};
}

function toJsonObject(value: unknown): JsonObject | undefined {
  if (value === undefined) return undefined;
  const cloned = cloneJson(value as JsonValue);
  return isPlainObject(cloned) ? cloned : { value: cloned };
}

function uniqueStrings(values?: readonly string[]): string[] {
  return Array.from(new Set((values ?? []).filter((value): value is string => typeof value === 'string' && value.length > 0)));
}

function isCompiledCatalog(value: unknown): value is FrontierCompiledBlueprintCatalog {
  return isPlainObject(value) && value.kind === 'frontier.blueprint.compiled';
}

function isBlueprintCatalog(value: unknown): value is FrontierBlueprintCatalog {
  return isPlainObject(value) && value.kind === FRONTIER_BLUEPRINT_CATALOG_KIND;
}

function isBlueprint(value: unknown): value is FrontierBlueprint {
  return isPlainObject(value) && value.kind === FRONTIER_BLUEPRINT_KIND;
}

function isBlueprintInstance(value: unknown): value is FrontierBlueprintInstance {
  return isPlainObject(value) && value.kind === FRONTIER_BLUEPRINT_INSTANCE_KIND;
}

function isPlainObject(value: unknown): value is JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isContainer(value: unknown): value is JsonObject | JsonValue[] {
  return Array.isArray(value) || isPlainObject(value);
}

function toArrayIndex(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function isArrayLikePathKey(value: string | number): boolean {
  return typeof value === 'number' || /^(0|[1-9]\d*)$/.test(value);
}

function cloneInstance(instance: FrontierBlueprintInstance): FrontierBlueprintInstance {
  return {
    ...instance,
    params: cloneObject(instance.params),
    overrides: normalizeOverlay(instance.overrides),
    additions: normalizeOverlay(instance.additions),
    removals: instance.removals.slice(),
    idMap: { ...instance.idMap },
    tags: instance.tags.slice(),
    metadata: instance.metadata ? cloneObject(instance.metadata) : undefined
  };
}

function validateOverlayPointers(
  issues: FrontierBlueprintValidationIssue[],
  overlay: FrontierBlueprintOverlay,
  blueprintId: string,
  instanceId?: string
): void {
  for (const pointer of Object.keys(overlay)) {
    try {
      pointerPath(pointer);
    } catch {
      issues.push({ code: 'invalid-pointer', message: 'invalid overlay pointer: ' + pointer, severity: 'error', blueprintId, instanceId, path: pointer });
    }
  }
}

function validatePointerList(
  issues: FrontierBlueprintValidationIssue[],
  pointers: readonly string[],
  blueprintId: string,
  instanceId?: string
): void {
  for (const pointer of pointers) {
    try {
      pointerPath(pointer);
    } catch {
      issues.push({ code: 'invalid-pointer', message: 'invalid removal pointer: ' + pointer, severity: 'error', blueprintId, instanceId, path: pointer });
    }
  }
}

function hashStableJson(value: JsonValue): string {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return 'fnv1a32:' + hash.toString(16).padStart(8, '0');
}

function stableStringify(value: JsonValue): string {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (isPlainObject(value)) {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}
