import type { int } from "./primitives";
import type { BufferType, PixelFormat } from "./types";

type EkaraResource = {
    readonly id: int;
}

export type EkaraBuffer = EkaraResource & {
    readonly type: BufferType;
    readonly size: int;
};

export type EkaraImage = EkaraResource & {
    readonly width: int;
    readonly height: int;
    readonly format: PixelFormat;
    readonly renderTarget: boolean;
}

export type EkaraSampler = EkaraResource;
export type EkaraShader = EkaraResource;
export type EkaraPipeline = EkaraResource;
export type EkaraBindings = EkaraResource;