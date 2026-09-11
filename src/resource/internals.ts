import type {
	Backends,
	CullMode,
	EkaraBuffer,
	EkaraImage,
	EkaraSampler,
	float,
	IfWebGPU,
	ImageBindingDescriptor,
	IndexFormat,
	int,
	PixelFormat,
	SamplerBindingDescriptor,
	ShaderAttributeDescriptor,
	UniformBlockDescriptor,
	VertexBufferLayout,
} from "@/types";

// TODO: WebGPU bindings.
export type Bindings<Backend extends Backends> = IfWebGPU<
	Backend,
	{
		vertexBuffers: EkaraBuffer[];
		indexBuffer?: EkaraBuffer;
		images: EkaraImage[];
		samplers: EkaraSampler[];
	},
	{ vaoCache: Map<int, WebGLVertexArrayObject> },
	{ textureBindGroupCache: Map<number, { groups: GPUBindGroup[] }> }
>;

export type Buffer<Backend extends Backends> = IfWebGPU<
	Backend,
	{
		type: "vertex" | "index" | "uniform";
		size: number;
	},
	{ target: int; usage: int; glBuffer: WebGLBuffer },
	{ gpuBuffer: GPUBuffer }
>;

export type Image<Backend extends Backends> = IfWebGPU<
	Backend,
	{
		width: int;
		height: int;
		format: PixelFormat;
		renderTarget: boolean;
	},
	{
		texture: WebGLTexture;
		internalFormat: int;
		glFormat: int;
		glType: int;
		isDepth: boolean;
	},
	{ texture: GPUTexture; view: GPUTextureView }
>;

export type Sampler<Backend extends Backends> = IfWebGPU<
	Backend,
	{},
	{ sampler: WebGLSampler },
	{ sampler: GPUSampler }
>;

// TODO: WebGPU bindings.
export type Shader<Backend extends Backends> = IfWebGPU<
	Backend,
	{},
	{
		program: WebGLProgram;
		attributes: ShaderAttributeDescriptor[];
		uniformBlocks: (UniformBlockDescriptor & { bindPoint: int })[];
		images: (ImageBindingDescriptor & { unit: int })[];
		samplers: SamplerBindingDescriptor[];
	},
	{
		module: GPUShaderModule;
	}
>;

export type Pipeline<Backend extends Backends> = IfWebGPU<
	Backend,
	{
		shaderId: int;
		indexFormat: IndexFormat;
	},
	{
		buffers: VertexBufferLayout[];
		primitiveType: int;
		cullMode: CullMode;
		frontFace: int;
		blend: ResolvedBlend;
		depth: ResolvedDepth;
	},
	{
		gpuPipeline: GPURenderPipeline;
	}
>;

export type ResolvedBlend = {
	enabled: boolean;
	srcRGB: int;
	dstRGB: int;
	opRGB: int;
	srcA: float;
	dstA: float;
	opA: float;
};

export type ResolvedDepth = {
	compare: int;
	writeEnabled: boolean;
};
