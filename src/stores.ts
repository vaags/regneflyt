import { writable } from 'svelte/store'

export const highscore = writable<number>(0)
