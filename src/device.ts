import { createWebGPUDevice, EkaraDeviceWebGL } from "./backend";
import { EkaraError } from "./errors";
import { EkaraInternalResources, EkaraResources } from "./resource";
import type {
	Backends,
	BindingsDescriptor,
	BufferDescriptor,
	DataSource,
	EkaraBindings,
	EkaraBuffer,
	EkaraImage,
	EkaraPipeline,
	EkaraSampler,
	EkaraShader,
	IfWebGPU,
	ImageDescriptor,
	int,
	long,
	PassAction,
	PipelineDescriptor,
	PixelFormat,
	RenderPassDescriptor,
	SamplerDescriptor,
	ShaderDescriptor,
	ShaderStage,
} from "./types";

export class CommonEkaraDevice<Backend extends Backends> {
	protected _canvas: HTMLCanvasElement;
	protected _internalResources: EkaraInternalResources<Backend>;
	protected _resources: EkaraResources;

	constructor(canvas: HTMLCanvasElement) {
		this._canvas = canvas;
		this._internalResources = new EkaraInternalResources();
		this._resources = new EkaraResources();
	}
}

export interface EkaraDevice<Backend extends Backends> {
	get canvas(): HTMLCanvasElement;
	get resources(): EkaraResources;
	get internalResources(): EkaraInternalResources<Backend>;

	resize(width: int, height: int): void;

	makeBuffer(desc: BufferDescriptor): EkaraBuffer;
	makeImage<RenderTarget extends boolean>(
		desc: ImageDescriptor<RenderTarget>,
	): EkaraImage;
	makeSampler(desc: SamplerDescriptor): EkaraSampler;
	makeShader(desc: ShaderDescriptor): EkaraShader;
	makePipeline(desc: PipelineDescriptor): EkaraPipeline;
	makeBindings(desc: BindingsDescriptor): EkaraBindings;

	/** Upload new contents into a `dynamic`/`stream` buffer. */
	updateBuffer(buffer: EkaraBuffer, data: DataSource, offset?: int): void;
	/** Upload new pixel contents into an image (tightly packed, top-to-bottom). */
	updateImage(image: EkaraImage, data: DataSource): void;

	/** Begin rendering into the canvas/swapchain. */
	beginDefaultPass(action: PassAction): void;
	/** Begin rendering into one or more offscreen images. */
	beginPass(desc: RenderPassDescriptor): void;
	endPass(): void;
	/** Submit all work recorded since the last commit(). Call once per frame. */
	commit(): void;

	applyPipeline(pipeline: EkaraPipeline): void;
	applyBindings(bindings: EkaraBindings): void;
	/** Upload a uniform block's bytes for the block declared at (stage, slot). */
	applyUniforms(stage: ShaderStage, slot: int, data: DataSource): void;
	applyViewport(x: int, y: int, width: int, height: int): void;
	applyScissor(x: int, y: int, width: int, height: int): void;

	draw(baseElement: int, elementCount: int, instanceCount?: int): void;

	destroyBuffer(buffer: EkaraBuffer): void;
	destroyImage(image: EkaraImage): void;
	destroySampler(sampler: EkaraSampler): void;
	destroyShader(shader: EkaraShader): void;
	destroyPipeline(pipeline: EkaraPipeline): void;
	destroyBindings(bindings: EkaraBindings): void;
}

type BackendsOrAuto = Backends | "auto";
type GetTrueBackend<T extends BackendsOrAuto> = T extends "auto"
	? "webgpu"
	: "webgl2";

export type CreateDeviceOptions<Backend extends BackendsOrAuto = "auto"> =
	IfWebGPU<
		GetTrueBackend<Backend>,
		{
			backend?: Backend;
			antialias?: boolean;
			depthFormat?: PixelFormat;
		},
		{},
		{ uniformArenaSize?: long }
	>;

async function checkWebGPU(): Promise<boolean> {
	if (!navigator.gpu) {
		return false;
	}

	try {
		const adapter = await navigator.gpu.requestAdapter();
		if (adapter) {
			return true;
		} else {
			return false;
		}
	} catch (error) {
		return false;
	}
}

export async function createEkaraDevice<Backend extends BackendsOrAuto>(
	canvas: HTMLCanvasElement,
	options: CreateDeviceOptions<Backend> = {},
): Promise<EkaraDevice<GetTrueBackend<Backend>>> {
	const isGPUSupported = await checkWebGPU();
	const { backend, ...opts } = options;

	type TargetDevice = EkaraDevice<GetTrueBackend<Backend>>;

	if (backend === "auto" || backend === "webgpu") {
		if (isGPUSupported) {
			try {
				return (await createWebGPUDevice(canvas, opts)) as TargetDevice;
			} catch (err) {
				if (backend === "webgpu") throw err;
				console.warn(
					`[Ekara] WebGPU initialization failed, failling back to WebGL2:`,
					err,
				);
			}
		} else if (backend === "webgpu") {
			throw new EkaraError("WebGPU is not available in this browser.");
		}
	}

	return new EkaraDeviceWebGL(canvas, opts) as TargetDevice;
}
