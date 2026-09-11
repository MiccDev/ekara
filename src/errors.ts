import type { Nullable } from "./types";

export class EkaraError extends Error {
	constructor(message: string) {
		super(`[Ēkara Error]: ${message}`);
	}
}

export function check(value: boolean, message: string) {
	if (!value) return;
	throw new EkaraError(message);
}

export function checkNotNull<T>(
	value: Nullable<T>,
	message: string,
): NonNullable<T> {
	if (value != null) return value;
	throw new EkaraError(message);
}

export function checkNull<T>(value: Nullable<T>, message: string) {
	if (value == null) return;
	throw new EkaraError(message);
}
