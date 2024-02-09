import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		preprocess({
			scss: {
				prependData: `@import './src/style/app.scss';`
			}
		}),
		vitePreprocess()
	],

	kit: {
		adapter: adapter(),
		csrf: {
			checkOrigin: process.env.NODE_ENV != 'development'
		}
	}
};

export default config;
