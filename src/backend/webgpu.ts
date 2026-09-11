import type {
	int,
	BufferDescriptor,
	EkaraBuffer,
	ImageDescriptor,
	EkaraImage,
	SamplerDescriptor,
	EkaraSampler,
	ShaderDescriptor,
	EkaraShader,
	PipelineDescriptor,
	EkaraPipeline,
	BindingsDescriptor,
	EkaraBindings,
	DataSource,
	PassAction,
	RenderPassDescriptor,
	ShaderStage,
} from "@/types";
import {
	CommonEkaraDevice,
	type CreateDeviceOptions,
	type EkaraDevice,
} from "../device";
import { check, checkNotNull } from "../errors";
import type { EkaraInternalResources, EkaraResources } from "../resource";

export class EkaraDeviceWebGPU
	extends CommonEkaraDevice<"webgpu">
	implements EkaraDevice<"webgpu">
{
	constructor(
		canvas: HTMLCanvasElement,
		device: GPUDevice,
		context: GPUCanvasContext,
		options: CreateDeviceOptions,
	) {
		super(canvas);
	}

	resize(width: int, height: int): void {
		throw new Error("Method not implemented.");
	}
	makeBuffer(desc: BufferDescriptor): EkaraBuffer {
		throw new Error("Method not implemented.");
	}
	makeImage<RenderTarget extends boolean>(
		desc: ImageDescriptor<RenderTarget>,
	): EkaraImage {
		throw new Error("Method not implemented.");
	}
	makeSampler(desc: SamplerDescriptor): EkaraSampler {
		throw new Error("Method not implemented.");
	}
	makeShader(desc: ShaderDescriptor): EkaraShader {
		throw new Error("Method not implemented.");
	}
	makePipeline(desc: PipelineDescriptor): EkaraPipeline {
		throw new Error("Method not implemented.");
	}
	makeBindings(desc: BindingsDescriptor): EkaraBindings {
		throw new Error("Method not implemented.");
	}
	updateBuffer(buffer: EkaraBuffer, data: DataSource, offset?: int): void {
		throw new Error("Method not implemented.");
	}
	updateImage(image: EkaraImage, data: DataSource): void {
		throw new Error("Method not implemented.");
	}
	beginDefaultPass(action: PassAction): void {
		throw new Error("Method not implemented.");
	}
	beginPass(desc: RenderPassDescriptor): void {
		throw new Error("Method not implemented.");
	}
	endPass(): void {
		throw new Error("Method not implemented.");
	}
	commit(): void {
		throw new Error("Method not implemented.");
	}
	applyPipeline(pipeline: EkaraPipeline): void {
		throw new Error("Method not implemented.");
	}
	applyBindings(bindings: EkaraBindings): void {
		throw new Error("Method not implemented.");
	}
	applyUniforms(stage: ShaderStage, slot: int, data: DataSource): void {
		throw new Error("Method not implemented.");
	}
	applyViewport(x: int, y: int, width: int, height: int): void {
		throw new Error("Method not implemented.");
	}
	applyScissor(x: int, y: int, width: int, height: int): void {
		throw new Error("Method not implemented.");
	}
	draw(baseElement: int, elementCount: int, instanceCount?: int): void {
		throw new Error("Method not implemented.");
	}
	destroyBuffer(buffer: EkaraBuffer): void {
		throw new Error("Method not implemented.");
	}
	destroyImage(image: EkaraImage): void {
		throw new Error("Method not implemented.");
	}
	destroySampler(sampler: EkaraSampler): void {
		throw new Error("Method not implemented.");
	}
	destroyShader(shader: EkaraShader): void {
		throw new Error("Method not implemented.");
	}
	destroyPipeline(pipeline: EkaraPipeline): void {
		throw new Error("Method not implemented.");
	}
	destroyBindings(bindings: EkaraBindings): void {
		throw new Error("Method not implemented.");
	}

	get canvas(): HTMLCanvasElement {
		return this._canvas;
	}

	get resources(): EkaraResources {
		return this._resources;
	}

	get internalResources(): EkaraInternalResources<"webgpu"> {
		return this._internalResources;
	}
}

export async function createWebGPUDevice(
	canvas: HTMLCanvasElement,
	options: CreateDeviceOptions,
): Promise<EkaraDeviceWebGPU> {
	check(
		!("gpu" in navigator) || !navigator.gpu,
		"WebGPU is not available in this browser.",
	);

	const adapter = checkNotNull(
		await navigator.gpu.requestAdapter(),
		"No suitable WebGPU adapter found.",
	);
	const device = await adapter.requestDevice();

	const context = checkNotNull(
		canvas.getContext("webgpu") as GPUCanvasContext,
		"Failed to get a WebGPU canvas context.",
	);

	return new EkaraDeviceWebGPU(canvas, device, context, options);
}
