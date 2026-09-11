import type { int, long } from "./primitives";
import type {
	EkaraBuffer,
	EkaraImage,
	EkaraSampler,
	EkaraShader,
} from "./resource";
import type {
	BlendFactor,
	BlendOp,
	BufferType,
	CompareFunc,
	CullMode,
	DataSource,
	FaceWinding,
	FilterMode,
	IndexFormat,
	PixelFormat,
	PrimitiveType,
	ShaderStage,
	StepMode,
	Usage,
	VertexFormat,
	WrapMode,
} from "./types";

export type BufferDescriptor = (
	| {
			/** Byte size. Required unless `data` is given (size is then inferred). */
			size: int;
			data?: never;
	  }
	| {
			data: DataSource;
			size?: never;
	  }
) & {
	type?: BufferType; // default 'vertex'
	usage?: Usage; // default 'immutable' if `data` given, else 'dynamic'
};

export type ImageDescriptor<RenderTarget extends boolean = false> = {
	width: number;
	height: number;
	format?: PixelFormat; // default 'rgba8unorm'
	usage?: Usage; // default 'immutable'
	renderTarget?: RenderTarget; // usable as a color/depth-stencil attachment
} & (RenderTarget extends true
	? {}
	: {
			data?: DataSource; // initial pixel data (ignored for pure render targets)
		});

export type SamplerDescriptor = {
	minFilter?: FilterMode; // default 'nearest'
	magFilter?: FilterMode; // default 'nearest'
	wrapU?: WrapMode; // default 'clamp-to-edge'
	wrapV?: WrapMode; // default 'clamp-to-edge'
};

export type ShaderDescriptor = {
	attributes: ShaderAttributeDescriptor[];
	uniformBlocks?: UniformBlockDescriptor[];
	images?: ImageBindingDescriptor[];
	samplers?: SamplerBindingDescriptor[];
	code: { vertex: string; fragment: string };
};

export type VertexAttribute = {
	location: int;
	format: VertexFormat;
	offset: long;
};

export type VertexBufferLayout = {
	stride: long;
	stepMode?: StepMode;
	attributes: VertexAttribute[];
};

export type ShaderAttributeDescriptor = {
	name: string;
	location: int;
};

export type UniformBlockDescriptor = {
	stage: ShaderStage;
	slot: int;
	size: int;
	name: string;
};

export type ImageBindingDescriptor = {
	stage: ShaderStage;
	slot: int;
	name: string;
};

export type SamplerBindingDescriptor = {
	stage: ShaderStage;
	slot: int;
	name: string;
};

export type BlendState = {
	enabled?: boolean;
	srcFactorRGB?: BlendFactor;
	dstFactorRGB?: BlendFactor;
	opRGB?: BlendOp;
	srcFactorAlpha?: BlendFactor;
	dstFactorAlpha?: BlendFactor;
	opAlpha?: BlendOp;
};

export type DepthState = {
	compare?: CompareFunc; // default 'always'
	writeEnabled?: boolean; // default false
};

export type PipelineDescriptor = {
	shader: EkaraShader;
	buffers: VertexBufferLayout[];
	primitiveType?: PrimitiveType; // default 'triangle-list'
	indexFormat?: IndexFormat; // default 'none'
	cullMode?: CullMode; // default 'none'
	faceWinding?: FaceWinding; // default 'ccw'
	colorFormat?: PixelFormat; // default: swapchain/canvas format
	blend?: BlendState;
	depth?: DepthState;
	sampleCount?: number; // default 1
};

export type BindingsDescriptor = {
	vertexBuffers: EkaraBuffer[];
	indexBuffer?: EkaraBuffer;
	images?: EkaraImage[];
	samplers?: EkaraSampler[];
};

export type ColorAttachmentAction = {
	/** RGBA in [0,1]. Omit + set `load: true` to preserve existing contents. */
	clear?: [number, number, number, number];
	load?: boolean;
};

export type DepthAttachmentAction = {
	clearValue?: number; // default 1.0
	load?: boolean;
};

export type PassAction = {
	colors?: (ColorAttachmentAction | undefined)[];
	depth?: DepthAttachmentAction;
};

export type RenderPassDescriptor = {
	/** Omit for the default (swapchain) pass. */
	colorAttachments?: EkaraImage[];
	depthStencilAttachment?: EkaraImage;
	action?: PassAction;
	label?: string;
};
