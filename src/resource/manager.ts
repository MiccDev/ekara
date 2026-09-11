import { Pool } from "@/collections";
import type {
	Backends,
	EkaraBindings,
	EkaraBuffer,
	EkaraImage,
	EkaraPipeline,
	EkaraSampler,
	EkaraShader,
} from "@/types";
import type {
	Bindings,
	Buffer,
	Image,
	Pipeline,
	Sampler,
	Shader,
} from "./internals";

export class EkaraInternalResources<Backend extends Backends> {
	readonly buffers: Pool<Buffer<Backend>>;
	readonly images: Pool<Image<Backend>>;
	readonly samplers: Pool<Sampler<Backend>>;
	readonly shaders: Pool<Shader<Backend>>;
	readonly pipelines: Pool<Pipeline<Backend>>;
	readonly bindings: Pool<Bindings<Backend>>;

	constructor() {
		this.buffers = new Pool();
		this.images = new Pool();
		this.samplers = new Pool();
		this.shaders = new Pool();
		this.pipelines = new Pool();
		this.bindings = new Pool();
	}
}

export class EkaraResources {
	readonly buffers: Pool<EkaraBuffer>;
	readonly images: Pool<EkaraImage>;
	readonly samplers: Pool<EkaraSampler>;
	readonly shaders: Pool<EkaraShader>;
	readonly pipelines: Pool<EkaraPipeline>;
	readonly bindings: Pool<EkaraBindings>;

	constructor() {
		this.buffers = new Pool();
		this.images = new Pool();
		this.samplers = new Pool();
		this.shaders = new Pool();
		this.pipelines = new Pool();
		this.bindings = new Pool();
	}
}
