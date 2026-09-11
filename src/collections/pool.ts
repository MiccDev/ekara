import { checkNotNull } from "../errors";
import type { int, Nullable } from "@/types";

/**
 * A collection of items that
 */
export class Pool<T> implements Iterable<Nullable<T>> {
	private _items: Nullable<T>[] = [];
	private _free: int[] = [];

	/**
	 * Adds an item to the pool and retuns the handle of said item, used to get or remove
	 * this item from the pool. Esentially acts as an index into the items array.
	 * @param item The item you want to add to the pool.
	 * @returns The handle (index) returned from the pool.
	 */
	add(item: T): int {
		const id = this._free.pop() ?? this._items.length;
		this._items[id] = item;
		return id;
	}

	/**
	 * Gets an item from the pool based on the handle.
	 * If the item does not exist at that index in the pool, throws an error.
	 * @param id the handle
	 * @returns the item
	 */
	get(id: int): T {
		return checkNotNull(
			this._items[id],
			`Invalid or destroyed handle (id=${id})`,
		);
	}

	/**
	 * Removes the item using the handle.
	 * @param id the handle
	 */
	remove(id: int): void {
		this._items[id] = null;
		this._free.push(id);
	}

	has(id: int): boolean {
		return this._items[id] != null;
	}

	*[Symbol.iterator](): Iterator<Nullable<T>> {
		for (const item of this._items) {
			yield item;
		}
	}
}
