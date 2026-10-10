export function validId(value: unknown): boolean;
export function resolveProjectFile(root: string, relative: string): Promise<string>;
export function validateLayout(layout: unknown): unknown;
export function initializeProject(root: string, options?: {examples?: boolean}): Promise<{projectId:string}>;
export function createWorkspace(options: {root:string;config:unknown;allowWrites?:boolean}): Promise<{
  handle(request:Request,itemKey?:string):Promise<Response>;
  asset(relative:string):Promise<string>;
  load(itemKey:string):Promise<{revision:string|null;layout:unknown}>;
  save(itemKey:string,revision:string|null,layout:unknown):Promise<{revision:string;layout:unknown}>;
  metadata(refresh?:boolean):Promise<Record<string,{history:'git'|'no-git'|'no-head'|'unknown';lastCommit?:string;localChanges:boolean}>>;
  token:string;
  config:unknown;
}>;
