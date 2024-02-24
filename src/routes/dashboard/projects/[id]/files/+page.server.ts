import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';

import { bucket } from '$env/static/private';
import { formHandler } from '$lib/bodyguard.js';
import { ProjectUserPermission } from '$lib/enums.js';
import { prisma } from '$lib/prismaConnection';
import { S3 } from '$lib/s3.js';
import { uploadFile } from '$lib/uploadFile.js';
import { verifySession } from '$lib/verifySession.js';

export const load = async ({ parent }) => {
	const parentData = await parent();

	const files = await prisma.file.findMany({
		where: {
			projectId: parentData.project.id
		}
	});

	return {
		files
	};
};

export const actions = {
	uploadFile: async ({ request, cookies, params }) => {
		const user = await verifySession(cookies);

		const projectUser = await prisma.projectUser.findFirst({
			where: {
				AND: {
					userId: user.id,
					projectId: parseInt(params.id)
				}
			}
		});

		console.log(projectUser);

		if (projectUser?.permission != ProjectUserPermission.EDITOR) {
			return {
				success: false,
				message: 'No Permissions'
			};
		}

		return await uploadFile(request, projectUser.projectId);
	},
	deleteFile: formHandler(
		z.object({
			fileId: z.coerce.number()
		}),
		async ({ fileId }, { cookies, params }) => {
			const user = await verifySession(cookies);
			const projectUser = await prisma.projectUser.findFirst({
				where: {
					AND: {
						projectId: parseInt(params.id),
						userId: user.id
					}
				}
			});

			if (projectUser?.permission != ProjectUserPermission.EDITOR) {
				return {
					success: false,
					message: 'No Permissions'
				};
			}

			const fileCheck = await prisma.file.findFirst({
				where: {
					AND: {
						id: fileId,
						projectId: projectUser.projectId
					}
				}
			});

			if (!fileCheck) {
				return {
					success: false,
					message: 'No file exists'
				};
			}

			console.log('starting delete');

			await prisma.file.delete({
				where: {
					id: fileId
				}
			});

			//If we don't have a key, we can assume the file is not in s3
			if (!fileCheck.key) {
				return {
					success: true,
					message: 'File Deleted!'
				};
			}

			//However, if we DO have a key, the file is in s3 and we need to get rid of it.
			await S3.send(
				new DeleteObjectCommand({
					Bucket: bucket,
					Key: fileCheck.key
				})
			);

			return {
				success: true,
				message: 'File Deleted!'
			};
		}
	),
	renameFile: formHandler(
		z.object({
			fileId: z.coerce.number(),
			fileName: z.string()
		}),
		async ({ fileId, fileName }, { cookies, params }) => {
			const user = await verifySession(cookies);

			const projectUser = await prisma.projectUser.findFirst({
				where: {
					AND: {
						projectId: parseInt(params.id),
						userId: user.id
					}
				}
			});

			if (projectUser?.permission != ProjectUserPermission.EDITOR) {
				return {
					success: false,
					message: 'No Permissions'
				};
			}

			const fileCheck = await prisma.file.findFirst({
				where: {
					AND: {
						id: fileId,
						projectId: projectUser.projectId
					}
				}
			});

			if (!fileCheck) {
				return {
					success: false,
					message: 'No file exists'
				};
			}

			await prisma.file.update({
				where: {
					id: fileCheck.id
				},
				data: {
					name: fileName
				}
			});

			return {
				success: true,
				message: 'File Updated'
			};
		}
	)
};