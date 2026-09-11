import type { ResolvedBlend, ResolvedDepth } from "@/resource";
import type {
	BlendFactor,
	BlendOp,
	BlendState,
	CompareFunc,
	DepthState,
	FilterMode,
	int,
	PixelFormat,
	PrimitiveType,
	VertexFormat,
	WrapMode,
} from "@/types";

type GL = WebGL2RenderingContext;

type PixelFormatInfo = {
	internalFormat: int;
	glFormat: int;
	glType: int;
	isDepth: boolean;
};

type VertexFormatInfo = {
	count: int;
	glType: int;
	normalized: boolean;
};

export function vertexFormatInfo(
	gl: WebGL2RenderingContext,
	format: VertexFormat,
): VertexFormatInfo {
	switch (format) {
		case "float32":
			return { count: 1, glType: gl.FLOAT, normalized: false };
		case "float32x2":
			return { count: 2, glType: gl.FLOAT, normalized: false };
		case "float32x3":
			return { count: 3, glType: gl.FLOAT, normalized: false };
		case "float32x4":
			return { count: 4, glType: gl.FLOAT, normalized: false };
		case "uint8x4":
			return { count: 4, glType: gl.UNSIGNED_BYTE, normalized: false };
		case "unorm8x4":
			return { count: 4, glType: gl.UNSIGNED_BYTE, normalized: true };
		case "sint16x2":
			return { count: 2, glType: gl.SHORT, normalized: false };
		case "snorm16x2":
			return { count: 2, glType: gl.SHORT, normalized: true };
	}
}

export function pixelFormatInfo(gl: GL, format: PixelFormat): PixelFormatInfo {
	switch (format) {
		case "rgba8unorm":
		case "bgra8unorm": // WebGL2 has no native BGRA; treated as RGBA (byte order left to caller)
			return {
				internalFormat: gl.RGBA8,
				glFormat: gl.RGBA,
				glType: gl.UNSIGNED_BYTE,
				isDepth: false,
			};
		case "rgba16float":
			return {
				internalFormat: gl.RGBA16F,
				glFormat: gl.RGBA,
				glType: gl.HALF_FLOAT,
				isDepth: false,
			};
		case "rgba32float":
			return {
				internalFormat: gl.RGBA32F,
				glFormat: gl.RGBA,
				glType: gl.FLOAT,
				isDepth: false,
			};
		case "depth24plus":
			return {
				internalFormat: gl.DEPTH_COMPONENT24,
				glFormat: gl.DEPTH_COMPONENT,
				glType: gl.UNSIGNED_INT,
				isDepth: true,
			};
		case "depth24plus-stencil8":
			return {
				internalFormat: gl.DEPTH24_STENCIL8,
				glFormat: gl.DEPTH_STENCIL,
				glType: gl.UNSIGNED_INT_24_8,
				isDepth: true,
			};
		case "depth32float":
			return {
				internalFormat: gl.DEPTH_COMPONENT32F,
				glFormat: gl.DEPTH_COMPONENT,
				glType: gl.FLOAT,
				isDepth: true,
			};
	}
}

export function filter(gl: GL, filterMode: FilterMode): int {
	return filterMode === "linear" ? gl.LINEAR : gl.NEAREST;
}

export function wrap(gl: GL, wrapMode: WrapMode): int {
	switch (wrapMode) {
		case "repeat":
			return gl.REPEAT;
		case "mirror-repeat":
			return gl.MIRRORED_REPEAT;
		case "clamp-to-edge":
		default:
			return gl.CLAMP_TO_EDGE;
	}
}

export function compare(gl: WebGL2RenderingContext, compareFunc: CompareFunc) {
	switch (compareFunc) {
		case "never":
			return gl.NEVER;
		case "less":
			return gl.LESS;
		case "equal":
			return gl.EQUAL;
		case "less-equal":
			return gl.LEQUAL;
		case "greater":
			return gl.GREATER;
		case "not-equal":
			return gl.NOTEQUAL;
		case "greater-equal":
			return gl.GEQUAL;
		case "always":
		default:
			return gl.ALWAYS;
	}
}

export function primitive(gl: GL, primitiveType: PrimitiveType): int {
	switch (primitiveType) {
		case "triangle-list":
			return gl.TRIANGLES;
		case "triangle-strip":
			return gl.TRIANGLE_STRIP;
		case "line-list":
			return gl.LINES;
		case "line-strip":
			return gl.LINE_STRIP;
		case "point-list":
			return gl.POINTS;
	}
}

export function blendFactor(
	gl: WebGL2RenderingContext,
	blendFactor: BlendFactor,
) {
	switch (blendFactor) {
		case "zero":
			return gl.ZERO;
		case "one":
			return gl.ONE;
		case "src":
			return gl.SRC_COLOR;
		case "one-minus-src":
			return gl.ONE_MINUS_SRC_COLOR;
		case "src-alpha":
			return gl.SRC_ALPHA;
		case "one-minus-src-alpha":
			return gl.ONE_MINUS_SRC_ALPHA;
		case "dst":
			return gl.DST_COLOR;
		case "one-minus-dst":
			return gl.ONE_MINUS_DST_COLOR;
		case "dst-alpha":
			return gl.DST_ALPHA;
		case "one-minus-dst-alpha":
			return gl.ONE_MINUS_DST_ALPHA;
	}
}

export function blendOp(gl: WebGL2RenderingContext, blendOp: BlendOp) {
	switch (blendOp) {
		case "add":
			return gl.FUNC_ADD;
		case "subtract":
			return gl.FUNC_SUBTRACT;
		case "reverse-subtract":
			return gl.FUNC_REVERSE_SUBTRACT;
		case "min":
			return gl.MIN;
		case "max":
			return gl.MAX;
	}
}

export function resolveBlend(
	gl: WebGL2RenderingContext,
	blendState?: BlendState,
): ResolvedBlend {
	return {
		enabled: blendState?.enabled ?? false,
		srcRGB: blendFactor(gl, blendState?.srcFactorRGB ?? "one"),
		dstRGB: blendFactor(gl, blendState?.dstFactorRGB ?? "zero"),
		opRGB: blendOp(gl, blendState?.opRGB ?? "add"),
		srcA: blendFactor(
			gl,
			blendState?.srcFactorAlpha ?? blendState?.srcFactorRGB ?? "one",
		),
		dstA: blendFactor(
			gl,
			blendState?.dstFactorAlpha ?? blendState?.dstFactorRGB ?? "zero",
		),
		opA: blendOp(gl, blendState?.opAlpha ?? blendState?.opRGB ?? "add"),
	};
}

export function resolveDepth(
	gl: WebGL2RenderingContext,
	depthState?: DepthState,
): ResolvedDepth {
	return {
		compare: compare(gl, depthState?.compare ?? "always"),
		writeEnabled: depthState?.writeEnabled ?? false,
	};
}
