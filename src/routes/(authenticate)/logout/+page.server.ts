import { prisma } from '$lib/prismaConnection.js';
import { redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ cookies }) => {
		// Get the session cookie
		const session = cookies.get('session');
		if (!session) {
			return;
		}

		const hasSession = await prisma.session.findFirst({
			where: {
				sessionText: session
			}
		});

		if (hasSession) {
			/* @migration task: add path argument */ cookies.delete('session');
		}

		redirect(303, '/login');
	}
};
