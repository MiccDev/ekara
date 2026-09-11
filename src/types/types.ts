import type { Backends } from ".";

export type TypeError<Message extends string> = { message: Message } & never;

export type IfWebGPU<
	Backend extends Backends,
	Shared,
	GLSpecific,
	GPUSpecific,
> = Shared & (Backend extends "webgpu" ? GPUSpecific : GLSpecific);

export type DataSource = ArrayBufferView | ArrayBuffer;

export type BufferType = "vertex" | "index" | "uniform";
export type Usage = "immutable" | "dynamic" | "stream";

export type PixelFormat =
	| "rgba8unorm"
	| "bgra8unorm"
	| "rgba16float"
	| "rgba32float"
	| "depth24plus"
	| "depth24plus-stencil8"
	| "depth32float";

export type VertexFormat =
	| "float32"
	| "float32x2"
	| "float32x3"
	| "float32x4"
	| "uint8x4"
	| "unorm8x4"
	| "sint16x2"
	| "snorm16x2";

export type PrimitiveType =
	| "triangle-list"
	| "triangle-strip"
	| "line-list"
	| "line-strip"
	| "point-list";

export type IndexFormat = "none" | "uint16" | "uint32";
export type FaceWinding = "ccw" | "cw";
export type StepMode = "vertex" | "instance";
export type ShaderStage = "vertex" | "fragment";
export type CullMode = "none" | "front" | "back";
export type FilterMode = "nearest" | "linear";
export type WrapMode = "repeat" | "clamp-to-edge" | "mirror-repeat";

export type CompareFunc =
	| "never"
	| "less"
	| "equal"
	| "less-equal"
	| "greater"
	| "not-equal"
	| "greater-equal"
	| "always";

export type BlendFactor =
	| "zero"
	| "one"
	| "src"
	| "one-minus-src"
	| "src-alpha"
	| "one-minus-src-alpha"
	| "dst"
	| "one-minus-dst"
	| "dst-alpha"
	| "one-minus-dst-alpha";

export type BlendOp = "add" | "subtract" | "reverse-subtract" | "min" | "max";
