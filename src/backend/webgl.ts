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
	UniformBlockDescriptor,
	ImageBindingDescriptor,
	Nullable,
} from "@/types";
import {
	CommonEkaraDevice,
	type CreateDeviceOptions,
	type EkaraDevice,
} from "../device";
import { check, checkNotNull, EkaraError } from "../errors";
import type {
	Bindings,
	EkaraInternalResources,
	EkaraResources,
	Pipeline,
} from "../resource";

import * as glUtils from "./glUtils";

export class EkaraDeviceWebGL
	extends CommonEkaraDevice<"webgl2">
	implements EkaraDevice<"webgl2">
{
	private _gl: WebGL2RenderingContext;

	private _currentPipeline: Nullable<{
		rec: Pipeline<"webgl2">;
		handle: EkaraPipeline;
	}> = null;

	private _currentDrawBufferCount: int = 1;

	private readonly _fboCache: Map<string, WebGLFramebuffer>;
	private readonly _uboCache = new WeakMap<
		object,
		{ glBuffer: WebGLBuffer; size: number }
	>();

	constructor(canvas: HTMLCanvasElement, options: CreateDeviceOptions) {
		super(canvas);

		this._gl = checkNotNull(
			canvas.getContext("webgl2", {
				antialias: options.antialias ?? true,
				depth: true,
				stencil: false,
				alpha: true,
			}),
			"WebGL2 is not available in this browser.",
		);

		this._fboCache = new Map();
	}

	resize(width: int, height: int): void {
		this.canvas.width = width;
		this.canvas.height = height;
	}

	makeBuffer(desc: BufferDescriptor): EkaraBuffer {
		const gl = this._gl;

		const type = desc.type ?? "vertex";
		const target =
			type === "index"
				? gl.ELEMENT_ARRAY_BUFFER
				: type === "uniform"
					? gl.UNIFORM_BUFFER
					: gl.ARRAY_BUFFER;

		const usage = desc.usage ?? (desc.data ? "immutable" : "dynamic");
		const glUsage =
			usage === "immutable"
				? gl.STATIC_DRAW
				: usage === "stream"
					? gl.STREAM_DRAW
					: gl.DYNAMIC_DRAW;

		const size = desc.data ? desc.data.byteLength : (desc.size ?? 0);
		check(size < 0, "makeBuffer: need 'size' or 'data'.");

		const glBuffer = gl.createBuffer();
		gl.bindBuffer(target, glBuffer);
		if (desc.data) {
			gl.bufferData(target, desc.data, glUsage);
		} else {
			gl.bufferData(target, size, glUsage);
		}
		gl.bindBuffer(target, null);

		const id = this.internalResources.buffers.add({
			glBuffer,
			target,
			type,
			size,
			usage: glUsage,
		});

		const buffer = { id, type, size };
		this.resources.buffers.add(buffer);
		return buffer;
	}

	makeImage<RenderTarget extends boolean = false>(
		desc: ImageDescriptor<RenderTarget>,
	): EkaraImage {
		const gl = this._gl;

		const descriptor = desc as ImageDescriptor<false>;

		const format = descriptor.format ?? "rgba8unorm";
		const info = glUtils.pixelFormatInfo(gl, format);
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.texStorage2D(
			gl.TEXTURE_2D,
			1,
			info.internalFormat,
			descriptor.width,
			descriptor.height,
		);
		if (descriptor.data && !info.isDepth) {
			gl.texSubImage2D(
				gl.TEXTURE_2D,
				0,
				0,
				0,
				desc.width,
				desc.height,
				info.glFormat,
				info.glType,
				descriptor.data as any,
			);
		}
		gl.bindTexture(gl.TEXTURE_2D, null);

		const id = this._internalResources.images.add({
			texture,
			width: descriptor.width,
			height: descriptor.height,
			format,
			renderTarget: descriptor.renderTarget ?? false,
			internalFormat: info.internalFormat,
			glFormat: info.glFormat,
			glType: info.glType,
			isDepth: info.isDepth,
		});

		const image: EkaraImage = {
			id,
			width: desc.width,
			height: desc.height,
			format,
			renderTarget: desc.renderTarget ?? false,
		};
		this._resources.images.add(image);
		return image;
	}

	makeSampler(desc: SamplerDescriptor): EkaraSampler {
		const gl = this._gl;
		const sampler = gl.createSampler();
		gl.samplerParameteri(
			sampler,
			gl.TEXTURE_MIN_FILTER,
			glUtils.filter(gl, desc.minFilter ?? "nearest"),
		);
		gl.samplerParameteri(
			sampler,
			gl.TEXTURE_MAG_FILTER,
			glUtils.filter(gl, desc.magFilter ?? "nearest"),
		);
		gl.samplerParameteri(
			sampler,
			gl.TEXTURE_WRAP_S,
			glUtils.wrap(gl, desc.wrapU ?? "clamp-to-edge"),
		);
		gl.samplerParameteri(
			sampler,
			gl.TEXTURE_WRAP_T,
			glUtils.wrap(gl, desc.wrapV ?? "clamp-to-edge"),
		);
		const id = this.internalResources.samplers.add({ sampler });

		const ekaraSampler: EkaraSampler = { id };
		this.resources.samplers.add(ekaraSampler);
		return ekaraSampler;
	}

	makeShader(desc: ShaderDescriptor): EkaraShader {
		const gl = this._gl;

		const vs = this._compileShader(gl.VERTEX_SHADER, desc.code.vertex);
		const fs = this._compileShader(gl.FRAGMENT_SHADER, desc.code.fragment);

		const program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);

		for (const attr of desc.attributes)
			gl.bindAttribLocation(program, attr.location, attr.name);

		gl.linkProgram(program);
		gl.deleteShader(vs);
		gl.deleteShader(fs);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const log = gl.getProgramInfoLog(program);
			gl.deleteProgram(program);
			throw new EkaraError(`Program link error:\n${log}`);
		}

		// Wire uniform blocks to their fixed binding points (see UBO_BASE above).
		const uniformBlocks: (UniformBlockDescriptor & { bindPoint: int })[] =
			[];

		let nextUboBindPoint = 0;
		for (const ub of desc.uniformBlocks ?? []) {
			const blockIndex = gl.getUniformBlockIndex(program, ub.name);
			if (blockIndex === gl.INVALID_INDEX) {
				console.warn(
					`[Ekara Error] uniform block "${ub.name}" not found (or optimized out) in shader`,
				);
				continue;
			}

			const bindPoint = nextUboBindPoint++;
			gl.uniformBlockBinding(program, blockIndex, bindPoint);
			uniformBlocks.push({ ...ub, bindPoint });
		}

		// Wire sampler uniforms to their fixed texture units (see TEX_BASE above).
		const images: (ImageBindingDescriptor & { unit: int })[] = [];
		let nextTextUnit = 0;
		gl.useProgram(program);
		for (const im of desc.images ?? []) {
			const loc = gl.getUniformLocation(program, im.name);
			const unit = nextTextUnit++;
			if (loc) gl.uniform1i(loc, unit);
			images.push({ ...im, unit });
		}
		gl.useProgram(null);

		const id = this.internalResources.shaders.add({
			program,
			attributes: desc.attributes,
			uniformBlocks,
			images,
			samplers: desc.samplers ?? [],
		});
		const ekaraShader: EkaraShader = { id };

		this.resources.shaders.add(ekaraShader);
		return ekaraShader;
	}

	makePipeline(desc: PipelineDescriptor): EkaraPipeline {
		const gl = this._gl;

		if (!this.internalResources.shaders.has(desc.shader.id))
			throw new EkaraError(
				`Shader (id=${desc.shader.id}) has been destroyed or does not exist.`,
			);

		const rec: Pipeline<"webgl2"> = {
			shaderId: desc.shader.id,
			buffers: desc.buffers,
			primitiveType: glUtils.primitive(
				gl,
				desc.primitiveType ?? "triangle-list",
			),
			indexFormat: desc.indexFormat ?? "none",
			cullMode: desc.cullMode ?? "none",
			frontFace: (desc.faceWinding ?? "ccw") === "ccw" ? gl.CCW : gl.CW,
			blend: glUtils.resolveBlend(gl, desc.blend),
			depth: glUtils.resolveDepth(gl, desc.depth),
		};

		const id = this.internalResources.pipelines.add(rec);
		const pipeline: EkaraPipeline = { id };

		this.resources.pipelines.add(pipeline);
		return pipeline;
	}

	makeBindings(desc: BindingsDescriptor): EkaraBindings {
		const rec: Bindings<"webgl2"> = {
			vertexBuffers: desc.vertexBuffers,
			indexBuffer: desc.indexBuffer,
			images: desc.images ?? [],
			samplers: desc.samplers ?? [],
			vaoCache: new Map(),
		};
		const id = this.internalResources.bindings.add(rec);

		const ekaraBindings: EkaraBindings = { id };
		this.resources.bindings.add(ekaraBindings);
		return ekaraBindings;
	}

	updateBuffer(buffer: EkaraBuffer, data: DataSource, offset: int = 0): void {
		const gl = this._gl;

		const buf = this.internalResources.buffers.get(buffer.id);
		const byteLength = data.byteLength;
		if (offset + byteLength > buf.size) {
			// WebGL fails this silently (a GL_INVALID_VALUE you'd only see via
			// gl.getError()) — surface it as a real error instead, since a
			// buffer that's outgrown its allocated size is a very common bug
			// source (e.g. dynamic meshes whose vertex/index count changes).
			throw new EkaraError(
				`updateBuffer: data (${byteLength} bytes at offset ${offset}) ` +
					`doesn't fit in buffer (${buf.size} bytes). The buffer must be created ` +
					`with enough \`size\` up front for its largest expected contents.`,
			);
		}

		gl.bindBuffer(buf.target, buf.glBuffer);
		gl.bufferSubData(buf.target, offset, data);
	}

	updateImage(image: EkaraImage, data: DataSource): void {
		const gl = this._gl;
		const rec = this.internalResources.images.get(image.id);
		gl.bindTexture(gl.TEXTURE_2D, rec.texture);
		gl.texSubImage2D(
			gl.TEXTURE_2D,
			0,
			0,
			0,
			rec.width,
			rec.height,
			rec.glFormat,
			rec.glType,
			data as any,
		);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	beginDefaultPass(action: PassAction): void {
		const gl = this._gl;

		this._currentDrawBufferCount = 1;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		this._applyPassAction(action, 1);
	}

	beginPass(desc: RenderPassDescriptor): void {
		const gl = this._gl;
		if (!desc.colorAttachments || desc.colorAttachments.length === 0) {
			this.beginDefaultPass(desc.action ?? {});
			return;
		}
		const fbo = this._getOrCreateFbo(
			desc.colorAttachments,
			desc.depthStencilAttachment,
		);
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		this._currentDrawBufferCount = desc.colorAttachments.length;
		const first = this.internalResources.images.get(
			desc.colorAttachments[0].id,
		);
		gl.viewport(0, 0, first.width, first.height);
		this._applyPassAction(desc.action ?? {}, this._currentDrawBufferCount);
	}

	endPass(): void {}

	commit(): void {
		this._gl.flush();
	}

	applyPipeline(pipeline: EkaraPipeline): void {
		const gl = this._gl;
		const rec = this.internalResources.pipelines.get(pipeline.id);
		this._currentPipeline = { rec, handle: pipeline };
		gl.useProgram(this.internalResources.shaders.get(rec.shaderId).program);

		if (rec.cullMode === "none") gl.disable(gl.CULL_FACE);
		else {
			gl.enable(gl.CULL_FACE);
			gl.cullFace(rec.cullMode === "front" ? gl.FRONT : gl.BACK);
		}
		gl.frontFace(rec.frontFace);

		if (rec.blend.enabled) {
			gl.enable(gl.BLEND);
			gl.blendEquationSeparate(rec.blend.opRGB, rec.blend.opA);
			gl.blendFuncSeparate(
				rec.blend.srcRGB,
				rec.blend.dstRGB,
				rec.blend.srcA,
				rec.blend.dstA,
			);
		} else {
			gl.disable(gl.BLEND);
		}

		if (rec.depth.compare === gl.ALWAYS && !rec.depth.writeEnabled) {
			gl.disable(gl.DEPTH_TEST);
		} else {
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(rec.depth.compare);
		}
		gl.depthMask(rec.depth.writeEnabled);
	}

	applyBindings(bindings: EkaraBindings): void {
		const gl = this._gl;
		checkNotNull(
			this._currentPipeline,
			"applyBindings called before applyPipeline",
		);
		const rec = this.internalResources.bindings.get(bindings.id);
		// this._currentBindings = { rec, handle: bindings };

		let vao = rec.vaoCache.get(this._currentPipeline!.handle.id);
		if (!vao) {
			vao = this._buildVao(this._currentPipeline!.rec, rec);
			rec.vaoCache.set(this._currentPipeline!.handle.id, vao);
		}
		gl.bindVertexArray(vao);

		const shaderRec = this.internalResources.shaders.get(
			this._currentPipeline!.rec.shaderId,
		);
		for (const im of shaderRec.images) {
			const gpuImage = rec.images[im.slot];
			const gpuSampler = rec.samplers[im.slot];
			gl.activeTexture(gl.TEXTURE0 + im.unit);
			gl.bindTexture(
				gl.TEXTURE_2D,
				this.internalResources.images.get(gpuImage.id).texture,
			);
			gl.bindSampler(
				im.unit,
				gpuSampler
					? this.internalResources.samplers.get(gpuSampler.id).sampler
					: null,
			);
		}
	}

	applyUniforms(stage: ShaderStage, slot: int, data: DataSource): void {
		const gl = this._gl;
		checkNotNull(
			this._currentPipeline,
			"applyUniforms called before applyPipeline",
		);
		const shaderRec = this.internalResources.shaders.get(
			this._currentPipeline!.rec.shaderId,
		);
		const block = shaderRec.uniformBlocks.find(
			(b) => b.stage === stage && b.slot === slot,
		);
		checkNotNull(
			block,
			`No uniform block declared for (${stage}, slot ${slot}) on this shader`,
		);

		let ubo = this._uboCache.get(block!);
		if (!ubo || ubo.size < block!.size) {
			if (ubo) gl.deleteBuffer(ubo.glBuffer);
			const glBuffer = gl.createBuffer()!;
			gl.bindBuffer(gl.UNIFORM_BUFFER, glBuffer);
			gl.bufferData(gl.UNIFORM_BUFFER, block!.size, gl.DYNAMIC_DRAW);
			ubo = { glBuffer, size: block!.size };
			this._uboCache.set(block!, ubo);
		}

		gl.bindBuffer(gl.UNIFORM_BUFFER, ubo.glBuffer);
		gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
		gl.bindBufferBase(gl.UNIFORM_BUFFER, block!.bindPoint, ubo.glBuffer);
	}

	applyViewport(x: int, y: int, width: int, height: int): void {
		this._gl.viewport(x, y, width, height);
	}

	applyScissor(x: int, y: int, width: int, height: int): void {
		this._gl.enable(this._gl.SCISSOR_TEST);
		this._gl.scissor(x, y, width, height);
	}

	draw(baseElement: int, elementCount: int, instanceCount: int = 0): void {
		const gl = this._gl;
		checkNotNull(this._currentPipeline, "draw called before applyPipeline");
		const rec = this._currentPipeline!.rec;
		const useIndices = rec.indexFormat !== "none";
		const indexGlType =
			rec.indexFormat === "uint32" ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
		const indexByteSize = rec.indexFormat === "uint32" ? 4 : 2;

		if (useIndices) {
			if (instanceCount > 1) {
				gl.drawElementsInstanced(
					rec.primitiveType,
					elementCount,
					indexGlType,
					baseElement * indexByteSize,
					instanceCount,
				);
			} else {
				gl.drawElements(
					rec.primitiveType,
					elementCount,
					indexGlType,
					baseElement * indexByteSize,
				);
			}
		} else {
			if (instanceCount > 1) {
				gl.drawArraysInstanced(
					rec.primitiveType,
					baseElement,
					elementCount,
					instanceCount,
				);
			} else {
				gl.drawArrays(rec.primitiveType, baseElement, elementCount);
			}
		}
	}

	destroyBuffer(buffer: EkaraBuffer): void {
		this._gl.deleteProgram(
			this.internalResources.buffers.get(buffer.id).glBuffer,
		);
		this.internalResources.buffers.remove(buffer.id);
		this.resources.buffers.remove(buffer.id);
	}

	destroyImage(image: EkaraImage): void {
		this._gl.deleteTexture(
			this.internalResources.images.get(image.id).texture,
		);
		this.internalResources.images.remove(image.id);
		this.resources.images.remove(image.id);
	}

	destroySampler(sampler: EkaraSampler): void {
		this._gl.deleteSampler(
			this.internalResources.samplers.get(sampler.id).sampler,
		);
		this.internalResources.samplers.remove(sampler.id);
		this.resources.samplers.remove(sampler.id);
	}

	destroyShader(shader: EkaraShader): void {
		this._gl.deleteTexture(
			this.internalResources.shaders.get(shader.id).program,
		);
		this.internalResources.shaders.remove(shader.id);
		this.resources.shaders.remove(shader.id);
	}

	destroyPipeline(pipeline: EkaraPipeline): void {
		this.internalResources.pipelines.remove(pipeline.id);
		this.resources.pipelines.remove(pipeline.id);
	}

	destroyBindings(bindings: EkaraBindings): void {
		this.internalResources.bindings.remove(bindings.id);
		this.resources.bindings.remove(bindings.id);
	}

	get canvas(): HTMLCanvasElement {
		return this._canvas;
	}

	get resources(): EkaraResources {
		return this._resources;
	}

	get internalResources(): EkaraInternalResources<"webgl2"> {
		return this._internalResources;
	}

	private _fboKey(color: EkaraImage[], depth?: EkaraImage): string {
		return (
			color.map((c) => c.id).join(",") + "|" + (depth ? depth.id : "-")
		);
	}

	private _getOrCreateFbo(
		color: EkaraImage[],
		depth?: EkaraImage,
	): WebGLFramebuffer {
		const gl = this._gl;
		const key = this._fboKey(color, depth);
		let fbo = this._fboCache.get(key);
		if (fbo) return fbo;
		fbo = gl!.createFramebuffer()!;
		gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
		const drawBuffers: number[] = [];
		color.forEach((img, i) => {
			const rec = this.internalResources.images.get(img.id);
			gl!.framebufferTexture2D(
				gl!.FRAMEBUFFER,
				gl!.COLOR_ATTACHMENT0 + i,
				gl!.TEXTURE_2D,
				rec.texture,
				0,
			);
			drawBuffers.push(gl!.COLOR_ATTACHMENT0 + i);
		});
		if (depth) {
			const rec = this.internalResources.images.get(depth.id);
			const attachment =
				rec.format === "depth24plus-stencil8"
					? gl!.DEPTH_STENCIL_ATTACHMENT
					: gl!.DEPTH_ATTACHMENT;
			gl!.framebufferTexture2D(
				gl!.FRAMEBUFFER,
				attachment,
				gl!.TEXTURE_2D,
				rec.texture,
				0,
			);
		}
		gl!.drawBuffers(drawBuffers);
		const status = gl!.checkFramebufferStatus(gl!.FRAMEBUFFER);
		check(
			status !== gl!.FRAMEBUFFER_COMPLETE,
			`Incomplete framebuffer (status=0x${status.toString(16)})`,
		);

		gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
		this._fboCache.set(key, fbo);
		return fbo;
	}

	private _buildVao(
		pipeline: Pipeline<"webgl2">,
		bindings: Bindings<"webgl2">,
	): WebGLVertexArrayObject {
		const gl = this._gl;
		const vao = gl.createVertexArray()!;
		gl.bindVertexArray(vao);
		pipeline.buffers.forEach((layout, bufferIndex) => {
			const buf = this.internalResources.buffers.get(
				bindings.vertexBuffers[bufferIndex].id,
			);
			gl.bindBuffer(gl.ARRAY_BUFFER, buf.glBuffer);
			for (const attr of layout.attributes) {
				const info = glUtils.vertexFormatInfo(gl, attr.format);
				gl.enableVertexAttribArray(attr.location);
				gl.vertexAttribPointer(
					attr.location,
					info.count,
					info.glType,
					info.normalized,
					layout.stride,
					attr.offset,
				);
				gl.vertexAttribDivisor(
					attr.location,
					layout.stepMode === "instance" ? 1 : 0,
				);
			}
		});
		if (bindings.indexBuffer) {
			gl.bindBuffer(
				gl.ELEMENT_ARRAY_BUFFER,
				this.internalResources.buffers.get(bindings.indexBuffer.id)
					.glBuffer,
			);
		}
		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		return vao;
	}

	private _compileShader(type: int, src: string): WebGLShader {
		const gl = this._gl;
		const shader = gl.createShader(type)!;
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const log = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw new EkaraError(`Shader compile error:\n${log}\n---\n${src}`);
		}
		return shader;
	}

	private _applyPassAction(action: PassAction, colorCount: number) {
		const gl = this._gl;
		gl.depthMask(true);
		let clearMask = 0;

		const colors = action.colors ?? [];
		const allSameOrDefault = colors.length <= 1;
		if (allSameOrDefault) {
			const c = colors[0];
			if (!c || c.clear) {
				const [r, g, b, a] = c?.clear ?? [0, 0, 0, 1];
				gl.clearColor(r, g, b, a);
				clearMask |= gl.COLOR_BUFFER_BIT;
			}
		} else {
			for (let i = 0; i < colorCount; i++) {
				const c = colors[i];
				if (!c || c.clear) {
					const [r, g, b, a] = c?.clear ?? [0, 0, 0, 1];
					gl.clearBufferfv(gl.COLOR, i, [r, g, b, a]);
				}
			}
		}
		if (
			!action.depth ||
			action.depth.clearValue !== undefined ||
			!action.depth.load
		) {
			gl.clearDepth(action.depth?.clearValue ?? 1.0);
			clearMask |= gl.DEPTH_BUFFER_BIT;
		}
		if (clearMask) gl.clear(clearMask);
	}
}
