import { redirect } from '@sveltejs/kit';
import crypto from 'crypto';

import { checkPassword } from '$lib/server/password';
import { prisma } from '$lib/server/prisma/prismaConnection.js';

export const actions = {
	login: async ({ request, cookies, getClientAddress }) => {
		// Get all for the form data
		const formData = await request.formData();

		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();

		if (!email || !password) {
			return {
				success: false,
				message: 'Please fill all required fields.'
			};
		}

		const user = await prisma.user.findFirst({
			where: {
				email: {
					equals: email,
					mode: 'insensitive'
				}
			}
		});

		if (!user) {
			return {
				success: false,
				message: 'Email or password is incorrect.'
			};
		}

		if (!(await checkPassword(user.hash, user.salt, password))) {
			return {
				success: false,
				message: 'Email or password is incorrect.'
			};
		}

		// Generate a new session for the user

		const sessionToken = crypto.randomBytes(32).toString('hex');
		await prisma.session.create({
			data: {
				sessionText: sessionToken,
				userId: user.id,
				ip: getClientAddress(),
				userAgent: request.headers.get('user-agent') || 'Unknown'
			}
		});

		cookies.set('session', sessionToken, {
			secure: process.env.NODE_ENV != 'development' && !process.env.CI,
			sameSite: 'strict',
			expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			path: '/'
		});

		redirect(303, '/dashboard');
	}
};
