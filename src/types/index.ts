export * from "./primitives";
export * from "./resource";
export * from "./descriptor";
export * from "./types";

export type Backends = "webgl2" | "webgpu";

export type Nullable<T> = T | null;
export type Undefinable<T> = T | undefined;
export type TypeOr<T, Cond1, Cond2, IfTrue, IfFalse> = T extends Cond1
	? IfTrue
	: T extends Cond2
		? IfTrue
		: IfFalse;
